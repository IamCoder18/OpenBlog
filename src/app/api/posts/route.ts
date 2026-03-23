import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { headers } from "next/headers";
import { apiHandler } from "@/lib/api-error";

function containsSqlInjection(input: string): boolean {
  const sqlPatterns =
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b/i;
  return sqlPatterns.test(input);
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

  const whereClause: Record<string, unknown> = {};

  if (!isAuthenticated) {
    whereClause.visibility = "PUBLIC";
  } else if (
    visibility &&
    ["PUBLIC", "PRIVATE", "DRAFT", "UNLISTED"].includes(visibility)
  ) {
    whereClause.visibility = visibility;
  }

  if (search && typeof search === "string" && search.trim().length > 0) {
    const searchStr = search.trim();
    whereClause.OR = [
      { title: { contains: searchStr, mode: "insensitive" } },
      { slug: { contains: searchStr, mode: "insensitive" } },
      { metadata: { tags: { has: searchStr } } },
    ];
  }

  if (tag && typeof tag === "string" && tag.trim().length > 0) {
    whereClause.metadata = {
      tags: { has: tag.trim() },
    };
  }

  // Filter by author
  if (authorIdParam === "me") {
    if (apiKeyUser?.id) {
      whereClause.authorId = apiKeyUser.id;
    } else if (isAuthenticated) {
      try {
        const { auth: authInstance } = await import("@/auth");
        const session = await authInstance.api.getSession({
          headers: headersList,
        });
        if (session?.user) {
          whereClause.authorId = session.user.id;
        }
      } catch {
        // ignore
      }
    }
  } else if (authorIdParam && authorIdParam !== "me") {
    whereClause.authorId = authorIdParam;
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
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
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: offset,
    take: limit,
  });

  const total = await prisma.post.count({
    where: whereClause,
  });

  return NextResponse.json(
    {
      posts,
      total,
      limit,
      offset,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
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

  if (containsSqlInjection(sanitizedTitle)) {
    return NextResponse.json(
      { error: "Title contains invalid characters or SQL keywords" },
      { status: 400 }
    );
  }

  if (containsSqlInjection(sanitizedSlug)) {
    return NextResponse.json(
      { error: "Slug contains invalid characters or SQL keywords" },
      { status: 400 }
    );
  }

  if (containsSqlInjection(sanitizedBodyMarkdown)) {
    return NextResponse.json(
      { error: "Body contains invalid characters or SQL keywords" },
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
