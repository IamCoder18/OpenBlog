const {
  mockGetSession: mockAuthGetSession,
  mockHeaders,
  MockNextRequest,
  MockNextResponse,
} = vi.hoisted(() => {
  class NextRequest {
    url: string;
    constructor(url: string, init?: any) {
      this.url = url;
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

let mockPosts: any[] = [];
let mockUsers: any[] = [];
let postIdCounter = 1;
let userIdCounter = 1;

function resetMockData() {
  mockPosts = [];
  mockUsers = [];
  postIdCounter = 1;
  userIdCounter = 1;
}

const { mockedPrisma } = vi.hoisted(() => {
  const prisma = {
    post: {
      findMany: vi.fn(async (options: any) => {
        let results = mockPosts.filter(p => p.visibility === "PUBLIC");

        const orderBy = options?.orderBy;
        const hasPublishedAsc =
          orderBy?.publishedAt === "asc" ||
          (Array.isArray(orderBy) &&
            orderBy.some((o: any) => o.publishedAt === "asc"));

        if (hasPublishedAsc) {
          results.sort((a, b) => {
            const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
            if (dateA - dateB !== 0) return dateA - dateB;
            // Secondary sort by createdAt asc for determinism
            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return createdA - createdB;
          });
        }

        const skip = options?.skip || 0;
        let take = options?.take;
        if (take === undefined || take === null) {
          take = 10;
        }

        if (take <= 0) {
          return [];
        }

        const posts = results.slice(skip, skip + take);

        return posts.map(post => ({
          ...post,
          author: options?.include?.author
            ? {
                id: post.authorId,
                name:
                  mockUsers.find(u => u.id === post.authorId)?.name ||
                  "Unknown",
                image:
                  mockUsers.find(u => u.id === post.authorId)?.image || null,
              }
            : undefined,
        }));
      }),
      count: vi.fn(async () => {
        return mockPosts.filter(p => p.visibility === "PUBLIC").length;
      }),
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
        };
        mockPosts.push(post);
        return post;
      }),
      deleteMany: vi.fn(async () => {
        const length = mockPosts.length;
        mockPosts = [];
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
      findUnique: vi.fn(async (options: any) => {
        return mockUsers.find(u => u.id === options?.where?.id) || null;
      }),
      deleteMany: vi.fn(async () => {
        const length = mockUsers.length;
        mockUsers = [];
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

  return { mockedPrisma: prisma };
});

vi.mock("../utils/test-utils", () => ({
  setupTestDatabase: vi.fn().mockResolvedValue({}),
  cleanupDatabase: vi.fn().mockResolvedValue({}),
  createUser: vi.fn().mockImplementation(async (data: any = {}) => {
    const uid = `user-${userIdCounter++}`;
    const user = {
      id: uid,
      name: data.name || "Test User",
      email: data.email || `test-${uid}@example.com`,
      image: data.image || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(user);
    return {
      user,
      profile: {
        id: `profile-${uid}`,
        role: data.role || "AGENT",
        userId: uid,
      },
    };
  }),
  createPost: vi.fn().mockImplementation(async (data: any = {}) => {
    const authorId = data.authorId || mockUsers[0]?.id || "default-user";
    const pid = `post-${postIdCounter++}`;
    const post = {
      id: pid,
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
              id: `meta-${pid}`,
              seoDescription: data.seoDescription || null,
              tags: data.tags || [],
              postId: pid,
            }
          : null,
    };
    mockPosts.push(post);
    return post;
  }),
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

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/posts/route";

describe("GET /api/posts", () => {
  beforeAll(async () => {
    const { setupTestDatabase } = await import("../utils/test-utils");
    await setupTestDatabase();
  });

  beforeEach(async () => {
    resetMockData();
    vi.clearAllMocks();
  });

  const makeRequest = (queryParams: Record<string, string> = {}) => {
    const url = new URL("http://localhost:3000/api/posts");
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    const req = new NextRequest(url.toString(), {
      headers: new Headers({ "content-type": "application/json" }),
    });
    return GET(req);
  };

  describe("1. Basic Functionality", () => {
    it("should return 200 OK with empty array when no posts exist", async () => {
      const response = await makeRequest();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should return only PUBLIC posts (not PRIVATE)", async () => {
      const { createUser, createPost } = await import("../utils/test-utils");
      const user = await createUser();

      await createPost({
        authorId: user.user.id,
        title: "Public Post",
        visibility: "PUBLIC",
      });

      await createPost({
        authorId: user.user.id,
        title: "Private Post",
        visibility: "PRIVATE",
      });

      const response = await makeRequest();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBe(1);
      expect(data.posts[0].visibility).toBe("PUBLIC");
    });

    it("should return posts ordered by publishedAt ascending", async () => {
      const { createUser, createPost } = await import("../utils/test-utils");
      const user = await createUser();

      const post1 = await createPost({
        authorId: user.user.id,
        title: "First Post",
        visibility: "PUBLIC",
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const post2 = await createPost({
        authorId: user.user.id,
        title: "Second Post",
        visibility: "PUBLIC",
      });

      const response = await makeRequest();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts[0].id).toBe(post1.id);
      expect(data.posts[1].id).toBe(post2.id);
    });

    it("should include author information", async () => {
      const { createUser, createPost } = await import("../utils/test-utils");
      const user = await createUser({
        name: "Test Author",
        image: "https://example.com/image.jpg",
      });

      await createPost({
        authorId: user.user.id,
        title: "Author Test Post",
        visibility: "PUBLIC",
      });

      const response = await makeRequest();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts[0].author).toBeDefined();
    });

    it("should return correct total count", async () => {
      const { createUser, createPost } = await import("../utils/test-utils");
      const user = await createUser();

      await createPost({ authorId: user.user.id, visibility: "PUBLIC" });
      await createPost({ authorId: user.user.id, visibility: "PUBLIC" });
      await createPost({ authorId: user.user.id, visibility: "PRIVATE" });

      const response = await makeRequest();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(2);
    });
  });

  describe("2. Pagination Tests", () => {
    it("should use default pagination (limit=10, offset=0)", async () => {
      const { createUser, createPost } = await import("../utils/test-utils");
      const user = await createUser();

      for (let i = 0; i < 15; i++) {
        await createPost({ authorId: user.user.id, visibility: "PUBLIC" });
      }

      const response = await makeRequest();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBe(10);
      expect(data.total).toBe(15);
    });

    it("should skip first post with offset=1", async () => {
      const { createUser, createPost } = await import("../utils/test-utils");
      const user = await createUser();

      const post1 = await createPost({
        authorId: user.user.id,
        visibility: "PUBLIC",
      });
      await createPost({ authorId: user.user.id, visibility: "PUBLIC" });

      const response = await makeRequest({ offset: "1" });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBe(1);
      expect(data.posts[0].id).not.toBe(post1.id);
    });
  });

  describe("3. Error Handling", () => {
    it("should handle malformed URL parameters", async () => {
      const url = new URL("http://localhost:3000/api/posts");
      url.searchParams.set("limit", "%");

      const req = new NextRequest(url.toString());
      const response = await GET(req);

      expect(response.status).toBe(200);
    });

    it("should return valid JSON response", async () => {
      const response = await makeRequest();

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );

      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    });
  });
});
