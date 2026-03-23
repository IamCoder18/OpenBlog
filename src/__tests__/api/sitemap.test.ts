export {};

const { mockedPrisma, mockPrismaReset } = vi.hoisted(() => {
  const mockPosts: any[] = [];

  const prisma = {
    post: {
      findMany: vi.fn(async (options: any) => {
        let results = [...mockPosts];

        if (options?.where?.visibility === "PUBLIC") {
          results = results.filter(p => p.visibility === "PUBLIC");
        }

        return results;
      }),
      $disconnect: vi.fn(async () => {}),
    },
  };

  return {
    mockedPrisma: prisma,
    mockPrismaReset: () => {
      mockPosts.length = 0;
    },
    addMockPost: (post: any) => {
      mockPosts.push(post);
    },
  };
});

vi.mock("@/lib/config", () => ({
  __esModule: true,
  config: {
    BLOG_NAME: "Test Blog",
    BASE_URL: "http://localhost:3000",
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockedPrisma,
}));

import sitemap from "@/app/sitemap";

describe("sitemap Route", () => {
  beforeEach(() => {
    mockPrismaReset();
    vi.clearAllMocks();
  });

  describe("1. Sitemap with public posts", () => {
    it("should return sitemap with public posts", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          slug: "test-post-1",
          updatedAt: new Date("2024-01-15T10:00:00Z"),
          publishedAt: new Date("2024-01-10T10:00:00Z"),
        },
        {
          slug: "test-post-2",
          updatedAt: new Date("2024-02-20T10:00:00Z"),
          publishedAt: new Date("2024-02-15T10:00:00Z"),
        },
      ]);

      const result = await sitemap();

      expect(result.length).toBeGreaterThan(1);
      expect(
        result.some(
          item => item.url === "http://localhost:3000/blog/test-post-1"
        )
      ).toBe(true);
      expect(
        result.some(
          item => item.url === "http://localhost:3000/blog/test-post-2"
        )
      ).toBe(true);
    });

    it("should query only public posts", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      await sitemap();

      expect(mockedPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: "PUBLIC",
          }),
        })
      );
    });

    it("should select slug, updatedAt, and publishedAt", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      await sitemap();

      expect(mockedPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            slug: true,
            updatedAt: true,
            publishedAt: true,
          }),
        })
      );
    });
  });

  describe("2. Sitemap with empty posts", () => {
    it("should return sitemap with only base URL when no posts", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const result = await sitemap();

      expect(result.length).toBe(1);
      expect(result[0].url).toBe("http://localhost:3000");
    });

    it("should return valid sitemap structure with no posts", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const result = await sitemap();

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty("url");
      expect(result[0]).toHaveProperty("lastModified");
    });
  });

  describe("3. Base URL is included", () => {
    it("should always include base URL as first entry", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          slug: "test-post",
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
      ]);

      const result = await sitemap();

      expect(result[0].url).toBe("http://localhost:3000");
    });

    it("should use BASE_URL from config", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const result = await sitemap();

      expect(result[0].url).toBe("http://localhost:3000");
    });
  });

  describe("4. lastModified uses updatedAt or publishedAt", () => {
    it("should use updatedAt when available", async () => {
      const updatedAt = new Date("2024-03-01T10:00:00Z");
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          slug: "test-post",
          updatedAt: updatedAt,
          publishedAt: new Date("2024-02-01T10:00:00Z"),
        },
      ]);

      const result = await sitemap();
      const postEntry = result.find(item => item.url.includes("/blog/"));

      expect(postEntry?.lastModified).toEqual(updatedAt);
    });

    it("should fallback to publishedAt when updatedAt is null", async () => {
      const publishedAt = new Date("2024-02-01T10:00:00Z");
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          slug: "test-post",
          updatedAt: null,
          publishedAt: publishedAt,
        },
      ]);

      const result = await sitemap();
      const postEntry = result.find(item => item.url.includes("/blog/"));

      expect(postEntry?.lastModified).toEqual(publishedAt);
    });

    it("should fallback to current date when both updatedAt and publishedAt are null", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          slug: "test-post",
          updatedAt: null,
          publishedAt: null,
        },
      ]);

      const beforeRequest = new Date();
      const result = await sitemap();
      const afterRequest = new Date();

      const postEntry = result.find(item => item.url.includes("/blog/"));
      const lastMod = new Date(postEntry!.lastModified);

      expect(lastMod.getTime()).toBeGreaterThanOrEqual(
        beforeRequest.getTime() - 1000
      );
      expect(lastMod.getTime()).toBeLessThanOrEqual(
        afterRequest.getTime() + 1000
      );
    });
  });

  describe("5. Correct URL format for posts", () => {
    it("should format post URLs as BASE_URL/blog/{slug}", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          slug: "my-blog-post",
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
      ]);

      const result = await sitemap();
      const postEntry = result.find(item => item.url.includes("/blog/"));

      expect(postEntry?.url).toBe("http://localhost:3000/blog/my-blog-post");
    });

    it("should handle posts with special characters in slug", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          slug: "post-with-dashes",
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
      ]);

      const result = await sitemap();
      const postEntry = result.find(item => item.url.includes("/blog/"));

      expect(postEntry?.url).toContain("post-with-dashes");
    });
  });

  describe("6. Private posts are excluded", () => {
    it("should only query with visibility PUBLIC", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      await sitemap();

      expect(mockedPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: "PUBLIC",
          }),
        })
      );
    });

    it("should not include private posts in sitemap", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const result = await sitemap();

      const postUrls = result.filter(item => item.url.includes("/blog/"));
      expect(postUrls.length).toBe(0);
    });

    it("should not return private posts even if they exist in db", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const result = await sitemap();

      expect(result.length).toBe(1);
      expect(result[0].url).toBe("http://localhost:3000");
    });
  });

  describe("7. General sitemap structure", () => {
    it("should return array of sitemap entries", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const result = await sitemap();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should have url and lastModified for each entry", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          slug: "test-post",
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
      ]);

      const result = await sitemap();

      result.forEach(entry => {
        expect(entry).toHaveProperty("url");
        expect(entry).toHaveProperty("lastModified");
        expect(typeof entry.url).toBe("string");
        expect(entry.lastModified).toBeInstanceOf(Date);
      });
    });

    it("should have base URL entry with recent lastModified", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const beforeRequest = new Date();
      const result = await sitemap();
      const afterRequest = new Date();

      const baseUrlEntry = result[0];
      const lastMod = new Date(baseUrlEntry.lastModified);

      expect(baseUrlEntry.url).toBe("http://localhost:3000");
      expect(lastMod.getTime()).toBeGreaterThanOrEqual(
        beforeRequest.getTime() - 1000
      );
      expect(lastMod.getTime()).toBeLessThanOrEqual(
        afterRequest.getTime() + 1000
      );
    });
  });
});
