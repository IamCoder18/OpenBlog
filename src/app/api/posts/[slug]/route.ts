import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { headers } from "next/headers";
import { apiHandler } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
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

  if (!post || post.visibility !== "PUBLIC") {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});

export const PUT = apiHandler(async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id as string },
  });

  if (!userProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  const existingPost = await prisma.post.findUnique({
    where: { slug },
  });

  if (!existingPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAdmin = userProfile.role === "ADMIN";
  const isAuthor = existingPost.authorId === (session.user.id as string);

  if (!isAdmin && !isAuthor) {
    return NextResponse.json(
      { error: "You can only edit your own posts" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    title,
    slug: newSlug,
    bodyMarkdown,
    visibility,
    seoDescription,
    tags,
    coverImage,
  } = body;

  if (title !== undefined && (title.length < 1 || title.length > 200)) {
    return NextResponse.json(
      { error: "Title must be between 1 and 200 characters" },
      { status: 400 }
    );
  }

  if (newSlug !== undefined) {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(newSlug)) {
      return NextResponse.json(
        {
          error:
            "Slug must contain only lowercase letters, numbers, and hyphens",
        },
        { status: 400 }
      );
    }

    if (newSlug.length >= 100) {
      return NextResponse.json(
        { error: "Slug must be less than 100 characters" },
        { status: 400 }
      );
    }

    const existingSlugPost = await prisma.post.findUnique({
      where: { slug: newSlug },
    });

    if (existingSlugPost && existingSlugPost.id !== existingPost.id) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 }
      );
    }
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

  let html = existingPost.bodyHtml;
  if (bodyMarkdown && bodyMarkdown !== existingPost.bodyMarkdown) {
    const rendered = await renderMarkdown(bodyMarkdown);
    html = rendered.html;
  }

  const post = await prisma.post.update({
    where: { slug },
    data: {
      ...(title && { title }),
      ...(newSlug && { slug: newSlug }),
      ...(bodyMarkdown && { bodyMarkdown, bodyHtml: html }),
      ...(visibility && { visibility }),
      ...(visibility
        ? visibility === "PUBLIC" && !existingPost.publishedAt
          ? { publishedAt: new Date() }
          : visibility !== "PUBLIC" && existingPost.publishedAt
            ? { publishedAt: null }
            : {}
        : {}),
      ...((coverImage !== undefined ||
        seoDescription !== undefined ||
        tags !== undefined) && {
        metadata: {
          upsert: {
            update: {
              ...(seoDescription !== undefined && { seoDescription }),
              ...(tags !== undefined && { tags }),
              ...(coverImage !== undefined && { coverImage }),
            },
            create: {
              seoDescription: seoDescription || null,
              tags: tags || [],
              coverImage: coverImage || null,
            },
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

  return NextResponse.json(post);
});

export const DELETE = apiHandler(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id as string },
  });

  if (!userProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  const existingPost = await prisma.post.findUnique({
    where: { slug },
  });

  if (!existingPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAdmin = userProfile.role === "ADMIN";
  const isGuest = userProfile.role === "GUEST";
  const isAuthor = existingPost.authorId === (session.user.id as string);

  if (isGuest) {
    return NextResponse.json(
      { error: "GUEST users cannot delete posts" },
      { status: 403 }
    );
  }

  if (!isAdmin && !isAuthor) {
    return NextResponse.json(
      { error: "You can only delete your own posts" },
      { status: 403 }
    );
  }

  await prisma.post.delete({
    where: { slug },
  });

  return NextResponse.json({ message: "Post deleted successfully" });
});
