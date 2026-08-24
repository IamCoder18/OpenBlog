import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/db";
import { canReadPost, type PostViewer } from "@/lib/post-policy";

export const postInclude = {
  author: { select: { id: true, name: true, image: true } },
  metadata: true,
} as const;

export const getPublicPostBySlug = cache(async (slug: string) => {
  const direct = await prisma.post.findUnique({
    where: { slug },
    include: postInclude,
  });
  if (
    direct &&
    (direct.visibility === "PUBLIC" || direct.visibility === "UNLISTED")
  ) {
    return { post: direct, redirected: false };
  }

  const redirect = await prisma.postRedirect.findUnique({
    where: { slug },
    include: { post: { include: postInclude } },
  });
  if (redirect && redirect.post.visibility === "PUBLIC") {
    return { post: redirect.post, redirected: true };
  }
  return null;
});

export async function getPostForViewer(
  slug: string,
  viewer: PostViewer | null
) {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: postInclude,
  });
  return post && canReadPost(viewer, post) ? post : null;
}
