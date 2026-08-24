import "server-only";

export const VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE", "DRAFT"] as const;
export type PostVisibility = (typeof VISIBILITIES)[number];

export interface PostViewer {
  id: string;
  role: "ADMIN" | "AUTHOR" | "AGENT" | "GUEST";
}

export function isVisibility(value: unknown): value is PostVisibility {
  return (
    typeof value === "string" && VISIBILITIES.includes(value as PostVisibility)
  );
}

export function canMutatePosts(viewer: PostViewer | null): boolean {
  return viewer?.role === "ADMIN" || viewer?.role === "AUTHOR";
}

export function canManagePost(
  viewer: PostViewer | null,
  authorId: string
): boolean {
  return (
    !!viewer &&
    (viewer.role === "ADMIN" ||
      (viewer.role === "AUTHOR" && viewer.id === authorId))
  );
}

export function canReadPost(
  viewer: PostViewer | null,
  post: { authorId: string; visibility: PostVisibility }
): boolean {
  if (post.visibility === "PUBLIC" || post.visibility === "UNLISTED")
    return true;
  return !!viewer && (viewer.role === "ADMIN" || viewer.id === post.authorId);
}

/** Prisma-compatible predicate for collection queries. Unlisted posts are direct-link only. */
export function collectionAccessWhere(
  viewer: PostViewer | null
): Record<string, unknown> {
  if (!viewer) return { visibility: "PUBLIC" };
  if (viewer.role === "ADMIN") return {};
  return {
    OR: [{ visibility: "PUBLIC" }, { authorId: viewer.id }],
  };
}
