import { beforeEach, describe, expect, it, vi } from "vitest";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { GET as getSitemapIndex } from "@/app/sitemap.xml/route";
import { GET as getSitemapPart } from "@/app/sitemaps/[part]/route";
import getRobots from "@/app/robots";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    post: { findMany: vi.fn() },
    siteSettings: { findMany: vi.fn() },
  },
}));

const update = new Date("2026-07-15T12:00:00.000Z");
const publicPost = {
  id: "post-1",
  slug: "runtime-post",
  authorId: "author-1",
  updatedAt: update,
  publishedAt: update,
  metadata: { tags: ["Runtime"], coverImage: null },
};

describe("sitemap routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = "https://runtime.example.com";
    vi.mocked(prisma.post.findMany).mockResolvedValue([publicPost] as never);
    vi.mocked(prisma.siteSettings.findMany).mockResolvedValue([] as never);
  });

  it("generates the index at request time from the runtime origin", async () => {
    const response = await getSitemapIndex();
    const xml = await response.text();

    expect(connection).toHaveBeenCalledOnce();
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(xml).toContain("https://runtime.example.com/sitemaps/site-1.xml");
    expect(xml).toContain("https://runtime.example.com/sitemaps/posts-1.xml");
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visibility: "PUBLIC" } })
    );
  });

  it("advertises the sitemap using the runtime origin", async () => {
    const robots = await getRobots();

    expect(connection).toHaveBeenCalledOnce();
    expect(robots.sitemap).toBe("https://runtime.example.com/sitemap.xml");
  });

  it("serves complete sitemap parts and returns 404 for invalid parts", async () => {
    const response = await getSitemapPart(new Request("https://example.com"), {
      params: Promise.resolve({ part: "posts-1.xml" }),
    });
    const xml = await response.text();

    expect(xml).toContain("https://runtime.example.com/blog/runtime-post");
    expect(xml).toContain("<lastmod>2026-07-15T12:00:00.000Z</lastmod>");
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visibility: "PUBLIC" },
        skip: 0,
        take: 50_000,
      })
    );

    const missing = await getSitemapPart(new Request("https://example.com"), {
      params: Promise.resolve({ part: "private.xml" }),
    });
    expect(missing.status).toBe(404);
  });

  it("does not turn database failures into a misleading successful sitemap", async () => {
    vi.mocked(prisma.post.findMany).mockRejectedValueOnce(
      new Error("database unavailable")
    );

    await expect(getSitemapIndex()).rejects.toThrow("database unavailable");
  });
});
