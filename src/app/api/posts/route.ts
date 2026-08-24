import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/lib/prisma/client";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { apiHandler } from "@/lib/api-error";
import { getRequestViewer } from "@/lib/request-viewer";
import {
  canMutatePosts,
  collectionAccessWhere,
  isVisibility,
  type PostVisibility,
} from "@/lib/post-policy";
import { postInclude } from "@/lib/posts";
import { rankHomepagePosts } from "@/lib/post-ranking";

export const dynamic = "force-dynamic";

function integerParam(value: string | null, fallback: number, maximum: number) {
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.min(parsed, maximum)
    : null;
}

function normalizeTags(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) return null;
  const tags = value.map(tag =>
    typeof tag === "string" ? tag.trim().toLowerCase() : ""
  );
  if (tags.some(tag => !tag || tag.length > 40)) return null;
  return [...new Set(tags)];
}

function validatePostInput(body: Record<string, unknown>) {
  const removeNullBytes = (value: string) =>
    value.split(String.fromCharCode(0)).join("");
  const title =
    typeof body.title === "string" ? removeNullBytes(body.title).trim() : "";
  const slug =
    typeof body.slug === "string" ? removeNullBytes(body.slug).trim() : "";
  const bodyMarkdown =
    typeof body.bodyMarkdown === "string"
      ? removeNullBytes(body.bodyMarkdown)
      : "";
  const visibility = body.visibility === undefined ? "PUBLIC" : body.visibility;
  const tags = normalizeTags(body.tags);

  if (typeof body.title === "string" && body.title.length > 0 && !title)
    return { error: "Title cannot be only whitespace" } as const;
  if (!title || !slug || !bodyMarkdown)
    return { error: "Title, slug, and bodyMarkdown are required" } as const;
  if (title.length > 200)
    return { error: "Title must be between 1 and 200 characters" } as const;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length >= 100) {
    return {
      error:
        "Slug must contain only lowercase letters, numbers, and hyphens and be less than 100 characters",
    } as const;
  }
  if (!isVisibility(visibility))
    return { error: "Invalid visibility" } as const;
  if (tags === null)
    return {
      error:
        "Tags must be an array containing at most 10 unique values of 40 characters",
    } as const;
  if (
    body.seoDescription !== undefined &&
    typeof body.seoDescription !== "string"
  ) {
    return { error: "seoDescription must be a string" } as const;
  }
  if (
    typeof body.seoDescription === "string" &&
    body.seoDescription.length > 320
  ) {
    return { error: "seoDescription must be 320 characters or fewer" } as const;
  }
  if (
    body.coverImage !== undefined &&
    body.coverImage !== null &&
    typeof body.coverImage !== "string"
  ) {
    return { error: "coverImage must be a URL string" } as const;
  }
  if (
    body.coverImageAlt !== undefined &&
    typeof body.coverImageAlt !== "string"
  ) {
    return { error: "coverImageAlt must be a string" } as const;
  }
  if (body.isPinned !== undefined && typeof body.isPinned !== "boolean") {
    return { error: "isPinned must be a boolean" } as const;
  }
  if (body.isFeatured !== undefined && typeof body.isFeatured !== "boolean") {
    return { error: "isFeatured must be a boolean" } as const;
  }

  let scheduledAt: Date | null = null;
  if (
    body.scheduledAt !== undefined &&
    body.scheduledAt !== null &&
    body.scheduledAt !== ""
  ) {
    if (typeof body.scheduledAt !== "string")
      return { error: "scheduledAt must be an ISO date" } as const;
    scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return { error: "scheduledAt must be a valid future date" } as const;
    }
  }

  return {
    value: {
      title,
      slug,
      bodyMarkdown,
      visibility: visibility as PostVisibility,
      seoDescription:
        typeof body.seoDescription === "string"
          ? body.seoDescription.trim()
          : null,
      tags,
      coverImage:
        typeof body.coverImage === "string"
          ? body.coverImage.trim() || null
          : null,
      coverImageAlt:
        typeof body.coverImageAlt === "string"
          ? body.coverImageAlt.trim() || null
          : null,
      scheduledAt,
      isPinned: body.isPinned === true,
      isFeatured: body.isFeatured === true,
    },
  } as const;
}

