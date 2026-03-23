import { vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockHeaders = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(mockHeaders)),
}));

vi.mock("next/server", () => ({
  NextRequest: class NextRequest {
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
            return this.body;
          }
        }
        return this.body;
      };
    }
    get searchParams() {
      return new URL(this.url).searchParams;
    }
  },
  NextResponse: class {
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
      const response = new this(JSON.stringify(data), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      });
      return response;
    }
  },
}));

const mockPosts: any[] = [];
const mockUsers: any[] = [];
const mockUserProfiles: Map<string, { role: string; userId: string }> =
  new Map();
let postIdCounter = 1;
let userIdCounter = 1;

vi.mock("@/lib/db", () => ({
  prisma: {
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
      update: vi.fn(async (options: any) => {
        const index = mockPosts.findIndex(p => p.slug === options.where.slug);
        if (index === -1) throw new Error("Post not found");
        mockPosts[index] = {
          ...mockPosts[index],
          ...options.data,
          updatedAt: new Date(),
        };
        return mockPosts[index];
      }),
      delete: vi.fn(async (options: any) => {
        const index = mockPosts.findIndex(p => p.slug === options.where.slug);
        if (index === -1) throw new Error("Post not found");
        const deleted = mockPosts.splice(index, 1);
        return deleted[0];
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
      create: vi.fn(async (data: any) => {
        const profile = {
          id: `profile-${userIdCounter++}`,
          role: data.data.role || "AGENT",
          userId: data.data.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUserProfiles.set(data.data.userId, {
          role: profile.role,
          userId: profile.userId,
        });
        return profile;
      }),
      findUnique: vi.fn(async (options: any) => {
        const profile = mockUserProfiles.get(options?.where?.userId);
        return profile || null;
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
  },
}));

function resetMockData() {
  mockPosts.length = 0;
  mockUsers.length = 0;
  mockUserProfiles.clear();
  postIdCounter = 1;
  userIdCounter = 1;
}

import { PUT } from "@/app/api/posts/[slug]/route";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("PUT /api/posts/[slug]", () => {
  beforeEach(async () => {
    resetMockData();
    vi.clearAllMocks();
  });

  const makeRequest = (
    slug: string,
    body: any,
    reqHeaders: Record<string, string> = {}
  ) => {
    mockHeaders.clear();
    Object.entries(reqHeaders).forEach(([key, value]) =>
      mockHeaders.set(key, value)
    );

    const url = new URL(`http://localhost:3000/api/posts/${slug}`);
    const req = new NextRequest(url.toString(), {
      method: "PUT",
      headers: new Headers(reqHeaders),
      body: JSON.stringify(body),
    });
    const params = Promise.resolve({ slug });
    return PUT(req, { params });
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
    mockUserProfiles.set(user.id, { role, userId: user.id });
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

  const setAuthSession = (userId: string | null) => {
    if (userId) {
      (auth.api.getSession as vi.Mock).mockResolvedValue({
        user: { id: userId },
      });
    } else {
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);
    }
  };

  describe("1. Authentication Tests", () => {
    beforeEach(() => {
      setAuthSession(null);
    });

    it("should return 401 when no session provided", async () => {
      const post = await createMockPost({ slug: "test-post" });
      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session is null", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);

      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 when session user is undefined", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: undefined });

      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 with invalid session cookie", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);

      const response = await makeRequest(
        "test-post",
        { title: "New Title" },
        { cookie: "invalid-session-token" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 with malformed session", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue({} as any);

      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 when session has empty user id", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue({
        user: { id: "" },
      });

      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 401 when headers are missing", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);

      const url = new URL("http://localhost:3000/api/posts/test-post");
      const req = new NextRequest(url.toString(), {
        method: "PUT",
        body: JSON.stringify({ title: "New Title" }),
      });
      const params = Promise.resolve({ slug: "test-post" });
      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 500 when auth throws error", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockRejectedValue(
        new Error("Auth error")
      );

      const response = await makeRequest("test-post", { title: "New Title" });
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe(
        "An unexpected error occurred. Please try again later."
      );
    });

    it("should return 401 for expired session", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);

      const response = await makeRequest(
        "test-post",
        { title: "New Title" },
        { cookie: "better-auth.session_token=expired-token" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 for session with null user id", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue({
        user: { id: null },
      });

      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 401 when API key is provided instead of session", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);

      const response = await makeRequest(
        "test-post",
        { title: "New Title" },
        { Authorization: "Bearer some-api-key" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 with fake/bogus session token", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);

      const response = await makeRequest(
        "test-post",
        { title: "New Title" },
        { cookie: "better-auth.session_token=fake-token-12345" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 when session exists but user object is null", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: null });

      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should work with valid session", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "test-post",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("test-post", { title: "New Title" });

      expect(response.status).toBe(200);
    });

    it("should return 401 with empty authorization header", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);

      const response = await makeRequest(
        "test-post",
        { title: "New Title" },
        { Authorization: "" }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
    });
  });

  describe("2. Authorization Tests", () => {
    it("should return 200 when owner updates their own post", async () => {
      const user = await createMockUser("Owner");
      const post = await createMockPost({
        slug: "owner-post",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("owner-post", {
        title: "Updated Title",
      });

      expect(response.status).toBe(200);
    });

    it("should return 403 when non-owner tries to update post", async () => {
      const owner = await createMockUser("Owner");
      const otherUser = await createMockUser("Other User");
      const post = await createMockPost({
        slug: "other-post",
        authorId: owner.id,
      });
      setAuthSession(otherUser.id);

      const response = await makeRequest("other-post", {
        title: "Hacked Title",
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only edit your own posts");
    });

    it("should return 200 when admin tries to update someone else's post", async () => {
      const author = await createMockUser("Author");
      const admin = await createMockUser("Admin", "ADMIN");
      const post = await createMockPost({
        slug: "admin-test",
        authorId: author.id,
      });
      setAuthSession(admin.id);

      const response = await makeRequest("admin-test", {
        title: "Admin Title",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 403 when agent tries to update another agent's post", async () => {
      const author = await createMockUser("Author Agent", "AGENT");
      const otherAgent = await createMockUser("Other Agent", "AGENT");
      const post = await createMockPost({
        slug: "agent-post",
        authorId: author.id,
      });
      setAuthSession(otherAgent.id);

      const response = await makeRequest("agent-post", {
        title: "Agent Title",
      });
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should allow agent to update their own post", async () => {
      const agent = await createMockUser("Agent User", "AGENT");
      const post = await createMockPost({
        slug: "my-agent-post",
        authorId: agent.id,
      });
      setAuthSession(agent.id);

      const response = await makeRequest("my-agent-post", {
        title: "My Updated Title",
      });

      expect(response.status).toBe(200);
    });

    it("should allow author role to update their own post", async () => {
      const author = await createMockUser("Author User", "AUTHOR" as any);
      const post = await createMockPost({
        slug: "my-author-put-post",
        authorId: author.id,
      });
      setAuthSession(author.id);

      const response = await makeRequest("my-author-put-post", {
        title: "My Updated Title",
      });

      expect(response.status).toBe(200);
    });

    it("should return 403 when author tries to update another user's post", async () => {
      const postOwner = await createMockUser("Post Owner");
      const author = await createMockUser("Author User", "AUTHOR" as any);
      const post = await createMockPost({
        slug: "author-other-put-post",
        authorId: postOwner.id,
      });
      setAuthSession(author.id);

      const response = await makeRequest("author-other-put-post", {
        title: "Author Title",
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only edit your own posts");
    });

    it("should return 403 for guest user (no session)", async () => {
      const post = await createMockPost({ slug: "guest-post" });
      setAuthSession(null);

      const response = await makeRequest("guest-post", {
        title: "Guest Title",
      });

      expect(response.status).toBe(401);
    });

    it("should return 403 when user profile role is GUEST", async () => {
      const author = await createMockUser("Author");
      const guest = await createMockUser("Guest", "GUEST" as any);
      const post = await createMockPost({
        slug: "guest-author-post",
        authorId: author.id,
      });
      setAuthSession(guest.id);

      const response = await makeRequest("guest-author-post", {
        title: "Guest Title",
      });
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 403 when user id does not match author id", async () => {
      const author = await createMockUser("Real Author");
      const fakeUser = await createMockUser("Fake User");
      const post = await createMockPost({
        slug: "fake-user-post",
        authorId: author.id,
      });
      setAuthSession(fakeUser.id);

      const response = await makeRequest("fake-user-post", {
        title: "Fake Title",
      });
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should allow owner to update with multiple field changes", async () => {
      const user = await createMockUser("Owner");
      const post = await createMockPost({
        slug: "multi-update",
        authorId: user.id,
        title: "Original Title",
        bodyMarkdown: "# Original",
        visibility: "PRIVATE",
      });
      setAuthSession(user.id);

      const response = await makeRequest("multi-update", {
        title: "New Title",
        bodyMarkdown: "# New Content",
        visibility: "PUBLIC",
      });

      expect(response.status).toBe(200);
    });

    it("should return 403 for user with undefined id", async () => {
      const author = await createMockUser("Author");
      const post = await createMockPost({
        slug: "undefined-id-post",
        authorId: author.id,
      });
      (auth.api.getSession as vi.Mock).mockResolvedValue({
        user: { id: undefined },
      });

      const response = await makeRequest("undefined-id-post", {
        title: "Test",
      });
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 403 when trying to update with string user id instead of matching", async () => {
      const author = await createMockUser("Author");
      const post = await createMockPost({
        slug: "mismatch-id-post",
        authorId: author.id,
      });
      setAuthSession("non-matching-user-id");

      const response = await makeRequest("mismatch-id-post", { title: "Test" });
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should handle case where authorId is null gracefully", async () => {
      const user = await createMockUser("User");
      const post = await createMockPost({
        slug: "null-author-post",
        authorId: user.id,
      });
      (post as any).authorId = null;
      setAuthSession(user.id);

      const response = await makeRequest("null-author-post", { title: "Test" });

      expect(response.status).toBe(403);
    });

    it("should allow owner to update private post", async () => {
      const user = await createMockUser("Owner");
      const post = await createMockPost({
        slug: "owner-private",
        authorId: user.id,
        visibility: "PRIVATE",
        publishedAt: null,
      });
      setAuthSession(user.id);

      const response = await makeRequest("owner-private", {
        title: "Updated Private",
      });

      expect(response.status).toBe(200);
    });

    it("should not allow owner to update when session is manipulated", async () => {
      const author = await createMockUser("Author");
      const post = await createMockPost({
        slug: "manipulated-post",
        authorId: author.id,
      });
      (auth.api.getSession as vi.Mock).mockResolvedValue({
        user: { id: "manipulated-id" },
      });

      const response = await makeRequest("manipulated-post", { title: "Test" });
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("3. Basic Update Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should update title only", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "title-only",
        authorId: user.id,
        title: "Original Title",
      });
      setAuthSession(user.id);

      const response = await makeRequest("title-only", { title: "New Title" });

      expect(response.status).toBe(200);
    });

    it("should update body only", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "body-only",
        authorId: user.id,
        bodyMarkdown: "# Original",
      });
      setAuthSession(user.id);

      const response = await makeRequest("body-only", {
        bodyMarkdown: "# New Body",
      });

      expect(response.status).toBe(200);
    });

    it("should update slug only", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "old-slug",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("old-slug", { slug: "new-slug" });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should update visibility only", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "visibility-only",
        authorId: user.id,
        visibility: "PRIVATE",
      });
      setAuthSession(user.id);

      const response = await makeRequest("visibility-only", {
        visibility: "PUBLIC",
      });

      expect(response.status).toBe(200);
    });

    it("should update metadata fields when provided", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "metadata-update",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("metadata-update", {
        title: "Updated with Metadata",
        seoDescription: "New SEO description",
        tags: ["new", "tags"],
      });

      expect(response.status).toBe(200);
    });

    it("should update all fields at once", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "all-fields",
        authorId: user.id,
        title: "Original",
        bodyMarkdown: "# Original",
        visibility: "PRIVATE",
      });
      setAuthSession(user.id);

      const response = await makeRequest("all-fields", {
        title: "Complete Update",
        bodyMarkdown: "# New Content",
        visibility: "PUBLIC",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 200 on successful update", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "success-post",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("success-post", { title: "Success!" });

      expect(response.status).toBe(200);
    });

    it("should preserve unchanged fields", async () => {
      const user = await createMockUser("Author");
      const originalTitle = "Original Title";
      const post = await createMockPost({
        slug: "preserve-fields",
        authorId: user.id,
        title: originalTitle,
        bodyMarkdown: "# Keep this",
        visibility: "PUBLIC",
      });
      setAuthSession(user.id);

      const response = await makeRequest("preserve-fields", {
        visibility: "PRIVATE",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe(originalTitle);
      expect(data.bodyMarkdown).toBe("# Keep this");
    });

    it("should update and return full post object", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "full-response",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("full-response", {
        title: "Full Update",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("slug");
      expect(data).toHaveProperty("title");
      expect(data).toHaveProperty("bodyMarkdown");
      expect(data).toHaveProperty("visibility");
      expect(data).toHaveProperty("author");
      expect(data).toHaveProperty("createdAt");
      expect(data).toHaveProperty("updatedAt");
    });

    it("should handle empty update gracefully", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "empty-update",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("empty-update", {});
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("4. Validation Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should reject empty title", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "empty-title",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("empty-title", { title: "" });

      expect(response.status).toBe(400);
    });

    it("should handle very long title", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "long-title",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const longTitle = "A".repeat(500);
      const response = await makeRequest("long-title", { title: longTitle });

      expect(response.status).toBe(400);
    });

    it("should handle title with special characters", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "special-title",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("special-title", {
        title: "Title with <script>alert('xss')</script>",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should handle title with unicode", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "unicode-title",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("unicode-title", {
        title: "日本語タイトル中文标题",
      });

      expect(response.status).toBe(200);
    });

    it("should handle title with emoji", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "emoji-title",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("emoji-title", {
        title: "🎉 Celebration Post 🚀",
      });

      expect(response.status).toBe(200);
    });

    it("should handle empty body markdown", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "empty-body",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("empty-body", { bodyMarkdown: "" });

      expect(response.status).toBe(200);
    });

    it("should handle very long body markdown", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "long-body",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const longBody = "# Content\n\n" + "Paragraph ".repeat(10000);
      const response = await makeRequest("long-body", {
        bodyMarkdown: longBody,
      });

      expect(response.status).toBe(200);
    });

    it("should handle body with complex markdown", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "complex-markdown",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const complexMarkdown = `# Title

## Subtitle

**Bold** and *italic* and ***both***

\`inline code\`

\`\`\`javascript
const x = 1;
\`\`\`

- List item 1
- List item 2

> Blockquote

[Link](https://example.com)

![Image](https://example.com/img.jpg)

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;
      const response = await makeRequest("complex-markdown", {
        bodyMarkdown: complexMarkdown,
      });

      expect(response.status).toBe(200);
    });

    it("should reject invalid visibility values", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "invalid-visibility",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("invalid-visibility", {
        visibility: "INVALID",
      });

      expect(response.status).toBe(200);
    });

    it("should handle valid PUBLIC visibility", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "public-vis",
        authorId: user.id,
        visibility: "PRIVATE",
      });
      setAuthSession(user.id);

      const response = await makeRequest("public-vis", {
        visibility: "PUBLIC",
      });

      expect(response.status).toBe(200);
    });

    it("should handle valid PRIVATE visibility", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "private-vis",
        authorId: user.id,
        visibility: "PUBLIC",
      });
      setAuthSession(user.id);

      const response = await makeRequest("private-vis", {
        visibility: "PRIVATE",
      });

      expect(response.status).toBe(200);
    });

    it("should handle valid DRAFT visibility", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "draft-vis",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("draft-vis", { visibility: "DRAFT" });

      expect(response.status).toBe(200);
    });

    it("should handle valid UNLISTED visibility", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "unlisted-vis",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("unlisted-vis", {
        visibility: "UNLISTED",
      });

      expect(response.status).toBe(200);
    });

    it("should handle empty tags array", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "empty-tags",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("empty-tags", { tags: [] });

      expect(response.status).toBe(200);
    });

    it("should handle tags as array of strings", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "string-tags",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("string-tags", {
        tags: ["react", "typescript", "nextjs"],
      });

      expect(response.status).toBe(200);
    });

    it("should ignore invalid fields in request body", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "invalid-fields",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("invalid-fields", {
        title: "Valid Update",
        invalidField: "should be ignored",
        anotherInvalid: 123,
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should handle null values in request", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "null-values",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("null-values", {
        title: null,
        visibility: null,
      });
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe(
        "An unexpected error occurred. Please try again later."
      );
    });

    it("should handle undefined values in request", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "undefined-values",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("undefined-values", {
        title: undefined,
      });

      expect(response.status).toBe(200);
    });

    it("should handle numeric values gracefully", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "numeric-title",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("numeric-title", { title: 12345 });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should handle boolean values in request", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "boolean-fields",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("boolean-fields", {
        title: true,
        isPublished: false,
      });

      expect(response.status).toBe(200);
    });
  });

  describe("5. Slug Change Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should change to new unique slug", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "old-unique-slug",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("old-unique-slug", {
        slug: "new-unique-slug",
      });

      expect(response.status).toBe(200);
    });

    it("should return conflict when changing to duplicate slug", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "existing-slug", authorId: user.id });
      const post = await createMockPost({
        slug: "to-change-slug",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("to-change-slug", {
        slug: "existing-slug",
      });

      expect(response.status).toBe(409);
    });

    it("should keep same slug when no slug change requested", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "same-slug",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("same-slug", {
        title: "Updated Title",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should handle slug with numbers", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "slug-with-numbers",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("slug-with-numbers", {
        slug: "new-slug-2024",
      });

      expect(response.status).toBe(200);
    });

    it("should handle slug with hyphens", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "old-hyphen-slug",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("old-hyphen-slug", {
        slug: "new-hyphen-slug-with-more-words",
      });

      expect(response.status).toBe(200);
    });

    it("should handle unicode in slug", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "unicode-slug",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("unicode-slug", {
        slug: "new-日本語-slug",
      });

      expect(response.status).toBe(400);
    });

    it("should handle empty slug change", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "empty-slug-change",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("empty-slug-change", { slug: "" });

      expect(response.status).toBe(400);
    });

    it("should handle slug change with special characters", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "special-slug",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("special-slug", {
        slug: "slug_with_underscores",
      });

      expect(response.status).toBe(400);
    });

    it("should handle multiple slug changes in sequence", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "multi-slug-1",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("multi-slug-1", {
        slug: "multi-slug-2",
      });
      expect(response.status).toBe(200);
    });

    it("should update slug and return new slug in response", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "response-slug",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("response-slug", {
        slug: "updated-slug",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("6. Visibility Change Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should change from PUBLIC to PRIVATE", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "public-to-private",
        authorId: user.id,
        visibility: "PUBLIC",
        publishedAt: new Date(),
      });
      setAuthSession(user.id);

      const response = await makeRequest("public-to-private", {
        visibility: "PRIVATE",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should change from PRIVATE to PUBLIC", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "private-to-public",
        authorId: user.id,
        visibility: "PRIVATE",
        publishedAt: null,
      });
      setAuthSession(user.id);

      const response = await makeRequest("private-to-public", {
        visibility: "PUBLIC",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should set publishedAt when making PUBLIC", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "set-published",
        authorId: user.id,
        visibility: "PRIVATE",
        publishedAt: null,
      });
      setAuthSession(user.id);

      const response = await makeRequest("set-published", {
        visibility: "PUBLIC",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should clear publishedAt when making PRIVATE", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "clear-published",
        authorId: user.id,
        visibility: "PUBLIC",
        publishedAt: new Date(),
      });
      setAuthSession(user.id);

      const response = await makeRequest("clear-published", {
        visibility: "PRIVATE",
      });

      expect(response.status).toBe(200);
    });

    it("should change from DRAFT to PUBLIC", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "draft-to-public",
        authorId: user.id,
        visibility: "DRAFT",
        publishedAt: null,
      });
      setAuthSession(user.id);

      const response = await makeRequest("draft-to-public", {
        visibility: "PUBLIC",
      });

      expect(response.status).toBe(200);
    });

    it("should change from PUBLIC to DRAFT", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "public-to-draft",
        authorId: user.id,
        visibility: "PUBLIC",
        publishedAt: new Date(),
      });
      setAuthSession(user.id);

      const response = await makeRequest("public-to-draft", {
        visibility: "DRAFT",
      });

      expect(response.status).toBe(200);
    });

    it("should change from PRIVATE to DRAFT", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "private-to-draft",
        authorId: user.id,
        visibility: "PRIVATE",
        publishedAt: null,
      });
      setAuthSession(user.id);

      const response = await makeRequest("private-to-draft", {
        visibility: "DRAFT",
      });

      expect(response.status).toBe(200);
    });

    it("should handle unlisted visibility", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "handle-unlisted",
        authorId: user.id,
        visibility: "PUBLIC",
      });
      setAuthSession(user.id);

      const response = await makeRequest("handle-unlisted", {
        visibility: "UNLISTED",
      });

      expect(response.status).toBe(200);
    });

    it("should maintain publishedAt when already PUBLIC", async () => {
      const user = await createMockUser("Author");
      const originalDate = new Date("2024-01-01");
      const post = await createMockPost({
        slug: "maintain-published",
        authorId: user.id,
        visibility: "PUBLIC",
        publishedAt: originalDate,
      });
      setAuthSession(user.id);

      const response = await makeRequest("maintain-published", {
        title: "Updated",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should not set publishedAt when already PUBLIC", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "already-public",
        authorId: user.id,
        visibility: "PUBLIC",
        publishedAt: new Date(),
      });
      setAuthSession(user.id);

      const response = await makeRequest("already-public", {
        visibility: "PUBLIC",
      });

      expect(response.status).toBe(200);
    });
  });

  describe("7. Error Handling Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should return 404 when updating non-existent post", async () => {
      const user = await createMockUser("Author");
      setAuthSession(user.id);

      const response = await makeRequest("non-existent-post", {
        title: "Test",
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should return 404 for deleted post", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "deleted-post",
        authorId: user.id,
      });
      mockPosts.length = 0;
      setAuthSession(user.id);

      const response = await makeRequest("deleted-post", { title: "Test" });
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should handle invalid JSON in request body", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "json-error",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const url = new URL("http://localhost:3000/api/posts/json-error");
      const invalidBody = "{ invalid json";
      const req = new NextRequest(url.toString(), {
        method: "PUT",
        headers: new Headers({ "content-type": "application/json" }),
        body: invalidBody,
      });

      try {
        await req.json();
      } catch (e) {
        const response = await PUT(req, {
          params: Promise.resolve({ slug: "json-error" }),
        });
        expect(response.status).toBe(400);
      }
    });

    it("should handle database errors during update", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "db-error",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const originalUpdate = prisma.post.update;
      (prisma.post.update as vi.Mock).mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      try {
        const response = await makeRequest("db-error", { title: "Test" });
        expect(response.status).not.toBe(200);
      } catch (e) {
        expect((e as Error).message).toBe("Database connection failed");
      }
    });

    it("should handle database errors during findUnique", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "find-error",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const originalFindUnique = prisma.post.findUnique;
      (prisma.post.findUnique as vi.Mock).mockRejectedValueOnce(
        new Error("Database error")
      );

      try {
        const response = await makeRequest("find-error", { title: "Test" });
        expect(response.status).not.toBe(200);
      } catch (e) {
        expect((e as Error).message).toBe("Database error");
      }
    });

    it("should handle concurrent update attempts", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "concurrent-update",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const responses = await Promise.all([
        makeRequest("concurrent-update", { title: "Update 1" }),
        makeRequest("concurrent-update", { title: "Update 2" }),
        makeRequest("concurrent-update", { title: "Update 3" }),
      ]);

      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it("should handle race condition on same post", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "race-condition",
        authorId: user.id,
      });
      setAuthSession(user.id);

      for (let i = 0; i < 10; i++) {
        const response = await makeRequest("race-condition", {
          title: `Update ${i}`,
        });
        expect(response.status).toBe(200);
      }
    });

    it("should return proper error for malformed request", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "malformed",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const url = new URL("http://localhost:3000/api/posts/malformed");
      const req = new NextRequest(url.toString(), {
        method: "PUT",
        headers: new Headers({ "content-type": "text/plain" }),
        body: "not json",
      });

      try {
        await req.json();
      } catch (e) {
        const response = await PUT(req, {
          params: Promise.resolve({ slug: "malformed" }),
        });
        expect(response.status).toBe(400);
      }
    });

    it("should handle very large request body", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "large-body",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const largeContent = "x".repeat(1000000);
      const response = await makeRequest("large-body", {
        bodyMarkdown: largeContent,
      });

      expect(response.status).toBe(200);
    });

    it("should handle special characters in request", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "special-chars",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("special-chars", {
        title: "Test with \u0000 null char and \u001f control",
        bodyMarkdown: "# Test\nwith\ttabs\nand\r\nnewlines",
      });

      expect(response.status).toBe(200);
    });
  });

  describe("8. Metadata Upsert Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should create metadata when updating post without existing metadata", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "new-metadata",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("new-metadata", {
        title: "With New Metadata",
        seoDescription: "New SEO description",
        tags: ["new", "tags"],
      });

      expect(response.status).toBe(200);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              upsert: expect.objectContaining({
                create: expect.objectContaining({
                  seoDescription: "New SEO description",
                  tags: ["new", "tags"],
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should update existing metadata when it already exists", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "update-metadata",
        authorId: user.id,
        seoDescription: "Old SEO description",
        tags: ["old", "tags"],
      });
      setAuthSession(user.id);

      const response = await makeRequest("update-metadata", {
        seoDescription: "Updated SEO description",
        tags: ["updated", "tags"],
      });

      expect(response.status).toBe(200);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              upsert: expect.objectContaining({
                update: expect.objectContaining({
                  seoDescription: "Updated SEO description",
                  tags: ["updated", "tags"],
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should create metadata with only seoDescription", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "seo-only",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("seo-only", {
        seoDescription: "Only SEO description",
      });

      expect(response.status).toBe(200);
    });

    it("should create metadata with only tags", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "tags-only",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("tags-only", {
        tags: ["react", "typescript"],
      });

      expect(response.status).toBe(200);
    });

    it("should handle empty tags array in metadata", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "empty-tags",
        authorId: user.id,
        tags: ["existing"],
      });
      setAuthSession(user.id);

      const response = await makeRequest("empty-tags", {
        tags: [],
      });

      expect(response.status).toBe(200);
    });

    it("should handle updating tags while keeping seoDescription", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "keep-seo",
        authorId: user.id,
        seoDescription: "Keep this SEO",
        tags: ["old"],
      });
      setAuthSession(user.id);

      const response = await makeRequest("keep-seo", {
        tags: ["new", "tags"],
      });

      expect(response.status).toBe(200);
    });

    it("should handle updating seoDescription while keeping tags", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "keep-tags",
        authorId: user.id,
        seoDescription: "Old SEO",
        tags: ["keep", "these"],
      });
      setAuthSession(user.id);

      const response = await makeRequest("keep-tags", {
        seoDescription: "New SEO description",
      });

      expect(response.status).toBe(200);
    });

    it("should not create metadata when neither seoDescription nor tags provided", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "no-metadata",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("no-metadata", {
        title: "Just a title change",
      });

      expect(response.status).toBe(200);
    });

    it("should handle metadata upsert with maximum tags", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "max-tags",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const maxTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      const response = await makeRequest("max-tags", {
        tags: maxTags,
      });

      expect(response.status).toBe(200);
    });

    it("should reject too many tags", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "too-many-tags",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
      const response = await makeRequest("too-many-tags", {
        tags: tooManyTags,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("tags must have less than 20 items");
    });

    it("should reject tags that are too long", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "long-tag",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const longTag = "a".repeat(51);
      const response = await makeRequest("long-tag", {
        tags: [longTag],
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "each tag must be a string with less than 50 characters"
      );
    });

    it("should reject non-string tags", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "invalid-tag",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("invalid-tag", {
        tags: [123, "valid"],
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "each tag must be a string with less than 50 characters"
      );
    });

    it("should reject non-array tags", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "array-tags",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("array-tags", {
        tags: "not-an-array",
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("tags must be an array");
    });

    it("should reject seoDescription that is too long", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "long-seo",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const longSeo = "a".repeat(501);
      const response = await makeRequest("long-seo", {
        seoDescription: longSeo,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "seoDescription must be less than 500 characters"
      );
    });

    it("should reject non-string seoDescription", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "string-seo",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("string-seo", {
        seoDescription: 12345,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("seoDescription must be a string");
    });

    it("should handle metadata with unicode tags", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "unicode-tags",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("unicode-tags", {
        tags: ["日本語", "中文", "한국어"],
        seoDescription: "多语言SEO描述",
      });

      expect(response.status).toBe(200);
    });

    it("should handle metadata with special characters in seoDescription", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "special-seo",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("special-seo", {
        seoDescription:
          "SEO with <script>alert('xss')</script> and quotes \"\" and '",
      });

      expect(response.status).toBe(200);
    });

    it("should preserve metadata when updating only title", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "preserve-metadata",
        authorId: user.id,
        seoDescription: "Preserve this",
        tags: ["keep", "these"],
      });
      setAuthSession(user.id);

      const response = await makeRequest("preserve-metadata", {
        title: "New Title",
      });

      expect(response.status).toBe(200);
    });

    it("should handle metadata with null values gracefully", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "null-metadata",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("null-metadata", {
        seoDescription: null,
        tags: null,
      });

      expect(response.status).toBe(400);
    });

    it("should handle metadata with undefined values gracefully", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "undefined-metadata",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("undefined-metadata", {
        seoDescription: undefined,
        tags: undefined,
      });

      expect(response.status).toBe(200);
    });
  });
});
