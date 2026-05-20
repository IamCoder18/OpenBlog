import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiHandler } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const currentPost = await prisma.post.findUnique({
    where: { slug },
    include: {
      metadata: true,
    },
  });

  if (!currentPost || currentPost.visibility !== "PUBLIC") {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const currentTags = currentPost.metadata?.tags || [];

  const relatedPosts = await prisma.post.findMany({
    where: {
      visibility: "PUBLIC",
      id: { not: currentPost.id },
      metadata:
        currentTags.length > 0
          ? {
              tags: {
                hasSome: currentTags,
              },
            }
          : undefined,
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
    orderBy: {
      publishedAt: "desc",
    },
    take: 3,
  });

  return NextResponse.json(relatedPosts, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});
