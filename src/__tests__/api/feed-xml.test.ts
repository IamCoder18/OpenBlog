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
            author: mockUsers.find(u => u.id === post.authorId) || null,
          }));
        }

        return results;
      }),
      create: vi.fn(async (data: any) => {
        const post = {
          id: data.data.id || `post-${Math.random()}`,
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

import * as feedRoute from "@/app/feed.xml/route";

describe("feed.xml Route", () => {
  beforeEach(() => {
    mockPrismaReset();
    vi.clearAllMocks();
  });

  describe("1. Successful RSS feed generation with public posts", () => {
    it("should return 200 with valid XML when posts exist", async () => {
      const response = await feedRoute.GET();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/xml");
    });

    it("should include blog name and base URL in feed", async () => {
      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<title><![CDATA[Test Blog]]></title>");
      expect(xml).toContain("<link>http://localhost:3000</link>");
      expect(xml).toContain(
        "<description><![CDATA[Test Blog RSS Feed]]></description>"
      );
    });

    it("should include public posts in the feed", async () => {
      const mockUser = {
        id: "user-1",
        name: "John Doe",
      };
      mockedPrisma.user.create.mockResolvedValueOnce(mockUser);

      const mockPost = {
        id: "post-1",
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown: "This is a test post content",
        visibility: "PUBLIC",
        authorId: "user-1",
        publishedAt: new Date("2024-01-15T10:00:00Z"),
      };

      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          ...mockPost,
          author: mockUser,
        },
      ]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<title><![CDATA[Test Post]]></title>");
      expect(xml).toContain("test-post");
      expect(xml).toContain("<author>John Doe</author>");
    });

    it("should order posts by publishedAt descending", async () => {
      const mockUser = { id: "user-1", name: "Author" };

      const posts = [
        {
          id: "post-1",
          title: "Newest Post",
          slug: "newest",
          bodyMarkdown: "Content",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: new Date("2024-03-01T10:00:00Z"),
          author: mockUser,
        },
        {
          id: "post-2",
          title: "Oldest Post",
          slug: "oldest",
          bodyMarkdown: "Content",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: new Date("2024-01-01T10:00:00Z"),
          author: mockUser,
        },
      ];

      mockedPrisma.post.findMany.mockResolvedValueOnce(posts);

      const response = await feedRoute.GET();
      const xml = await response.text();

      const newestIndex = xml.indexOf("Newest Post");
      const oldestIndex = xml.indexOf("Oldest Post");

      expect(newestIndex).toBeLessThan(oldestIndex);
    });

    it("should limit feed to 20 posts", async () => {
      const mockUser = { id: "user-1", name: "Author" };
      mockedPrisma.user.create.mockResolvedValueOnce(mockUser);

      for (let i = 0; i < 30; i++) {
        await mockedPrisma.post.create({
          data: {
            id: `post-${i}`,
            title: `Post ${i}`,
            slug: `post-${i}`,
            bodyMarkdown: "Content",
            visibility: "PUBLIC",
            authorId: "user-1",
            publishedAt: new Date(),
          },
        });
      }

      const response = await feedRoute.GET();
      const xml = await response.text();

      const itemCount = (xml.match(/<item>/g) || []).length;
      expect(itemCount).toBe(20);
    });
  });

  describe("2. Empty feed when no posts", () => {
    it("should return valid XML structure with no items", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(response.status).toBe(200);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8" ?>');
      expect(xml).toContain('<rss version="2.0">');
      expect(xml).toContain("<channel>");
      expect(xml).toContain("</channel>");
      expect(xml).toContain("</rss>");
    });

    it("should still include channel metadata when no posts", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<title><![CDATA[Test Blog]]></title>");
      expect(xml).toContain("<link>http://localhost:3000</link>");
      expect(xml).toContain("<lastBuildDate>");
    });
  });

  describe("3. Correct XML structure and content", () => {
    it("should return Content-Type application/xml", async () => {
      const response = await feedRoute.GET();

      expect(response.headers.get("Content-Type")).toBe("application/xml");
    });

    it("should include all required RSS elements", async () => {
      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8" ?>');
      expect(xml).toContain('<rss version="2.0">');
      expect(xml).toContain("<channel>");
      expect(xml).toContain("<title>");
      expect(xml).toContain("<link>");
      expect(xml).toContain("<description>");
      expect(xml).toContain("<language>en-us</language>");
      expect(xml).toContain("<lastBuildDate>");
      expect(xml).toContain("</channel>");
      expect(xml).toContain("</rss>");
    });

    it("should wrap content in CDATA sections", async () => {
      const mockUser = { id: "user-1", name: "Author" };

      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          id: "post-1",
          title: "Test & Title",
          slug: "test-title",
          bodyMarkdown: "Test <content>",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: new Date(),
          author: mockUser,
        },
      ]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<title><![CDATA[");
      expect(xml).toContain("]]></title>");
      expect(xml).toContain("<description><![CDATA[");
      expect(xml).toContain("]]></description>");
    });

    it("should include post link with base URL", async () => {
      const mockUser = { id: "user-1", name: "Author" };

      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          id: "post-1",
          title: "Test Post",
          slug: "my-post",
          bodyMarkdown: "Content",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: new Date(),
          author: mockUser,
        },
      ]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<link>http://localhost:3000/blog/my-post</link>");
    });

    it("should include description truncated to 200 chars", async () => {
      const mockUser = { id: "user-1", name: "Author" };
      const longBody = "A".repeat(300);

      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          id: "post-1",
          title: "Test Post",
          slug: "test-post",
          bodyMarkdown: longBody,
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: new Date(),
          author: mockUser,
        },
      ]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      const descMatch = xml.match(
        /<description><!\[CDATA\[(.*?)\]\]><\/description>/s
      );
      expect(descMatch).toBeTruthy();
      expect(descMatch![1].length).toBeLessThanOrEqual(200);
    });
  });

  describe("4. Non-public posts are not included", () => {
    it("should not include PRIVATE posts", async () => {
      const mockUser = { id: "user-1", name: "Author" };

      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).not.toContain("Private Post");
    });

    it("should not include UNLISTED posts", async () => {
      const mockUser = { id: "user-1", name: "Author" };

      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).not.toContain("Unlisted Post");
    });

    it("should only query with visibility: PUBLIC", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([]);

      await feedRoute.GET();

      expect(mockedPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: "PUBLIC",
          }),
        })
      );
    });
  });

  describe("5. Proper handling of missing author names", () => {
    it("should use 'Unknown' when author is null", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          id: "post-1",
          title: "Test Post",
          slug: "test-post",
          bodyMarkdown: "Content",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: new Date(),
          author: null,
        },
      ]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<author>Unknown</author>");
    });

    it("should use 'Unknown' when author name is undefined", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          id: "post-1",
          title: "Test Post",
          slug: "test-post",
          bodyMarkdown: "Content",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: new Date(),
          author: { name: undefined },
        },
      ]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<author>Unknown</author>");
    });

    it("should use author name when available", async () => {
      const mockUser = { id: "user-1", name: "Jane Smith" };

      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          id: "post-1",
          title: "Test Post",
          slug: "test-post",
          bodyMarkdown: "Content",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: new Date(),
          author: mockUser,
        },
      ]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<author>Jane Smith</author>");
      expect(xml).not.toContain("<author>Unknown</author>");
    });
  });

  describe("6. Correct date formatting", () => {
    it("should format post pubDate in UTC", async () => {
      const mockUser = { id: "user-1", name: "Author" };
      const testDate = new Date("2024-06-15T12:30:00Z");

      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          id: "post-1",
          title: "Test Post",
          slug: "test-post",
          bodyMarkdown: "Content",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: testDate,
          author: mockUser,
        },
      ]);

      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<pubDate>");
      expect(xml).toContain("2024");
    });

    it("should use current date for posts without publishedAt", async () => {
      mockedPrisma.post.findMany.mockResolvedValueOnce([
        {
          id: "post-1",
          title: "Test Post",
          slug: "test-post",
          bodyMarkdown: "Content",
          visibility: "PUBLIC",
          authorId: "user-1",
          publishedAt: null,
          author: { name: "Author" },
        },
      ]);

      const beforeRequest = new Date().toUTCString();
      const response = await feedRoute.GET();
      const xml = await response.text();
      const afterRequest = new Date().toUTCString();

      const pubDateMatch = xml.match(/<pubDate>(.*?)<\/pubDate>/);
      expect(pubDateMatch).toBeTruthy();

      const pubDate = pubDateMatch![1];
      expect(pubDate.length).toBeGreaterThan(0);
    });

    it("should include lastBuildDate in the channel", async () => {
      const response = await feedRoute.GET();
      const xml = await response.text();

      expect(xml).toContain("<lastBuildDate>");

      const lastBuildDateMatch = xml.match(
        /<lastBuildDate>(.*?)<\/lastBuildDate>/
      );
      expect(lastBuildDateMatch).toBeTruthy();

      const lastBuildDate = new Date(lastBuildDateMatch![1]);
      const now = new Date();
      const diff = Math.abs(now.getTime() - lastBuildDate.getTime());
      expect(diff).toBeLessThan(5000);
    });
  });
});
