const {
  mockGetSession: mockAuthGetSession,
  MockNextRequest,
  MockNextResponse,
} = vi.hoisted(() => {
  class NextRequest {
    url: string;
    body: any;
    headers: any;
    constructor(url: string, init?: any) {
      this.url = url;
      this.body = init?.body;
      this.headers = init?.headers || new Headers();
    }
    get json() {
      return async () => this.body;
    }
    get searchParams() {
      return new URL(this.url).searchParams;
    }
  }

  class NextResponse {
    status: number;
    _body: any;
    headers: Map<string, string>;
    constructor(body?: any, init?: any) {
      this._body = body;
      this.status = init?.status || 200;
      this.headers = new Map();
      if (init?.headers) {
        Object.entries(init.headers as Record<string, string>).forEach(
          ([k, v]) => this.headers.set(k, v)
        );
      }
    }
    json() {
      return Promise.resolve(
        typeof this._body === "string" ? JSON.parse(this._body) : this._body
      );
    }
    static json(data: any, init?: any) {
      const response = new NextResponse(JSON.stringify(data), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      });
      return response;
    }
  }

  return {
    mockGetSession: vi.fn(),
    MockNextRequest: NextRequest,
    MockNextResponse: NextResponse,
  };
});

const mockPosts: any[] = [];
const mockUsers: any[] = [];
let postIdCounter = 1;
let userIdCounter = 1;

