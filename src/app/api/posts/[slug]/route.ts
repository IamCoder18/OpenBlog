import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { apiHandler } from "@/lib/api-error";
import { getRequestViewer } from "@/lib/request-viewer";
import { canManagePost, canReadPost, isVisibility } from "@/lib/post-policy";
import { postInclude } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

function normalizedTags(value: unknown) {
  if (!Array.isArray(value) || value.length > 10) return null;
  const tags = value.map(tag =>
    typeof tag === "string" ? tag.trim().toLowerCase() : ""
  );
  if (tags.some(tag => !tag || tag.length > 40)) return null;
  return [...new Set(tags)];
}

export const GET = apiHandler(async function GET(
  req: NextRequest,
  { params }: Context
) {
  const { slug } = await params;
  const viewer = await getRequestViewer(req.headers, "posts:read");
  const post = await prisma.post.findUnique({
    where: { slug },
    include: postInclude,
  });
  if (!post || !canReadPost(viewer, post)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  return NextResponse.json(post, {
    headers: {
      "Cache-Control":
        post.visibility === "PUBLIC"
          ? "public, s-maxage=60"
          : "private, no-store",
    },
  });
});

export const PUT = apiHandler(async function PUT(
  req: NextRequest,
  { params }: Context
) {
  const viewer = await getRequestViewer(req.headers, "posts:write");
  if (!viewer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const existing = await prisma.post.findUnique({ where: { slug } });
  if (!existing)
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!canManagePost(viewer, existing.authorId)) {
    return NextResponse.json(
      { error: "You can only edit your own posts" },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title;
  const newSlug = body.slug;
  const bodyMarkdown = body.bodyMarkdown;
  const visibility = body.visibility;
  if (
    title !== undefined &&
    (typeof title !== "string" || !title.trim() || title.trim().length > 200)
  ) {
    return NextResponse.json(
      { error: "Title must be between 1 and 200 characters" },
      { status: 400 }
    );
  }
  if (
    newSlug !== undefined &&
    (typeof newSlug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSlug) ||
      newSlug.length >= 100)
  ) {
    return NextResponse.json(
      {
        error:
          "Slug must contain only lowercase letters, numbers, and hyphens and be less than 100 characters",
      },
      { status: 400 }
    );
  }
  if (
    bodyMarkdown !== undefined &&
    (typeof bodyMarkdown !== "string" || !bodyMarkdown)
  ) {
    return NextResponse.json(
      { error: "bodyMarkdown must be a non-empty string" },
      { status: 400 }
    );
  }
  if (visibility !== undefined && !isVisibility(visibility)) {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }
  if (body.isPinned !== undefined && typeof body.isPinned !== "boolean") {
    return NextResponse.json(
      { error: "isPinned must be a boolean" },
      { status: 400 }
    );
  }
  if (body.isFeatured !== undefined && typeof body.isFeatured !== "boolean") {
    return NextResponse.json(
      { error: "isFeatured must be a boolean" },
      { status: 400 }
    );
  }
  if (
    body.seoDescription !== undefined &&
    typeof body.seoDescription !== "string"
  ) {
    return NextResponse.json(
      { error: "seoDescription must be a string" },
      { status: 400 }
    );
  }
  if (
    typeof body.seoDescription === "string" &&
    body.seoDescription.length > 320
  ) {
    return NextResponse.json(
      { error: "seoDescription must be 320 characters or fewer" },
      { status: 400 }
    );
  }
  const tags = body.tags === undefined ? undefined : normalizedTags(body.tags);
  if (body.tags !== undefined && tags === null) {
    return NextResponse.json(
      {
        error:
          "Tags must be an array containing at most 10 unique values of 40 characters",
      },
      { status: 400 }
    );
  }

  let scheduledAt: Date | null | undefined;
  if (body.scheduledAt === null || body.scheduledAt === "") scheduledAt = null;
  else if (body.scheduledAt !== undefined) {
    scheduledAt =
      typeof body.scheduledAt === "string"
        ? new Date(body.scheduledAt)
        : new Date(Number.NaN);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return NextResponse.json(
        { error: "scheduledAt must be a valid future date" },
        { status: 400 }
      );
    }
  }

  if (typeof newSlug === "string" && newSlug !== slug) {
    const collision = await prisma.post.findUnique({
      where: { slug: newSlug },
      select: { id: true },
    });
    const redirectCollision = await prisma.postRedirect.findUnique({
      where: { slug: newSlug },
      select: { id: true },
    });
    if (collision || redirectCollision) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 }
      );
    }
  }

  const html =
    typeof bodyMarkdown === "string" && bodyMarkdown !== existing.bodyMarkdown
      ? (await renderMarkdown(bodyMarkdown)).html
      : existing.bodyHtml;
  const effectiveVisibility = scheduledAt ? "PRIVATE" : visibility;
  const isPublishing = effectiveVisibility === "PUBLIC";
  const isUnpublishing =
    effectiveVisibility && effectiveVisibility !== "PUBLIC";

  const post = await prisma.$transaction(async tx => {
    if (typeof newSlug === "string" && newSlug !== slug) {
      await tx.postRedirect.create({ data: { slug, postId: existing.id } });
    }
    return tx.post.update({
      where: { id: existing.id },
      data: {
        ...(typeof title === "string" && { title: title.trim() }),
        ...(typeof newSlug === "string" && { slug: newSlug }),
        ...(typeof bodyMarkdown === "string" && {
          bodyMarkdown,
          bodyHtml: html,
        }),
        ...(effectiveVisibility && { visibility: effectiveVisibility }),
        ...(scheduledAt !== undefined && { scheduledAt }),
        ...(isPublishing && {
          publishedAt: existing.publishedAt ?? new Date(),
          scheduledAt: null,
        }),
        ...(isUnpublishing && { publishedAt: null }),
        ...(typeof body.isPinned === "boolean" && {
          isPinned: body.isPinned,
        }),
        ...(typeof body.isFeatured === "boolean" && {
          isFeatured: body.isFeatured,
        }),
        ...((body.seoDescription !== undefined ||
          tags !== undefined ||
          body.coverImage !== undefined ||
          body.coverImageAlt !== undefined) && {
          metadata: {
            upsert: {
              update: {
                ...(typeof body.seoDescription === "string" && {
                  seoDescription: body.seoDescription.trim() || null,
                }),
                ...(tags !== undefined && { tags: tags ?? [] }),
                ...(body.coverImage !== undefined && {
                  coverImage:
                    typeof body.coverImage === "string"
                      ? body.coverImage.trim() || null
                      : null,
                }),
                ...(body.coverImageAlt !== undefined && {
                  coverImageAlt:
                    typeof body.coverImageAlt === "string"
                      ? body.coverImageAlt.trim() || null
                      : null,
                }),
              },
              create: {
                seoDescription:
                  typeof body.seoDescription === "string"
                    ? body.seoDescription.trim() || null
                    : null,
                tags: tags ?? [],
                coverImage:
                  typeof body.coverImage === "string"
                    ? body.coverImage.trim() || null
                    : null,
                coverImageAlt:
                  typeof body.coverImageAlt === "string"
                    ? body.coverImageAlt.trim() || null
                    : null,
              },
            },
          },
        }),
      },
      include: postInclude,
    });
  });
  return NextResponse.json(post);
});

export const DELETE = apiHandler(async function DELETE(
  req: NextRequest,
  { params }: Context
) {
  const viewer = await getRequestViewer(req.headers, "posts:write");
  if (!viewer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const existing = await prisma.post.findUnique({ where: { slug } });
  if (!existing)
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!canManagePost(viewer, existing.authorId)) {
    return NextResponse.json(
      { error: "You can only delete your own posts" },
      { status: 403 }
    );
  }
  await prisma.post.delete({ where: { id: existing.id } });
  return NextResponse.json({ message: "Post deleted successfully" });
});
