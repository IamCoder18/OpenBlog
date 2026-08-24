import { describe, expect, it } from "vitest";
import {
  SITEMAP_MAX_URLS,
  buildPostEntries,
  buildSiteEntries,
  buildSitemapIndex,
  partition,
  serializeSitemap,
  serializeSitemapIndex,
  type SitemapOverview,
  type SitemapPost,
} from "@/lib/sitemap";
import { DEFAULT_PUBLICATION_SETTINGS } from "@/lib/publication-settings.shared";

const firstUpdate = new Date("2026-01-02T03:04:05.000Z");
const secondUpdate = new Date("2026-02-03T04:05:06.000Z");

function post(overrides: Partial<SitemapPost> = {}): SitemapPost {
  return {
    id: "post-1",
    slug: "first-post",
    authorId: "author-1",
    updatedAt: firstUpdate,
    publishedAt: firstUpdate,
    metadata: { tags: ["SEO"], coverImage: null },
    ...overrides,
  };
}

function overview(overrides: Partial<SitemapOverview> = {}): SitemapOverview {
  return {
    baseUrl: "https://blog.example.com",
    posts: [post()],
    publication: structuredClone(DEFAULT_PUBLICATION_SETTINGS),
    ...overrides,
  };
}

describe("sitemap entry construction", () => {
  it("uses truthful modification dates for collections, authors, topics, and pages", () => {
    const publication = structuredClone(DEFAULT_PUBLICATION_SETTINGS);
    publication.pages.about.enabled = true;
    const entries = buildSiteEntries(
      overview({
        publication,
        publicationModifiedAt: firstUpdate,
        siteModifiedAt: secondUpdate,
        posts: [
          post(),
          post({
            id: "post-2",
            slug: "second-post",
            updatedAt: secondUpdate,
            metadata: { tags: ["SEO", "Next.js"], coverImage: null },
          }),
        ],
      })
    );

    expect(
      entries.find(entry => entry.url.endsWith("/about"))?.lastModified
    ).toEqual(firstUpdate);
    expect(
      entries.find(entry => entry.url.endsWith("/authors/author-1"))
        ?.lastModified
    ).toEqual(secondUpdate);
    expect(
      entries.find(entry => entry.url.endsWith("/topics/SEO"))?.lastModified
    ).toEqual(secondUpdate);
    expect(
      entries.find(entry => entry.url === "https://blog.example.com")
        ?.lastModified
    ).toEqual(secondUpdate);
  });

  it("includes absolute image URLs and safely encoded post URLs", () => {
    const entries = buildPostEntries("https://blog.example.com", [
      post({
        slug: "xml & seo",
        metadata: { tags: [], coverImage: "/covers/hero image.jpg" },
      }),
    ]);
    const xml = serializeSitemap(entries);

    expect(entries[0].url).toBe(
      "https://blog.example.com/blog/xml%20%26%20seo"
    );
    expect(xml).toContain("xmlns:image=");
    expect(xml).toContain(
      "<image:loc>https://blog.example.com/covers/hero%20image.jpg</image:loc>"
    );
    expect(xml).toContain("<lastmod>2026-01-02T03:04:05.000Z</lastmod>");
  });
});

describe("sitemap protocol output", () => {
  it("escapes XML values and links the human-readable stylesheet", () => {
    const xml = serializeSitemapIndex([
      { url: "https://example.com/sitemap?a=1&b=2", lastModified: firstUpdate },
    ]);

    expect(xml).toContain(
      '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>'
    );
    expect(xml).toContain("a=1&amp;b=2");
    expect(xml).toContain("<sitemapindex");
  });

  it("partitions every URL without exceeding the 50,000 URL limit", () => {
    const values = Array.from(
      { length: SITEMAP_MAX_URLS + 1 },
      (_, index) => index
    );
    const chunks = partition(values);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(SITEMAP_MAX_URLS);
    expect(chunks[1]).toEqual([SITEMAP_MAX_URLS]);
  });

  it("creates separate site and post sitemap index entries", () => {
    const posts = Array.from({ length: SITEMAP_MAX_URLS + 1 }, (_, index) =>
      post({ id: `post-${index}`, slug: `post-${index}` })
    );
    const entries = buildSitemapIndex(overview({ posts }));

    expect(entries.map(entry => entry.url)).toEqual([
      "https://blog.example.com/sitemaps/site-1.xml",
      "https://blog.example.com/sitemaps/posts-1.xml",
      "https://blog.example.com/sitemaps/posts-2.xml",
    ]);
  });
});