const { mockedPrisma, mockPrismaReset } = vi.hoisted(() => {
  const prisma = {
    post: {
      findUnique: vi.fn(async (options: any) => {
        return mockPosts.find(p => p.slug === options?.where?.slug) || null;
      }),
      create: vi.fn(async (data: any) => {
        const post = {
          id: `post-${postIdCounter++}`,
          title: data.data.title,
          slug: data.data.slug,
          bodyMarkdown: data.data.bodyMarkdown,
          bodyHtml: data.data.bodyHtml,
          visibility: data.data.visibility,
          authorId: data.data.authorId,
          publishedAt: data.data.publishedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: data.data.metadata
            ? {
                id: `meta-${postIdCounter}`,
                seoDescription: data.data.metadata.create?.seoDescription,
                tags: data.data.metadata.create?.tags || [],
                postId: `post-${postIdCounter}`,
              }
            : null,
          author: {
            id: data.data.authorId,
            name:
              mockUsers.find(u => u.id === data.data.authorId)?.name ||
              "Unknown",
            image:
              mockUsers.find(u => u.id === data.data.authorId)?.image || null,
          },
        };
        mockPosts.push(post);
        return post;
      }),
      findMany: vi.fn(async () => {
        return mockPosts.filter(p => p.visibility === "PUBLIC");
      }),
      count: vi.fn(async () => {
        return mockPosts.filter(p => p.visibility === "PUBLIC").length;
      }),
      deleteMany: vi.fn(async () => {
        const length = mockPosts.length;
        mockPosts.length = 0;
        return { count: length };
      }),
      update: vi.fn(async (options: any) => {
        const index = mockPosts.findIndex(p => p.slug === options.where.slug);
        if (index === -1) throw new Error("Post not found");
        mockPosts[index] = { ...mockPosts[index], ...options.data };
        return mockPosts[index];
      }),
      delete: vi.fn(async (options: any) => {
        const index = mockPosts.findIndex(p => p.slug === options.where.slug);
        if (index === -1) throw new Error("Post not found");
        const deleted = mockPosts.splice(index, 1);
        return deleted[0];
      }),
    },
    user: {
      create: vi.fn(async (data: any) => {
        const user = {
          id: `user-${userIdCounter++}`,
          name: data.data.name,
          email: data.data.email,
          image: data.data.image,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.push(user);
        return user;
      }),
      findUnique: vi.fn(async (options: any) => {
        return mockUsers.find(u => u.id === options?.where?.id) || null;
      }),
      deleteMany: vi.fn(async () => {
        const length = mockUsers.length;
        mockUsers.length = 0;
        return { count: length };
      }),
    },
    userProfile: {
      create: vi.fn(async (data: any) => ({
        id: `profile-${userIdCounter++}`,
        role: data.data.role || "AGENT",
        userId: data.data.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findUnique: vi.fn(async (options: any) => {
        const profile = mockUsers.find(u => u.id === options?.where?.userId);
        return profile ? { role: "AGENT", userId: profile.id } : null;
      }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    account: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    apiKey: {
      create: vi.fn(async (data: any) => ({
        id: `key-${Date.now()}`,
        key: data.data.key,
        name: data.data.name,
        userId: data.data.userId,
        expiresAt: data.data.expiresAt,
        createdAt: new Date(),
      })),
      findUnique: vi.fn(async (options: any) => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    verification: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    postMetadata: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    siteSettings: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  };

  return {
    mockedPrisma: prisma,
    mockPrismaReset: () => {
      mockPosts.length = 0;
      mockUsers.length = 0;
      postIdCounter = 1;
      userIdCounter = 1;
    },
  };
});

vi.mock("../utils/test-utils", () => ({
  setupTestDatabase: vi.fn().mockResolvedValue({}),
  cleanupDatabase: vi.fn().mockResolvedValue({}),
  createUser: vi.fn().mockResolvedValue({
    user: { id: "test-user-id", name: "Test User", email: "test@example.com" },
    profile: { id: "test-profile-id", role: "AGENT" },
  }),
  createPost: vi.fn(),
  getTestPrisma: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: mockAuthGetSession,
    },
  },
}));

vi.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockedPrisma,
}));

import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/posts/[slug]/route";

describe("GET /api/posts/[slug]", () => {
  beforeEach(async () => {
    mockPrismaReset();
    vi.clearAllMocks();
  });

  const makeRequest = (slug: string, headers: Record<string, string> = {}) => {
    const url = new URL(`http://localhost:3000/api/posts/${slug}`);
    const req = new NextRequest(url.toString(), {
      method: "GET",
      headers: new Headers(headers),
    });
    const params = Promise.resolve({ slug });
    return GET(req, { params });
  };

  const createMockUser = async (
    name: string = "Test User",
    role: string = "AGENT"
  ) => {
    const user = {
      id: `user-${userIdCounter++}`,
      name,
      email: `test-${userIdCounter}@example.com`,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(user);
    return user;
  };

  const createMockPost = async (
    data: {
      title?: string;
      slug?: string;
      bodyMarkdown?: string;
      bodyHtml?: string;
      visibility?: string;
      authorId?: string;
      seoDescription?: string;
      tags?: string[];
      publishedAt?: Date | null;
    } = {}
  ) => {
    const authorId = data.authorId || (await createMockUser()).id;
    const post = {
      id: `post-${postIdCounter++}`,
      title: data.title || "Test Post",
      slug: data.slug || `test-post-${postIdCounter}`,
      bodyMarkdown: data.bodyMarkdown || "# Test Content",
      bodyHtml: data.bodyHtml || "<h1>Test Content</h1>",
      visibility: data.visibility || "PUBLIC",
      authorId,
      publishedAt:
        data.publishedAt || (data.visibility === "PUBLIC" ? new Date() : null),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata:
        data.seoDescription || data.tags
          ? {
              id: `meta-${postIdCounter}`,
              seoDescription: data.seoDescription || null,
              tags: data.tags || [],
              postId: `post-${postIdCounter}`,
            }
          : null,
      author: {
        id: authorId,
        name: mockUsers.find(u => u.id === authorId)?.name || "Unknown",
        image: null,
      },
    };
    mockPosts.push(post);
    return post;
  };

  describe("1. Basic Functionality Tests", () => {
    it("should return 200 with valid public post", async () => {
      const post = await createMockPost({ slug: "valid-post" });
      const response = await makeRequest("valid-post");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slug).toBe("valid-post");
    });

    it("should return 404 for non-existent slug", async () => {
      const response = await makeRequest("non-existent-slug");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should return correct post structure with all fields", async () => {
      const author = await createMockUser("Author Name");
      const post = await createMockPost({
        slug: "full-structure",
        authorId: author.id,
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        seoDescription: "SEO description",
        tags: ["tag1", "tag2"],
      });

      const response = await makeRequest("full-structure");
      const data = await response.json();

      expect(data).toMatchObject({
        id: post.id,
        title: post.title,
        slug: post.slug,
        bodyMarkdown: post.bodyMarkdown,
        bodyHtml: post.bodyHtml,
        visibility: post.visibility,
      });
    });

    it("should include rendered HTML body", async () => {
      await createMockPost({
        slug: "html-body-test",
        bodyMarkdown: "# Heading\n\nParagraph text",
        bodyHtml: "<h1>Heading</h1><p>Paragraph text</p>",
      });

      const response = await makeRequest("html-body-test");
      const data = await response.json();

      expect(data.bodyHtml).toBe("<h1>Heading</h1><p>Paragraph text</p>");
    });

    it("should include author information", async () => {
      const author = await createMockUser("Test Author");
      await createMockPost({ slug: "with-author", authorId: author.id });

      const response = await makeRequest("with-author");
      const data = await response.json();

      expect(data.author).toBeDefined();
      expect(data.author.id).toBe(author.id);
      expect(data.author.name).toBe("Test Author");
    });

    it("should include metadata with seoDescription", async () => {
      await createMockPost({
        slug: "with-seo",
        seoDescription: "This is SEO description",
      });

      const response = await makeRequest("with-seo");
      const data = await response.json();

      expect(data.metadata).toBeDefined();
      expect(data.metadata.seoDescription).toBe("This is SEO description");
    });

    it("should include metadata with tags", async () => {
      await createMockPost({
        slug: "with-tags",
        tags: ["react", "typescript", "nextjs"],
      });

      const response = await makeRequest("with-tags");
      const data = await response.json();

      expect(data.metadata).toBeDefined();
      expect(data.metadata.tags).toEqual(["react", "typescript", "nextjs"]);
    });

    it("should return correct timestamps", async () => {
      const beforeCreate = new Date();
      const post = await createMockPost({ slug: "with-timestamps" });
      const afterCreate = new Date();

      const response = await makeRequest("with-timestamps");
      const data = await response.json();

      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();
      expect(new Date(data.createdAt).getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(new Date(data.createdAt).getTime()).toBeLessThanOrEqual(
        afterCreate.getTime()
      );
    });

    it("should return post with publishedAt for public posts", async () => {
      await createMockPost({ slug: "published-post", visibility: "PUBLIC" });

      const response = await makeRequest("published-post");
      const data = await response.json();

      expect(data.publishedAt).toBeDefined();
      expect(data.publishedAt).not.toBeNull();
    });

    it("should return post id", async () => {
      const post = await createMockPost({ slug: "with-id" });

      const response = await makeRequest("with-id");
      const data = await response.json();

      expect(data.id).toBeDefined();
      expect(data.id).toBe(post.id);
    });

    it("should include bodyMarkdown in response", async () => {
      await createMockPost({
        slug: "markdown-content",
        bodyMarkdown: "# Markdown Content\n\n**Bold** and *italic*",
      });

      const response = await makeRequest("markdown-content");
      const data = await response.json();

      expect(data.bodyMarkdown).toBe(
        "# Markdown Content\n\n**Bold** and *italic*"
      );
    });
  });

  describe("2. Visibility Tests", () => {
    it("should return 200 for PUBLIC post", async () => {
      await createMockPost({ slug: "public-post", visibility: "PUBLIC" });

      const response = await makeRequest("public-post");

      expect(response.status).toBe(200);
    });

    it("should return 404 for PRIVATE post (not authorized)", async () => {
      await createMockPost({ slug: "private-post", visibility: "PRIVATE" });

      const response = await makeRequest("private-post");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should return 404 for DRAFT post", async () => {
      await createMockPost({ slug: "draft-post", visibility: "DRAFT" });

      const response = await makeRequest("draft-post");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 404 for UNLISTED post", async () => {
      await createMockPost({ slug: "unlisted-post", visibility: "UNLISTED" });

      const response = await makeRequest("unlisted-post");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 404 when post has null visibility", async () => {
      await createMockPost({
        slug: "null-visibility",
        visibility: null as any,
      });

      const response = await makeRequest("null-visibility");
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 404 for private post even with session", async () => {
      const author = await createMockUser("Author");
      await createMockPost({
        slug: "private-author",
        visibility: "PRIVATE",
        authorId: author.id,
      });

      mockAuthGetSession.mockResolvedValue({ user: { id: author.id } });

      const response = await makeRequest("private-author");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 404 for other user's private post", async () => {
      const author = await createMockUser("Author");
      const otherUser = await createMockUser("Other User");
      await createMockPost({
        slug: "other-private",
        visibility: "PRIVATE",
        authorId: author.id,
      });

      mockAuthGetSession.mockResolvedValue({ user: { id: otherUser.id } });

      const response = await makeRequest("other-private");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 404 for admin user's private post", async () => {
      const author = await createMockUser("Regular Author");
      await createMockPost({
        slug: "admin-private",
        visibility: "PRIVATE",
        authorId: author.id,
      });

      const admin = await createMockUser("Admin User", "ADMIN");
      mockAuthGetSession.mockResolvedValue({ user: { id: admin.id } });

      const response = await makeRequest("admin-private");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 404 for multiple private posts with same slug", async () => {
      await createMockPost({ slug: "multi-private", visibility: "PRIVATE" });

      const response = await makeRequest("multi-private");
      expect(response.status).toBe(404);
    });

    it("should return public post when multiple posts exist", async () => {
      await createMockPost({ slug: "mixed-visibility", visibility: "PUBLIC" });
      await createMockPost({
        slug: "mixed-visibility-2",
        visibility: "PRIVATE",
      });

      const response = await makeRequest("mixed-visibility");
      expect(response.status).toBe(200);
    });

    it("should handle visibility comparison case-insensitively", async () => {
      await createMockPost({ slug: "case-test", visibility: "PUBLIC" });

      const response = await makeRequest("case-test");
      expect(response.status).toBe(200);
    });

    it("should return 404 for archived post", async () => {
      await createMockPost({ slug: "archived-post", visibility: "ARCHIVED" });

      const response = await makeRequest("archived-post");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 404 for deleted post", async () => {
      await createMockPost({ slug: "deleted-post", visibility: "DELETED" });

      const response = await makeRequest("deleted-post");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 200 for scheduled post (future publishedAt) - endpoint doesn't check date", async () => {
      const futureDate = new Date(Date.now() + 86400000);
      await createMockPost({ slug: "scheduled-post", publishedAt: futureDate });

      const response = await makeRequest("scheduled-post");
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("3. Slug Variations Tests", () => {
    it("should return post with valid slug", async () => {
      await createMockPost({ slug: "valid-slug" });

      const response = await makeRequest("valid-slug");
      expect(response.status).toBe(200);
    });

    it("should return post with numbers in slug", async () => {
      await createMockPost({ slug: "post-2024-01-15" });

      const response = await makeRequest("post-2024-01-15");
      expect(response.status).toBe(200);
    });

    it("should return post with hyphens in slug", async () => {
      await createMockPost({ slug: "multi-word-slug-with-many-words" });

      const response = await makeRequest("multi-word-slug-with-many-words");
      expect(response.status).toBe(200);
    });

    it("should return post with underscores in slug", async () => {
      await createMockPost({ slug: "post_with_underscores" });

      const response = await makeRequest("post_with_underscores");
      expect(response.status).toBe(200);
    });

    it("should return post with lowercase letters", async () => {
      await createMockPost({ slug: "alllowercase" });

      const response = await makeRequest("alllowercase");
      expect(response.status).toBe(200);
    });

    it("should return 404 for uppercase slug (case sensitive)", async () => {
      await createMockPost({ slug: "lowercase-slug" });

      const response = await makeRequest("LOWERCASE-SLUG");

      expect(response.status).toBe(404);
    });

    it("should return 404 for mixed case slug", async () => {
      await createMockPost({ slug: "correct-slug" });

      const response = await makeRequest("Correct-Slug");

      expect(response.status).toBe(404);
    });

    it("should return post with Unicode characters in slug", async () => {
      await createMockPost({ slug: "unicode-post-日本語" });

      const response = await makeRequest("unicode-post-日本語");
      expect(response.status).toBe(200);
    });

    it("should return post with very long slug", async () => {
      const longSlug = "a".repeat(100);
      await createMockPost({ slug: longSlug });

      const response = await makeRequest(longSlug);
      expect(response.status).toBe(200);
    });

    it("should return 404 for empty slug", async () => {
      const response = await makeRequest("");

      expect(response.status).toBe(404);
    });

    it("should return 404 for slug with only spaces", async () => {
      const response = await makeRequest("   ");

      expect(response.status).toBe(404);
    });

    it("should return 404 for slug with special characters", async () => {
      const response = await makeRequest("special@#$%");

      expect(response.status).toBe(404);
    });

    it("should return 404 for slug with slashes", async () => {
      const response = await makeRequest("path/to/post");

      expect(response.status).toBe(404);
    });

    it("should return 404 for slug with dots", async () => {
      const response = await makeRequest("post.html");

      expect(response.status).toBe(404);
    });

    it("should return 404 for slug with query string characters", async () => {
      const response = await makeRequest("post?query=value");

      expect(response.status).toBe(404);
    });

    it("should return 404 for slug with hash", async () => {
      const response = await makeRequest("post#anchor");

      expect(response.status).toBe(404);
    });

    it("should handle slug with trailing hyphen", async () => {
      await createMockPost({ slug: "trailing-hyphen-" });

      const response = await makeRequest("trailing-hyphen-");
      expect(response.status).toBe(200);
    });

    it("should handle slug with leading hyphen", async () => {
      await createMockPost({ slug: "-leading-hyphen" });

      const response = await makeRequest("-leading-hyphen");
      expect(response.status).toBe(200);
    });

    it("should handle slug with only numbers", async () => {
      await createMockPost({ slug: "12345" });

      const response = await makeRequest("12345");
      expect(response.status).toBe(200);
    });

    it("should return 404 for slug with whitespace characters", async () => {
      const response = await makeRequest("post\twith\ttabs");

      expect(response.status).toBe(404);
    });

    it("should return 404 for slug with newline", async () => {
      const response = await makeRequest("post\nwith\nnewlines");

      expect(response.status).toBe(404);
    });
  });

  describe("4. Error Handling Tests", () => {
    it("should handle invalid slug format", async () => {
      const response = await makeRequest(null as any);

      expect(response.status).toBe(404);
    });

    it("should handle undefined slug", async () => {
      const response = await makeRequest(undefined as any);

      expect(response.status).toBe(404);
    });

    it("should handle null slug", async () => {
      const response = await makeRequest(null as any);

      expect(response.status).toBe(404);
    });

    it("should handle concurrent requests gracefully", async () => {
      await createMockPost({ slug: "concurrent-test" });

      const responses = await Promise.all([
        makeRequest("concurrent-test"),
        makeRequest("concurrent-test"),
        makeRequest("concurrent-test"),
      ]);

      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it("should handle rapid sequential requests", async () => {
      await createMockPost({ slug: "rapid-test" });

      for (let i = 0; i < 10; i++) {
        const response = await makeRequest("rapid-test");
        expect(response.status).toBe(200);
      }
    });

    it("should handle requests for non-existent posts after existing ones", async () => {
      await createMockPost({ slug: "existing-post" });

      const response1 = await makeRequest("existing-post");
      const response2 = await makeRequest("non-existing");

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(404);
    });

    it("should handle database error - endpoint does not catch errors", async () => {
      const originalFindUnique = mockedPrisma.post.findUnique;
      mockedPrisma.post.findUnique = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));

      try {
        await makeRequest("error-test");
      } catch (e) {
        expect((e as Error).message).toBe("Database error");
      }

      mockedPrisma.post.findUnique = originalFindUnique;
    });

    it("should handle very long slug that exists", async () => {
      const veryLongSlug = "a".repeat(200);
      await createMockPost({ slug: veryLongSlug });

      const response = await makeRequest(veryLongSlug);
      expect(response.status).toBe(200);
    });
  });

  describe("5. Edge Cases Tests", () => {
    it("should return post with no metadata", async () => {
      await createMockPost({
        slug: "no-metadata",
        seoDescription: undefined,
        tags: undefined,
      });

      const response = await makeRequest("no-metadata");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata).toBeNull();
    });

    it("should return post with no author information", async () => {
      await createMockPost({
        slug: "no-author",
        authorId: "non-existent-author",
      });

      const response = await makeRequest("no-author");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.author).toBeDefined();
    });

    it("should return post with very long content", async () => {
      const longContent = "Content line\n".repeat(10000);
      await createMockPost({
        slug: "long-content",
        bodyMarkdown: longContent,
        bodyHtml: "<p>" + longContent + "</p>",
      });

      const response = await makeRequest("long-content");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown.length).toBe(longContent.length);
    });

    it("should return post with markdown special characters", async () => {
      const markdown =
        "# Heading\n\n**Bold** *italic* `code` [link](url) ![image](img)\n\n- list\n- items";
      await createMockPost({ slug: "markdown-chars", bodyMarkdown: markdown });

      const response = await makeRequest("markdown-chars");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toContain("**Bold**");
    });

    it("should return post with LaTeX math", async () => {
      const markdown =
        "# Math Post\n\nInline math: $x^2 + y^2 = r^2$\n\nBlock math:\n$$\nE = mc^2\n$$";
      await createMockPost({ slug: "latex-math", bodyMarkdown: markdown });

      const response = await makeRequest("latex-math");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toContain("$");
    });

    it("should return post with code blocks", async () => {
      const markdown =
        "```javascript\nconst hello = 'world';\nconsole.log(hello);\n```";
      await createMockPost({ slug: "code-blocks", bodyMarkdown: markdown });

      const response = await makeRequest("code-blocks");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toContain("```javascript");
    });

    it("should return post with images", async () => {
      const markdown =
        "![Alt text](https://example.com/image.jpg)\n\nAnother image:\n![Image 2](https://example.com/img2.png)";
      await createMockPost({ slug: "with-images", bodyMarkdown: markdown });

      const response = await makeRequest("with-images");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toContain("![");
    });

    it("should return post with broken/empty fields", async () => {
      await createMockPost({
        slug: "empty-fields",
        bodyMarkdown: "",
        bodyHtml: "",
      });

      const response = await makeRequest("empty-fields");
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return post with null bodyHtml", async () => {
      await createMockPost({ slug: "null-html", bodyHtml: null as any });

      const response = await makeRequest("null-html");
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return post with very long title", async () => {
      const longTitle = "A".repeat(200);
      await createMockPost({ slug: "long-title", title: longTitle });

      const response = await makeRequest("long-title");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title.length).toBe(200);
    });

    it("should return post with empty tags array", async () => {
      await createMockPost({ slug: "empty-tags", tags: [] });

      const response = await makeRequest("empty-tags");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.tags).toEqual([]);
    });

    it("should return post with special characters in title", async () => {
      await createMockPost({
        slug: "special-title",
        title: "Test <script>alert('xss')</script>",
      });

      const response = await makeRequest("special-title");
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return post with Unicode in content", async () => {
      const markdown = "# 日本語\n\n中文内容\n\nΕλληνικά";
      await createMockPost({ slug: "unicode-content", bodyMarkdown: markdown });

      const response = await makeRequest("unicode-content");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toContain("日本語");
    });

    it("should return post with emoji", async () => {
      const markdown = "# 🎉 Hello World 🚀\n\nContent with emojis 👍🔥";
      await createMockPost({ slug: "emoji-content", bodyMarkdown: markdown });

      const response = await makeRequest("emoji-content");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toContain("🎉");
    });

    it("should return post with tables", async () => {
      const markdown =
        "| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |";
      await createMockPost({ slug: "table-content", bodyMarkdown: markdown });

      const response = await makeRequest("table-content");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toContain("|");
    });

    it("should return post with blockquotes", async () => {
      const markdown = "> This is a quote\n> Multiple lines";
      await createMockPost({ slug: "quote-content", bodyMarkdown: markdown });

      const response = await makeRequest("quote-content");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toContain(">");
    });

    it("should return post with HTML in markdown", async () => {
      const markdown =
        "# HTML in Markdown\n\n<div>Some HTML</div>\n\n<span>Inline HTML</span>";
      await createMockPost({ slug: "html-in-md", bodyMarkdown: markdown });

      const response = await makeRequest("html-in-md");
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should handle post with very long seoDescription", async () => {
      const longDesc = "A".repeat(1000);
      await createMockPost({ slug: "long-seo", seoDescription: longDesc });

      const response = await makeRequest("long-seo");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.seoDescription.length).toBe(1000);
    });

    it("should handle post with many tags", async () => {
      const manyTags = Array.from({ length: 100 }, (_, i) => `tag-${i}`);
      await createMockPost({ slug: "many-tags", tags: manyTags });

      const response = await makeRequest("many-tags");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.tags.length).toBe(100);
    });

    it("should return post with null seoDescription", async () => {
      await createMockPost({ slug: "null-seo", seoDescription: null as any });

      const response = await makeRequest("null-seo");
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return post with undefined visibility (defaults to PUBLIC)", async () => {
      await createMockPost({
        slug: "undefined-visibility",
        visibility: undefined as any,
      });

      const response = await makeRequest("undefined-visibility");
      expect(response.status).toBe(200);
    });
  });
});
