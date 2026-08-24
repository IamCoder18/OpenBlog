export const FEATURE_BOOST_DAYS = 14;
const FEATURE_BOOST_MS = FEATURE_BOOST_DAYS * 24 * 60 * 60 * 1000;

export interface RankablePost {
  id: string;
  isPinned: boolean;
  isFeatured: boolean;
  publishedAt: string | Date | null;
  createdAt: string | Date;
}

function timestamp(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function editorialRank(post: RankablePost): number {
  const published = timestamp(post.publishedAt) || timestamp(post.createdAt);
  return published + (post.isFeatured ? FEATURE_BOOST_MS : 0);
}

function newestFirst(a: RankablePost, b: RankablePost): number {
  const difference =
    (timestamp(b.publishedAt) || timestamp(b.createdAt)) -
    (timestamp(a.publishedAt) || timestamp(a.createdAt));
  return difference || a.id.localeCompare(b.id);
}

function heuristicFirst(a: RankablePost, b: RankablePost): number {
  return editorialRank(b) - editorialRank(a) || newestFirst(a, b);
}

export function rankHomepagePosts<T extends RankablePost>(posts: T[]): T[] {
  const heuristic = [...posts].sort(heuristicFirst);
  const leading = heuristic.slice(0, 3);
  const leadingIds = new Set(leading.map(post => post.id));
  const pinned = heuristic
    .filter(post => post.isPinned && !leadingIds.has(post.id))
    .sort(newestFirst);
  const pinnedIds = new Set(pinned.map(post => post.id));
  const remaining = heuristic.filter(
    post => !leadingIds.has(post.id) && !pinnedIds.has(post.id)
  );
  return [...leading, ...pinned, ...remaining];
}

export function rankAllStories<T extends RankablePost>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) => Number(b.isPinned) - Number(a.isPinned) || newestFirst(a, b)
  );
}
