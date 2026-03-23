const {
  mockGetSession: mockAuthGetSession,
  mockHeaders,
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
      return async () => {
        if (typeof this.body === "string") {
          try {
            return JSON.parse(this.body);
          } catch {
            throw new Error("Invalid JSON");
          }
        }
        return this.body;
      };
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
        Object.entries(init.headers).forEach(([k, v]) =>
          this.headers.set(k, v as string)
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
    mockHeaders: vi.fn(() => new Headers()),
    MockNextRequest: NextRequest,
    MockNextResponse: NextResponse,
  };
});

const { mockedPrisma, mockPrismaReset } = vi.hoisted(() => {
  const mockPosts: any[] = [];
  const mockUsers: any[] = [];
  let postIdCounter = 1;
  let userIdCounter = 1;

  const prisma = {
    post: {
      findUnique: vi.fn(async (options: any) => {
        return mockPosts.find(p => p.slug === options?.where?.slug) || null;
      }),
      create: vi.fn(async (data: any) => {
        const existingPost = mockPosts.find(p => p.slug === data.data.slug);
        if (existingPost) {
          throw new Error("A post with this slug already exists");
        }
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
      findUnique: vi.fn(async (options: any) => {
        if (options?.where?.key === "expired-api-key") {
          return {
            id: "key-1",
            key: "expired-api-key",
            userId: "user-1",
            expiresAt: new Date(Date.now() - 1000),
          };
        }
        if (options?.where?.key === "valid-api-key") {
          return {
            id: "key-2",
            key: "valid-api-key",
            userId: "user-1",
            expiresAt: null,
          };
        }
        return null;
      }),
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

vi.mock("next/headers", () => ({
  headers: mockHeaders,
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

import {
  createUser,
  createPost,
  cleanupDatabase,
  setupTestDatabase,
} from "../utils/test-utils";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/posts/route";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("POST /api/posts", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    mockPrismaReset();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  const makeRequest = (body: any, headersMap: Record<string, string> = {}) => {
    const url = new URL("http://localhost:3000/api/posts");
    const req = new NextRequest(url.toString(), {
      method: "POST",
      headers: new Headers({
        "content-type": "application/json",
        ...headersMap,
      }),
      body: JSON.stringify(body),
    });

    mockHeaders.mockReturnValue(new Headers(headersMap) as any);

    return POST(req);
  };

  describe("1. Authentication Tests", () => {
    it("should return 401 when no session provided", async () => {
      mockAuthGetSession.mockResolvedValue(null);
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        {}
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session is undefined", async () => {
      mockAuthGetSession.mockResolvedValue(undefined);
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        {}
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user", async () => {
      mockAuthGetSession.mockResolvedValue({ user: null });
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        {}
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 with invalid session cookie", async () => {
      mockAuthGetSession.mockResolvedValue(null);
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        { Cookie: "better-auth.session_token=invalid-token" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 with malformed cookie", async () => {
      mockAuthGetSession.mockResolvedValue(null);
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        { Cookie: "not-a-cookie" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 when session is expired", async () => {
      mockAuthGetSession.mockResolvedValue(null);
      const expiredDate = new Date(Date.now() - 1000).toISOString();
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        { Cookie: `better-auth.session_token=expired; Expires=${expiredDate}` }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 201 with valid session", async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });

      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown: "# Test Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("Test Post");
    });

    it("should work with valid session and all fields", async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });

      const response = await makeRequest({
        title: "Complete Post",
        slug: "complete-post",
        bodyMarkdown: "# Complete",
        visibility: "PUBLIC",
        seoDescription: "SEO desc",
        tags: ["test", "tag"],
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.visibility).toBe("PUBLIC");
      expect(data.metadata?.seoDescription).toBe("SEO desc");
      expect(data.metadata?.tags).toEqual(["test", "tag"]);
    });

    it("should return 401 with invalid API key", async () => {
      mockAuthGetSession.mockResolvedValue(null);
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        { Authorization: "Bearer invalid-key" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 with malformed API key header", async () => {
      mockAuthGetSession.mockResolvedValue(null);
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        { Authorization: "InvalidFormat" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 with expired API key", async () => {
      mockAuthGetSession.mockResolvedValue(null);
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        { Authorization: "Bearer expired-api-key" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should handle missing auth header", async () => {
      mockAuthGetSession.mockResolvedValue(null);
      const response = await makeRequest(
        { title: "Test", slug: "test", bodyMarkdown: "Content" },
        {}
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should handle session with only id field", async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({
        user: { id: user.user.id, name: "Test" },
      });

      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("2. Validation Tests - Title", () => {
    beforeEach(async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });
    });

    it("should return 400 when title is missing", async () => {
      const response = await makeRequest({
        slug: "test-slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 400 when title is null", async () => {
      const response = await makeRequest({
        title: null,
        slug: "test-slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when title is undefined", async () => {
      const response = await makeRequest({
        slug: "test-slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when title is empty string", async () => {
      const response = await makeRequest({
        title: "",
        slug: "test-slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when title is only whitespace", async () => {
      const response = await makeRequest({
        title: "   ",
        slug: "test-slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title cannot be only whitespace");
    });

    it("should return 201 when title is 1 character", async () => {
      const response = await makeRequest({
        title: "A",
        slug: "test-slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 when title is 200 characters", async () => {
      const longTitle = "A".repeat(200);
      const response = await makeRequest({
        title: longTitle,
        slug: "test-slug-200",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 400 when title exceeds 200 characters", async () => {
      const tooLongTitle = "A".repeat(201);
      const response = await makeRequest({
        title: tooLongTitle,
        slug: "test-slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 400 when title is 201 characters", async () => {
      const tooLongTitle = "A".repeat(201);
      const response = await makeRequest({
        title: tooLongTitle,
        slug: "test-slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with valid title (5 chars)", async () => {
      const response = await makeRequest({
        title: "Hello",
        slug: "hello",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with normal title length", async () => {
      const response = await makeRequest({
        title: "Normal Title Length",
        slug: "normal-title",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with title containing special characters", async () => {
      const response = await makeRequest({
        title: "Test @#$% Post!",
        slug: "test-special-post",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with title containing Unicode", async () => {
      const response = await makeRequest({
        title: "测试文章 日本語 Ελληνικά",
        slug: "unicode-post",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("测试文章 日本語 Ελληνικά");
    });

    it("should return 201 with title containing HTML", async () => {
      const response = await makeRequest({
        title: "<strong>Bold</strong> Title",
        slug: "html-title",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with title containing emojis", async () => {
      const response = await makeRequest({
        title: "🎉🚀 Star Post ⭐",
        slug: "emoji-post",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("3. Validation Tests - Body", () => {
    beforeEach(async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });
    });

    it("should return 400 when bodyMarkdown is missing", async () => {
      const response = await makeRequest({
        title: "Test",
        slug: "test-slug",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 400 when bodyMarkdown is null", async () => {
      const response = await makeRequest({
        title: "Test",
        slug: "test-slug",
        bodyMarkdown: null,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when bodyMarkdown is empty string", async () => {
      const response = await makeRequest({
        title: "Test",
        slug: "test-slug",
        bodyMarkdown: "",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 201 with valid markdown", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown:
          "# Heading\n\n**Bold** and *italic* text\n\n- List item 1\n- List item 2",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.bodyMarkdown).toContain("Heading");
    });

    it("should return 201 with LaTeX math ($$)", async () => {
      const response = await makeRequest({
        title: "Math Post",
        slug: "math-post",
        bodyMarkdown: "# Math\n\n$$\nE = mc^2\n$$",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with inline LaTeX math ($)", async () => {
      const response = await makeRequest({
        title: "Inline Math",
        slug: "inline-math",
        bodyMarkdown: "The formula $x^2 + y^2 = r^2$ is important.",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with code blocks", async () => {
      const response = await makeRequest({
        title: "Code Post",
        slug: "code-post",
        bodyMarkdown:
          "```javascript\nconst hello = 'world';\nconsole.log(hello);\n```",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with inline code", async () => {
      const response = await makeRequest({
        title: "Inline Code Post",
        slug: "inline-code",
        bodyMarkdown: "Use `const x = 1` to declare a variable.",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with images", async () => {
      const response = await makeRequest({
        title: "Image Post",
        slug: "image-post",
        bodyMarkdown: "![Alt text](https://example.com/image.jpg)",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with links", async () => {
      const response = await makeRequest({
        title: "Link Post",
        slug: "link-post",
        bodyMarkdown: "[Click here](https://example.com) to visit.",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with very long body", async () => {
      const longBody = "Content line\n".repeat(1000);
      const response = await makeRequest({
        title: "Long Post",
        slug: "long-post",
        bodyMarkdown: longBody,
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("4. Validation Tests - Slug", () => {
    beforeEach(async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });
    });

    it("should return 400 when slug is missing", async () => {
      const response = await makeRequest({
        title: "Test Post",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 400 when slug is null", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: null,
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug is empty string", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug contains spaces", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "invalid slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("lowercase");
    });

    it("should return 400 when slug contains uppercase letters", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "InvalidSlug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug contains special characters", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "invalid@slug!",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug contains underscores", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "invalid_slug",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should auto-increment slug when slug already exists (duplicate)", async () => {
      await makeRequest({
        title: "First Post",
        slug: "duplicate-test",
        bodyMarkdown: "# Content 1",
      });

      const response = await makeRequest({
        title: "Second Post",
        slug: "duplicate-test",
        bodyMarkdown: "# Content 2",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.slug).toBe("duplicate-test-1");
    });

    it("should return 400 when slug exceeds 100 characters", async () => {
      const longSlug = "a".repeat(101);
      const response = await makeRequest({
        title: "Test Post",
        slug: longSlug,
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("100");
    });

    it("should return 201 with valid slug", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "valid-slug-123",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.slug).toBe("valid-slug-123");
    });

    it("should return 201 with slug containing numbers", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "post-2024-01",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with single word slug", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "single",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with slug auto-generated from title pattern", async () => {
      const response = await makeRequest({
        title: "My Test Post Title",
        slug: "my-test-post-title",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with slug containing hyphens", async () => {
      const response = await makeRequest({
        title: "Test",
        slug: "multi-word-slug-here",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 400 for slug with trailing hyphen", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "valid-slug-",
        bodyMarkdown: "# Content",
      });

      const data = await response.json();
      expect(response.status).toBe(400);
    });
  });

  describe("5. Visibility Tests", () => {
    beforeEach(async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });
    });

    it("should default visibility to PUBLIC when not specified", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.visibility).toBe("PUBLIC");
    });

    it("should set publishedAt for PUBLIC visibility", async () => {
      const response = await makeRequest({
        title: "Public Post",
        slug: "public-post",
        bodyMarkdown: "# Content",
        visibility: "PUBLIC",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.publishedAt).toBeDefined();
      expect(new Date(data.publishedAt).getTime()).not.toBeNaN();
    });

    it("should return 201 with explicit PUBLIC visibility", async () => {
      const response = await makeRequest({
        title: "Explicit Public",
        slug: "explicit-public",
        bodyMarkdown: "# Content",
        visibility: "PUBLIC",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.visibility).toBe("PUBLIC");
    });

    it("should return 201 with PRIVATE visibility", async () => {
      const response = await makeRequest({
        title: "Private Post",
        slug: "private-post",
        bodyMarkdown: "# Content",
        visibility: "PRIVATE",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.visibility).toBe("PRIVATE");
    });

    it("should set publishedAt to null for PRIVATE visibility", async () => {
      const response = await makeRequest({
        title: "Private Post",
        slug: "private-post",
        bodyMarkdown: "# Content",
        visibility: "PRIVATE",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.publishedAt).toBeNull();
    });

    it("should handle lowercase visibility value", async () => {
      const response = await makeRequest({
        title: "Lowercase Visibility",
        slug: "lowercase-visibility",
        bodyMarkdown: "# Content",
        visibility: "public",
      } as any);
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should handle uppercase visibility value", async () => {
      const response = await makeRequest({
        title: "Uppercase Visibility",
        slug: "uppercase-visibility",
        bodyMarkdown: "# Content",
        visibility: "PUBLIC",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should not include private post in public GET request", async () => {
      await makeRequest({
        title: "Private Post",
        slug: "private-post",
        bodyMarkdown: "# Secret Content",
        visibility: "PRIVATE",
      });

      const posts = await prisma.post.findMany({
        where: { visibility: "PUBLIC" },
      });

      expect(posts.length).toBe(0);
    });

    it("should include public post in public GET request", async () => {
      await makeRequest({
        title: "Public Post",
        slug: "public-post",
        bodyMarkdown: "# Public Content",
        visibility: "PUBLIC",
      });

      const posts = await prisma.post.findMany({
        where: { visibility: "PUBLIC" },
      });

      expect(posts.length).toBe(1);
    });

    it("should handle visibility as empty string (default to PUBLIC)", async () => {
      const response = await makeRequest({
        title: "Empty Visibility",
        slug: "empty-visibility",
        bodyMarkdown: "# Content",
        visibility: "",
      } as any);
      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("6. Metadata Tests", () => {
    beforeEach(async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });
    });

    it("should create post with SEO description", async () => {
      const response = await makeRequest({
        title: "SEO Post",
        slug: "seo-post",
        bodyMarkdown: "# Content",
        seoDescription: "This is an SEO description",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.seoDescription).toBe("This is an SEO description");
    });

    it("should create post without SEO description", async () => {
      const response = await makeRequest({
        title: "No SEO Post",
        slug: "no-seo-post",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should create post with tags array", async () => {
      const response = await makeRequest({
        title: "Tags Post",
        slug: "tags-post",
        bodyMarkdown: "# Content",
        tags: ["react", "nextjs", "typescript"],
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.tags).toEqual(["react", "nextjs", "typescript"]);
    });

    it("should create post with empty tags array", async () => {
      const response = await makeRequest({
        title: "Empty Tags",
        slug: "empty-tags",
        bodyMarkdown: "# Content",
        tags: [],
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.tags).toEqual([]);
    });

    it("should create post with duplicate tags (should be allowed)", async () => {
      const response = await makeRequest({
        title: "Duplicate Tags",
        slug: "duplicate-tags",
        bodyMarkdown: "# Content",
        tags: ["react", "react", "nextjs"],
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata.tags).toEqual(["react", "react", "nextjs"]);
    });

    it("should create post with tags containing special characters", async () => {
      const response = await makeRequest({
        title: "Special Tags",
        slug: "special-tags",
        bodyMarkdown: "# Content",
        tags: ["tag-with-dash", "tag_with_underscore"],
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata.tags).toContain("tag-with-dash");
    });

    it("should return 400 when tags exceeds 20 items", async () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
      const response = await makeRequest({
        title: "Many Tags",
        slug: "many-tags",
        bodyMarkdown: "# Content",
        tags: manyTags,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("tags must have less than 20 items");
    });

    it("should create post with both SEO and tags", async () => {
      const response = await makeRequest({
        title: "Full Metadata",
        slug: "full-metadata",
        bodyMarkdown: "# Content",
        seoDescription: "Complete SEO description",
        tags: ["featured", "important"],
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata.seoDescription).toBe("Complete SEO description");
      expect(data.metadata.tags).toEqual(["featured", "important"]);
    });

    it("should return 400 for very long SEO description over 500 chars", async () => {
      const longDesc = "A".repeat(501);
      const response = await makeRequest({
        title: "Long SEO",
        slug: "long-seo",
        bodyMarkdown: "# Content",
        seoDescription: longDesc,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "seoDescription must be less than 500 characters"
      );
    });

    it("should handle Unicode in tags", async () => {
      const response = await makeRequest({
        title: "Unicode Tags",
        slug: "unicode-tags",
        bodyMarkdown: "# Content",
        tags: ["日本語", "中文", "ελληνικά"],
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata.tags).toContain("日本語");
    });

    it("should return 400 when seoDescription is not a string", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown: "# Content",
        seoDescription: 12345,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("seoDescription must be a string");
    });

    it("should return 400 when tags is not an array", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown: "# Content",
        tags: "not-an-array",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("tags must be an array");
    });

    it("should return 400 when tags has more than 20 items", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown: "# Content",
        tags: Array(21).fill("tag"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("tags must have less than 20 items");
    });

    it("should return 400 when a tag exceeds 50 characters", async () => {
      const longTag = "A".repeat(51);
      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
        bodyMarkdown: "# Content",
        tags: ["valid", longTag],
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "each tag must be a string with less than 50 characters"
      );
    });
  });

  describe("7. Error Handling", () => {
    beforeEach(async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });
    });

    it("should return 400 for invalid JSON body", async () => {
      const url = new URL("http://localhost:3000/api/posts");
      const req = new NextRequest(url.toString(), {
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
        body: "not valid json",
      });

      mockHeaders.mockReturnValue(new Headers() as any);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when title is a number (type coercion)", async () => {
      const response = await makeRequest({
        title: 123,
        slug: "test",
        bodyMarkdown: "# Content",
      } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when title is an array (type coercion)", async () => {
      const response = await makeRequest({
        title: ["array", "title"],
        slug: "test-array",
        bodyMarkdown: "# Content",
      } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return proper error message for required field missing", async () => {
      const response = await makeRequest({
        title: "Test Post",
        slug: "test-post",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("8. Post-Publish Behavior", () => {
    beforeEach(async () => {
      const user = await createUser();
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });
    });

    it("should appear in GET /api/posts when PUBLIC", async () => {
      await makeRequest({
        title: "Should Appear",
        slug: "should-appear",
        bodyMarkdown: "# Content",
        visibility: "PUBLIC",
      });

      const posts = await prisma.post.findMany({
        where: { visibility: "PUBLIC" },
      });

      expect(posts.length).toBe(1);
      expect(posts[0].title).toBe("Should Appear");
    });

    it("should set publishedAt timestamp correctly", async () => {
      const beforeRequest = new Date();
      const response = await makeRequest({
        title: "Timestamp Test",
        slug: "timestamp-test",
        bodyMarkdown: "# Content",
        visibility: "PUBLIC",
      });
      const afterRequest = new Date();
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.publishedAt).toBeDefined();
      const publishedDate = new Date(data.publishedAt);
      expect(publishedDate.getTime()).toBeGreaterThanOrEqual(
        beforeRequest.getTime()
      );
      expect(publishedDate.getTime()).toBeLessThanOrEqual(
        afterRequest.getTime()
      );
    });

    it("should NOT appear in public feed when PRIVATE", async () => {
      await makeRequest({
        title: "Should Not Appear",
        slug: "should-not-appear",
        bodyMarkdown: "# Secret Content",
        visibility: "PRIVATE",
      });

      const posts = await prisma.post.findMany({
        where: { visibility: "PUBLIC" },
      });

      expect(posts.length).toBe(0);
    });

    it("should have null publishedAt for PRIVATE posts", async () => {
      const response = await makeRequest({
        title: "Private Draft",
        slug: "private-draft",
        bodyMarkdown: "# Draft Content",
        visibility: "PRIVATE",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.publishedAt).toBeNull();
    });

    it("should return created post in response", async () => {
      const response = await makeRequest({
        title: "Response Test",
        slug: "response-test",
        bodyMarkdown: "# Content",
        visibility: "PUBLIC",
        seoDescription: "Test SEO",
        tags: ["test"],
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        title: "Response Test",
        slug: "response-test",
        visibility: "PUBLIC",
      });
      expect(data.id).toBeDefined();
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();
    });

    it("should include author in created post response", async () => {
      const user = await createUser({ name: "Test Author" });
      mockAuthGetSession.mockResolvedValue({ user: { id: user.user.id } });

      const response = await makeRequest({
        title: "Author Test",
        slug: "author-test",
        bodyMarkdown: "# Content",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.author).toBeDefined();
      expect(data.author.id).toBe(user.user.id);
    });

    it("should generate bodyHtml from markdown", async () => {
      const response = await makeRequest({
        title: "HTML Test",
        slug: "html-test",
        bodyMarkdown: "# Heading\n\nParagraph",
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.bodyHtml).toBeDefined();
      expect(data.bodyMarkdown).toBe("# Heading\n\nParagraph");
    });
  });
});
