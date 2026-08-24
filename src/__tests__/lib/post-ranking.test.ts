import {
  editorialRank,
  FEATURE_BOOST_DAYS,
  rankAllStories,
  rankHomepagePosts,
} from "@/lib/post-ranking";

const day = 24 * 60 * 60 * 1000;
const base = new Date("2026-07-01T00:00:00.000Z").getTime();
function post(
  id: string,
  ageInDays: number,
  options: { pinned?: boolean; featured?: boolean } = {}
) {
  return {
    id,
    isPinned: options.pinned ?? false,
    isFeatured: options.featured ?? false,
    publishedAt: new Date(base - ageInDays * day),
    createdAt: new Date(base - ageInDays * day),
  };
}

describe("editorial post ranking", () => {
  it("gives featured posts a fixed fourteen-day recency boost", () => {
    expect(FEATURE_BOOST_DAYS).toBe(14);
    expect(editorialRank(post("featured", 20, { featured: true }))).toBe(
      editorialRank(post("plain", 6))
    );
  });

  it("places the first three heuristic results before remaining pins", () => {
    const ranked = rankHomepagePosts([
      post("newest", 0),
      post("second", 1),
      post("featured", 10, { featured: true }),
      post("pinned", 2, { pinned: true }),
      post("old", 30),
    ]);
    expect(ranked.map(item => item.id)).toEqual([
      "featured",
      "newest",
      "second",
      "pinned",
      "old",
    ]);
  });

  it("does not duplicate an article that is both leading and pinned", () => {
    const ranked = rankHomepagePosts([
      post("both", 2, { featured: true, pinned: true }),
      post("newest", 0),
      post("second", 1),
      post("old-pin", 20, { pinned: true }),
    ]);
    expect(ranked.map(item => item.id)).toEqual([
      "both",
      "newest",
      "second",
      "old-pin",
    ]);
  });

  it("ignores featured state in All Stories and puts pins first", () => {
    const ranked = rankAllStories([
      post("featured", 1, { featured: true }),
      post("newest", 0),
      post("old-pin", 20, { pinned: true }),
      post("new-pin", 10, { pinned: true }),
    ]);
    expect(ranked.map(item => item.id)).toEqual([
      "new-pin",
      "old-pin",
      "newest",
      "featured",
    ]);
  });
});