export const GET = apiHandler(async function GET(req: NextRequest) {
  const limit = integerParam(
    req.nextUrl?.searchParams.get("limit") ??
      new URL(req.url).searchParams.get("limit"),
    10,
    50
  );
  const offset = integerParam(
    req.nextUrl?.searchParams.get("offset") ??
      new URL(req.url).searchParams.get("offset"),
    0,
    100_000
  );
  if (limit === null || offset === null) {
    return NextResponse.json(
      { error: "limit and offset must be positive integers" },
      { status: 400 }
    );
  }

  const searchParams = new URL(req.url).searchParams;
  const viewer = await getRequestViewer(req.headers, "posts:read");
  const requestedAuthor = searchParams.get("authorId");
  const authorId = requestedAuthor === "me" ? viewer?.id : requestedAuthor;
  const requestedVisibility = searchParams.get("visibility");
  const tag = searchParams.get("tag")?.trim().toLowerCase();
  const search = searchParams.get("search")?.trim();
  const order = searchParams.get("order");
  if (order && order !== "home" && order !== "all") {
    return NextResponse.json(
      { error: "order must be either home or all" },
      { status: 400 }
    );
  }

  const access = collectionAccessWhere(viewer) as Prisma.PostWhereInput;
  const filters: Prisma.PostWhereInput[] = [access];
  if (authorId) filters.push({ authorId });
  if (requestedVisibility && isVisibility(requestedVisibility)) {
    filters.push({ visibility: requestedVisibility });
  }
  if (tag) filters.push({ metadata: { tags: { has: tag } } });
  if (search) {
    filters.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { bodyMarkdown: { contains: search, mode: "insensitive" } },
        { author: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  const where: Prisma.PostWhereInput = { AND: filters };

  const [foundPosts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy:
        order === "all"
          ? [
              { isPinned: "desc" },
              { publishedAt: "desc" },
              { createdAt: "desc" },
            ]
          : [{ publishedAt: "desc" }, { createdAt: "desc" }],
      ...(order === "home" ? {} : { skip: offset, take: limit }),
    }),
    prisma.post.count({ where }),
  ]);
  const posts =
    order === "home"
      ? rankHomepagePosts(foundPosts).slice(offset, offset + limit)
      : foundPosts;

  return NextResponse.json(
    { posts, total, limit, offset, hasMore: offset + posts.length < total },
    {
      headers: {
        "Cache-Control": viewer
          ? "private, no-store"
          : "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
});

export const POST = apiHandler(async function POST(req: NextRequest) {
  const viewer = await getRequestViewer(req.headers, "posts:write");
  if (!viewer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canMutatePosts(viewer))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = validatePostInput(body);
  if ("error" in parsed)
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  let finalSlug = input.slug;
  for (
    let counter = 1;
    await prisma.post.findUnique({
      where: { slug: finalSlug },
      select: { id: true },
    });
    counter++
  ) {
    finalSlug = `${input.slug}-${counter}`;
  }

  const { html } = await renderMarkdown(input.bodyMarkdown);
  const isScheduled = !!input.scheduledAt;
  const visibility = isScheduled ? "PRIVATE" : input.visibility;
  const post = await prisma.post.create({
    data: {
      title: input.title,
      slug: finalSlug,
      bodyMarkdown: input.bodyMarkdown,
      bodyHtml: html,
      visibility,
      authorId: viewer.id,
      publishedAt: visibility === "PUBLIC" ? new Date() : null,
      scheduledAt: input.scheduledAt,
      isPinned: input.isPinned,
      isFeatured: input.isFeatured,
      metadata: {
        create: {
          seoDescription: input.seoDescription,
          tags: input.tags,
          coverImage: input.coverImage,
          coverImageAlt: input.coverImageAlt,
        },
      },
    },
    include: postInclude,
  });
  return NextResponse.json(post, { status: 201 });
});
