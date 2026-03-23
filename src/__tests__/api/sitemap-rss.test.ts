export {};

const { mockedPrisma, mockPrismaReset } = vi.hoisted(() => {
  const mockPosts: any[] = [];
  const mockUsers: any[] = [];

  const prisma = {
    post: {
      findMany: vi.fn(async (options: any) => {
        let results = [...mockPosts].filter(p => p.visibility === "PUBLIC");

        if (options?.orderBy?.publishedAt === "desc") {
          results.sort((a, b) => {
            const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
            return dateB - dateA;
          });
        }

        if (options?.take !== undefined) {
          results = results.slice(0, options.take);
        }

        if (options?.include?.author) {
          return results.map(post => ({
            ...post,
            author: mockUsers.find(u => u.id === post.authorId) || {
              name: "Unknown",
            },
          }));
        }

        if (options?.select?.slug) {
          return results.map(post => ({
            slug: post.slug,
            updatedAt: post.updatedAt,
            publishedAt: post.publishedAt,
          }));
        }

        return results;
      }),
      create: vi.fn(async (data: any) => {
        const post = {
          id: `post-${Math.random()}`,
          title: data.data.title,
          slug: data.data.slug,
          bodyMarkdown: data.data.bodyMarkdown || "",
          visibility: data.data.visibility || "PUBLIC",
          authorId: data.data.authorId,
          publishedAt: data.data.publishedAt || new Date(),
          updatedAt: new Date(),
        };
        mockPosts.push(post);
        return post;
      }),
    },
    user: {
      create: vi.fn(async (data: any) => {
        const user = {
          id: data.data.id || `user-${Math.random()}`,
          name: data.data.name,
          email: data.data.email,
        };
        mockUsers.push(user);
        return user;
      }),
    },
    $disconnect: vi.fn(async () => {}),
  };

  return {
    mockedPrisma: prisma,
    mockPrismaReset: () => {
      mockPosts.length = 0;
      mockUsers.length = 0;
    },
  };
});

vi.mock("../utils/test-utils", () => ({
  setupTestDatabase: vi.fn().mockResolvedValue({}),
  cleanupDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/config", () => ({
  __esModule: true,
  config: {
    BLOG_NAME: "Test Blog",
    BASE_URL: "http://localhost:3000",
  },
  getSiteSettings: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db", () => ({
  prisma: mockedPrisma,
}));

import sitemap from "@/app/sitemap";
import * as feedRoute from "@/app/feed.xml/route";

describe("Comprehensive Sitemap & RSS Tests", () => {
  beforeEach(() => {
    mockPrismaReset();
    vi.clearAllMocks();
  });

  describe("1. Sitemap Generation", () => {
    it("should return valid sitemap array with base URL", async () => {
      const result: Array<{ url: string }> = await sitemap();
      expect(Array.isArray(result)).toBe(true);
      expect(
        result.some((e: { url: string }) => e.url === "http://localhost:3000")
      ).toBe(true);
    });

    it("should include all public posts in sitemap", async () => {
      await mockedPrisma.post.create({
        data: { title: "P1", slug: "p1", visibility: "PUBLIC" },
      });
      await mockedPrisma.post.create({
        data: { title: "P2", slug: "p2", visibility: "PUBLIC" },
      });

      const result: Array<{ url: string }> = await sitemap();
      const postEntries = result.filter((e: { url: string }) =>
        e.url.includes("/blog/")
      );
      expect(postEntries.length).toBe(2);
      expect(
        postEntries.some((e: { url: string }) => e.url.includes("p1"))
      ).toBe(true);
      expect(
        postEntries.some((e: { url: string }) => e.url.includes("p2"))
      ).toBe(true);
    });

    it("should strictly exclude private posts from sitemap", async () => {
      await mockedPrisma.post.create({
        data: { title: "Public", slug: "public", visibility: "PUBLIC" },
      });
      await mockedPrisma.post.create({
        data: { title: "Private", slug: "private", visibility: "PRIVATE" },
      });

      const result: Array<{ url: string }> = await sitemap();
      expect(
        result.some((e: { url: string }) => e.url.includes("public"))
      ).toBe(true);
      expect(
        result.some((e: { url: string }) => e.url.includes("private"))
      ).toBe(false);
    });

    it("should handle empty database gracefully (only base URL)", async () => {
      const result = await sitemap();
      expect(result.length).toBe(1);
      expect(result[0].url).toBe("http://localhost:3000");
    });
  });

  describe("2. RSS Feed Generation", () => {
    it("should return valid RSS XML with channel info", async () => {
      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(response.status).toBe(200);
      expect(xml).toContain('<rss version="2.0">');
      expect(xml).toContain("<title><![CDATA[Test Blog]]></title>");
      expect(xml).toContain("<link>http://localhost:3000</link>");
    });

    it("should include public posts with author names in RSS", async () => {
      await mockedPrisma.user.create({ data: { id: "u1", name: "Jane Doe" } });
      await mockedPrisma.post.create({
        data: {
          title: "RSS Post",
          slug: "rss-post",
          visibility: "PUBLIC",
          authorId: "u1",
          bodyMarkdown: "Hello RSS",
        },
      });

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<title><![CDATA[RSS Post]]></title>");
      expect(xml).toContain("<author>Jane Doe</author>");
      expect(xml).toContain("rss-post");
    });

    it("should handle posts with missing authors gracefully", async () => {
      await mockedPrisma.post.create({
        data: { title: "No Author", slug: "no-author", visibility: "PUBLIC" },
      });

      const response = await feedRoute.GET();
      const xml = await response.text();
      expect(xml).toContain("<author>Unknown</author>");
    });

    it("should limit RSS feed to the latest 20 posts", async () => {
      for (let i = 1; i <= 25; i++) {
        await mockedPrisma.post.create({
          data: { title: `Post ${i}`, slug: `p${i}`, visibility: "PUBLIC" },
        });
      }

      const response = await feedRoute.GET();
      const xml = await response.text();

      const itemCount = (xml.match(/<item>/g) || []).length;
      expect(itemCount).toBe(20);
    });

    it("should exclude private posts from RSS feed", async () => {
      await mockedPrisma.post.create({
        data: { title: "Secret", slug: "secret", visibility: "PRIVATE" },
      });

      const response = await feedRoute.GET();
      const xml = await response.text();
      expect(xml).not.toContain("secret");
    });
  });

  describe("3. Edge Cases & Formats", () => {
    it("should use current date for lastBuildDate", async () => {
      const response = await feedRoute.GET();
      const xml = await response.text();
      expect(xml).toContain("<lastBuildDate>");
      expect(xml).toContain(
        new Date().toUTCString().split(" ").slice(0, 3).join(" ")
      );
    });

    it("should handle special characters in titles via CDATA", async () => {
      await mockedPrisma.post.create({
        data: {
          title: "Title & Special > Characters",
          slug: "special",
          visibility: "PUBLIC",
        },
      });

      const response = await feedRoute.GET();
      const xml = await response.text();
      expect(xml).toContain(
        "<title><![CDATA[Title & Special > Characters]]></title>"
      );
    });
  });
});
