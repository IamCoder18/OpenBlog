import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { headers } from "next/headers";
import { apiHandler } from "@/lib/api-error";

interface FuzzySearchResult {
  id: string;
  search_rank: number;
}

async function validateApiKey(
  headersVal: Headers
): Promise<{ id: string; name: string | null; image: string | null } | null> {
  const authHeader = headersVal.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const key = authHeader.slice(7);

  if (!key) {
    return null;
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!apiKey) {
    return null;
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  return apiKey.user;
}

export const dynamic = "force-dynamic";

export const GET = apiHandler(async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const search = searchParams.get("search");
  const visibility = searchParams.get("visibility");
  const tag = searchParams.get("tag");
  const authorIdParam = searchParams.get("authorId");

  const limit = limitParam ? parseInt(limitParam) : 10;
  const offset = offsetParam ? parseInt(offsetParam) : 0;

  if (isNaN(limit) || isNaN(offset) || limit < 0 || offset < 0) {
    return NextResponse.json(
      {
        posts: [],
        total: 0,
        limit: Math.max(0, isNaN(limit) ? 10 : limit),
        offset: Math.max(0, isNaN(offset) ? 0 : offset),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  const headersList = await headers();
  const apiKeyUser = await validateApiKey(headersList);

  // Check session auth for visibility filtering
  let isAuthenticated = !!apiKeyUser?.id;
  if (!isAuthenticated) {
    try {
      const { auth: authInstance } = await import("@/auth");
      const session = await authInstance.api.getSession({
        headers: headersList,
      });
      isAuthenticated = !!session?.user;
    } catch {
      // Not authenticated
    }
  }

  // Resolve effective filters that apply to both search and non-search paths

  // Author ID resolution (handles "me")
  let effectiveAuthorId: string | null = null;
  if (authorIdParam === "me") {
    if (apiKeyUser?.id) {
      effectiveAuthorId = apiKeyUser.id;
    } else if (isAuthenticated) {
      try {
        const { auth: authInstance } = await import("@/auth");
        const session = await authInstance.api.getSession({
          headers: headersList,
        });
        if (session?.user) effectiveAuthorId = session.user.id;
      } catch {}
    }
  } else if (authorIdParam && authorIdParam !== "me") {
    effectiveAuthorId = authorIdParam;
  }

  // Visibility filter for authenticated users (if provided)
  const explicitVisibility: string | null =
    isAuthenticated &&
    visibility &&
    ["PUBLIC", "PRIVATE", "DRAFT", "UNLISTED"].includes(visibility)
      ? visibility
      : null;

  // Tag filter
  const explicitTag =
    tag && typeof tag === "string" && tag.trim().length > 0 ? tag.trim() : null;

  // Helper functions to build search WHERE clause and parameters
  function buildVisibilityParams(isAuthenticated: boolean): string[] {
    return isAuthenticated
      ? ["PUBLIC", "PRIVATE", "UNLISTED", "DRAFT"]
      : ["PUBLIC"];
  }

  function buildFilterConditions(
    params: (string | number)[],
    validatedVisibility: string | null,
    validatedTag: string | null,
    validatedAuthorId: string | null
  ): string[] {
    const filterClauses: string[] = [];

    // Add explicit visibility filter if provided
    if (validatedVisibility) {
      filterClauses.push(`p.visibility = $${params.length + 1}`);
      params.push(validatedVisibility);
    }

    // Add tag filter if provided (use ARRAY syntax with parameter)
    if (validatedTag) {
      filterClauses.push(`pm.tags @> ARRAY[$${params.length + 1}]::text[]`);
      params.push(validatedTag);
    }

    // Add author filter if provided
    if (validatedAuthorId) {
      filterClauses.push(`p."authorId" = $${params.length + 1}`);
      params.push(validatedAuthorId);
    }

    return filterClauses;
  }

  function constructWhereClause(
    visibilityCondition: string,
    extraFilter: string,
    searchIdx: number,
    thresholdIdx: number
  ): string {
    return `${visibilityCondition}${extraFilter} AND (
      similarity(LOWER(p.title), LOWER($${searchIdx})) > $${thresholdIdx}
      OR similarity(LOWER(p.slug), LOWER($${searchIdx})) > $${thresholdIdx}
      OR EXISTS (
        SELECT 1 FROM unnest(COALESCE(pm.tags, '{}')) as tag
        WHERE similarity(LOWER(tag), LOWER($${searchIdx})) > $${thresholdIdx}
      )
    )`;
  }

  function buildSearchWhereAndParams(
    searchStr: string,
    isAuthenticated: boolean,
    validatedVisibility: string | null,
    validatedTag: string | null,
    validatedAuthorId: string | null,
    similarityThreshold: number
  ): {
    whereCondition: string;
    params: (string | number)[];
    searchIdx: number;
    thresholdIdx: number;
  } {
    // Build base visibility params (always parameterized)
    const visibilityValues = buildVisibilityParams(isAuthenticated);

    // Build filter conditions with parameterized queries - NO string interpolation
    const params: (string | number)[] = [...visibilityValues];
    const filterClauses = buildFilterConditions(
      params,
      validatedVisibility,
      validatedTag,
      validatedAuthorId
    );

    const extraFilter =
      filterClauses.length > 0 ? ` AND ${filterClauses.join(" AND ")}` : "";

    // Build dynamic visibility condition based on authentication
    const visibilityCondition = isAuthenticated
      ? `p.visibility IN ($1, $2, $3, $4)`
      : `p.visibility = $1`;

    const searchIdx = params.length + 1;
    params.push(searchStr);
    const thresholdIdx = params.length + 1;
    params.push(similarityThreshold);

    const whereCondition = constructWhereClause(
      visibilityCondition,
      extraFilter,
      searchIdx,
      thresholdIdx
    );

    return { whereCondition, params, searchIdx, thresholdIdx };
  }

  // SEARCH PATH: fuzzy search using pg_trgm similarity
  if (search && typeof search === "string" && search.trim().length > 0) {
    const searchStr = search.trim();
    const similarityThreshold = 0.3;

    // Validate and sanitize filter values for security
    const validatedVisibility =
      explicitVisibility === null ||
      ["PUBLIC", "PRIVATE", "DRAFT", "UNLISTED"].includes(explicitVisibility)
        ? explicitVisibility
        : null;
    const validatedTag =
      explicitTag && explicitTag.length > 0 && explicitTag.length <= 100
        ? explicitTag
        : null;
    const validatedAuthorId =
      effectiveAuthorId && /^[a-zA-Z0-9-]+$/.test(effectiveAuthorId)
        ? effectiveAuthorId
        : null;

    const {
      whereCondition,
      params: baseParams,
      searchIdx,
    } = buildSearchWhereAndParams(
      searchStr,
      isAuthenticated,
      validatedVisibility,
      validatedTag,
      validatedAuthorId,
      similarityThreshold
    );

    // Use $queryRawUnsafe with fully parameterized queries
    const postsQuery = `
      SELECT
        p.id,
        GREATEST(
          similarity(LOWER(p.title), LOWER($${searchIdx})),
          similarity(LOWER(p.slug), LOWER($${searchIdx}))
        ) as search_rank
      FROM "Post" p
      LEFT JOIN "PostMetadata" pm ON p.id = pm."postId"
      WHERE ${whereCondition}
      GROUP BY p.id
      ORDER BY search_rank DESC, p."publishedAt" DESC NULLS LAST, p."createdAt" DESC
      LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}
    `;

    const totalQuery = `
      SELECT COUNT(DISTINCT p.id)::integer as total
      FROM "Post" p
      LEFT JOIN "PostMetadata" pm ON p.id = pm."postId"
      WHERE ${whereCondition}
    `;

    // Build parameter arrays - all values properly parameterized
    const postsParams = [...baseParams, limit, offset];
    const totalParams = baseParams;

    const rawPosts = await prisma.$queryRawUnsafe<FuzzySearchResult[]>(
      postsQuery,
      ...postsParams
    );

    const totalResult = await prisma.$queryRawUnsafe<{ total: number }[]>(
      totalQuery,
      ...totalParams
    );
    const total = totalResult[0]?.total ?? 0;

    const matchingIds = rawPosts.map((p: FuzzySearchResult) => p.id);
    const postsWithIncludes =
      matchingIds.length > 0
        ? await prisma.post.findMany({
            where: { id: { in: matchingIds } },
            include: {
              author: { select: { id: true, name: true, image: true } },
              metadata: true,
            },
          })
        : [];

    const rankMap = new Map(
      rawPosts.map((p: FuzzySearchResult, idx: number) => [p.id, idx])
    );
    postsWithIncludes.sort(
      (a, b) => (rankMap.get(a.id) ?? 0) - (rankMap.get(b.id) ?? 0)
    );

    return NextResponse.json(
      { posts: postsWithIncludes, total, limit, offset },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  // NON-SEARCH PATH: standard Prisma query with exact filters
  const whereClause: Record<string, unknown> = {};

  if (!isAuthenticated) {
    whereClause.visibility = "PUBLIC";
  } else if (explicitVisibility) {
    whereClause.visibility = explicitVisibility;
  }

  if (explicitTag) {
    whereClause.metadata = { tags: { has: explicitTag } };
  }

  if (effectiveAuthorId) {
    whereClause.authorId = effectiveAuthorId;
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: {
      author: { select: { id: true, name: true, image: true } },
      metadata: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: offset,
    take: limit,
  });

  const total = await prisma.post.count({ where: whereClause });

  return NextResponse.json(
    { posts, total, limit, offset },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
});

export const POST = apiHandler(async function POST(req: NextRequest) {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  const hasApiKeyHeader = authHeader && authHeader.startsWith("Bearer ");

  let userId: string | null = null;
  let _userName: string | null = null;
  let _userImage: string | null = null;

  if (hasApiKeyHeader) {
    const apiKeyUser = await validateApiKey(headersList);

    if (!apiKeyUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = apiKeyUser.id;
    _userName = apiKeyUser.name;
    _userImage = apiKeyUser.image;
  } else {
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id as string;
    _userName = session.user.name ?? null;
    _userImage = session.user.image ?? null;
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    title,
    slug,
    bodyMarkdown,
    visibility = "PUBLIC",
    seoDescription,
    tags,
    coverImage,
  } = body;

  // Handle null bytes - only process string values
  const sanitizedTitle =
    typeof title === "string" ? title.replace(/\x00/g, "") : title; // eslint-disable-line no-control-regex
  const sanitizedSlug =
    typeof slug === "string" ? slug.replace(/\x00/g, "") : slug; // eslint-disable-line no-control-regex
  const sanitizedBodyMarkdown =
    typeof bodyMarkdown === "string"
      ? bodyMarkdown.replace(/\x00/g, "") // eslint-disable-line no-control-regex
      : bodyMarkdown;

  if (!sanitizedTitle || !sanitizedSlug || !sanitizedBodyMarkdown) {
    return NextResponse.json(
      { error: "Title, slug, and bodyMarkdown are required" },
      { status: 400 }
    );
  }

  if (typeof sanitizedTitle !== "string") {
    return NextResponse.json(
      { error: "Title must be a string" },
      { status: 400 }
    );
  }

  if (sanitizedTitle.trim().length === 0) {
    return NextResponse.json(
      { error: "Title cannot be only whitespace" },
      { status: 400 }
    );
  }

  if (sanitizedTitle.length < 1) {
    return NextResponse.json(
      { error: "Title must be at least 1 character" },
      { status: 400 }
    );
  }

  if (seoDescription !== undefined && typeof seoDescription !== "string") {
    return NextResponse.json(
      { error: "seoDescription must be a string" },
      { status: 400 }
    );
  }

  if (seoDescription && seoDescription.length > 500) {
    return NextResponse.json(
      { error: "seoDescription must be less than 500 characters" },
      { status: 400 }
    );
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: "tags must be an array" },
        { status: 400 }
      );
    }

    if (tags.length > 20) {
      return NextResponse.json(
        { error: "tags must have less than 20 items" },
        { status: 400 }
      );
    }

    for (const tag of tags) {
      if (typeof tag !== "string" || tag.length > 50) {
        return NextResponse.json(
          { error: "each tag must be a string with less than 50 characters" },
          { status: 400 }
        );
      }
    }
  }

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(sanitizedSlug)) {
    return NextResponse.json(
      {
        error: "Slug must contain only lowercase letters, numbers, and hyphens",
      },
      { status: 400 }
    );
  }

  if (sanitizedSlug.length >= 100) {
    return NextResponse.json(
      { error: "Slug must be less than 100 characters" },
      { status: 400 }
    );
  }

  let finalSlug = sanitizedSlug;
  const existingPost = await prisma.post.findUnique({
    where: { slug: sanitizedSlug },
  });

  if (existingPost) {
    let counter = 1;
    while (true) {
      const candidate = `${sanitizedSlug}-${counter}`;
      const exists = await prisma.post.findUnique({
        where: { slug: candidate },
      });
      if (!exists) {
        finalSlug = candidate;
        break;
      }
      counter++;
    }
  }

  const { html } = await renderMarkdown(sanitizedBodyMarkdown);

  const post = await prisma.post.create({
    data: {
      title: sanitizedTitle,
      slug: finalSlug,
      bodyMarkdown: sanitizedBodyMarkdown,
      bodyHtml: html,
      visibility,
      authorId: userId as string,
      publishedAt: visibility === "PUBLIC" ? new Date() : null,
      ...((seoDescription !== undefined ||
        tags !== undefined ||
        coverImage !== undefined) && {
        metadata: {
          create: {
            seoDescription: seoDescription || null,
            tags: tags || [],
            coverImage: coverImage || null,
          },
        },
      }),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      metadata: true,
    },
  });

  const responseData = {
    ...post,
    visibility: post.visibility,
    publishedAt: post.publishedAt,
  };

  return NextResponse.json(responseData, { status: 201 });
});
