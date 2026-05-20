import { describe, it, expect, beforeEach, vi } from "vitest";
import { DELETE } from "@/app/api/posts/[slug]/route";

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
      return async () => this.body;
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
const mockMetadata: any[] = [];
const mockUserProfiles: Map<string, { role: string; userId: string }> =
  new Map();
let postIdCounter = 1;
let userIdCounter = 1;
let metadataIdCounter = 1;

vi.mock("@/lib/db", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(async (options: any) => {
        const post = mockPosts.find(p => p.slug === options?.where?.slug);
        if (!post) return null;
        return {
          ...post,
          metadata: mockMetadata.find(m => m.postId === post.id) || null,
        };
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
          metadata: null,
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
        if (data.data.metadata) {
          const metadata = {
            id: `meta-${metadataIdCounter++}`,
            seoDescription: data.data.metadata.create?.seoDescription || null,
            tags: data.data.metadata.create?.tags || [],
            postId: post.id,
          };
          mockMetadata.push(metadata);
          (post as any).metadata = metadata;
        }
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
        if (index === -1) {
          const error = new Error("Post to delete not found") as any;
          error.code = "P2025";
          throw error;
        }
        const deleted = mockPosts.splice(index, 1)[0];
        const metaIndex = mockMetadata.findIndex(m => m.postId === deleted.id);
        if (metaIndex !== -1) mockMetadata.splice(metaIndex, 1);
        return deleted;
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
        mockMetadata.length = 0;
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
  mockMetadata.length = 0;
  mockUserProfiles.clear();
  postIdCounter = 1;
  userIdCounter = 1;
  metadataIdCounter = 1;
}

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

describe("DELETE /api/posts/[slug]", () => {
  beforeEach(async () => {
    resetMockData();
    vi.clearAllMocks();
  });

  const makeRequest = (
    slug: string,
    reqHeaders: Record<string, string> = {}
  ) => {
    mockHeaders.clear();
    Object.entries(reqHeaders).forEach(([key, value]) =>
      mockHeaders.set(key, value)
    );

    const url = new URL(`http://localhost:3000/api/posts/${slug}`);
    const req = new NextRequest(url.toString(), {
      method: "DELETE",
      headers: new Headers(reqHeaders),
    });
    const params = Promise.resolve({ slug });
    return DELETE(req, { params });
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
      metadata: null as any,
      author: {
        id: authorId,
        name: mockUsers.find(u => u.id === authorId)?.name || "Unknown",
        image: null,
      },
    };
    mockPosts.push(post);

    if (data.seoDescription || data.tags) {
      const metadata = {
        id: `meta-${metadataIdCounter++}`,
        seoDescription: data.seoDescription || null,
        tags: data.tags || [],
        postId: post.id,
      };
      mockMetadata.push(metadata);
      post.metadata = metadata;
    }

    return post;
  };

  const setAuthSession = (userId: string | null) => {
    if (userId) {
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: userId },
      });
    } else {
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    }
  };

  describe("1. Authentication Tests", () => {
    beforeEach(() => {
      setAuthSession(null);
    });

    it("should return 401 when no session provided", async () => {
      const post = await createMockPost({ slug: "test-post" });
      const response = await makeRequest("test-post");
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session is null", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await makeRequest("test-post");
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 when session user is undefined", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: undefined,
      });

      const response = await makeRequest("test-post");
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 with invalid session cookie", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await makeRequest("test-post", {
        cookie: "invalid-session-token",
      });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 with malformed session", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(
        {} as any
      );

      const response = await makeRequest("test-post");
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 403 when session has empty user id", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "" },
      });

      const response = await makeRequest("test-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 401 when headers are missing", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const url = new URL("http://localhost:3000/api/posts/test-post");
      const req = new NextRequest(url.toString(), {
        method: "DELETE",
      });
      const params = Promise.resolve({ slug: "test-post" });
      const response = await DELETE(req, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 500 when auth throws error", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Auth error")
      );

      const response = await makeRequest("test-post");
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe(
        "An unexpected error occurred. Please try again later."
      );
    });

    it("should return 401 for expired session", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await makeRequest("test-post", {
        cookie: "better-auth.session_token=expired-token",
      });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 for session with null user id", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: null },
      });

      const response = await makeRequest("test-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 401 when API key is provided instead of session", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await makeRequest("test-post", {
        Authorization: "Bearer some-api-key",
      });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 with fake/bogus session token", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await makeRequest("test-post", {
        cookie: "better-auth.session_token=fake-token-12345",
      });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 when session exists but user object is null", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: null,
      });

      const response = await makeRequest("test-post");
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

      const response = await makeRequest("test-post");

      expect(response.status).toBe(200);
    });

    it("should return 401 with empty authorization header", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await makeRequest("test-post", { Authorization: "" });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 401 for user id with undefined type", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: undefined },
      });

      const response = await makeRequest("test-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 403 for empty string user id after auth passes", async () => {
      const post = await createMockPost({ slug: "test-post" });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "" },
      });

      const response = await makeRequest("test-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("2. Authorization Tests", () => {
    it("should return 200 when owner deletes their own post", async () => {
      const user = await createMockUser("Owner");
      const post = await createMockPost({
        slug: "owner-post",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("owner-post");

      expect(response.status).toBe(200);
    });

    it("should return 403 when non-owner tries to delete post", async () => {
      const owner = await createMockUser("Owner");
      const otherUser = await createMockUser("Other User");
      const post = await createMockPost({
        slug: "other-post",
        authorId: owner.id,
      });
      setAuthSession(otherUser.id);

      const response = await makeRequest("other-post");
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only delete your own posts");
    });

    it("should return 200 when admin deletes someone else's post", async () => {
      const author = await createMockUser("Author");
      const admin = await createMockUser("Admin", "ADMIN");
      const post = await createMockPost({
        slug: "admin-test",
        authorId: author.id,
      });
      setAuthSession(admin.id);

      const response = await makeRequest("admin-test");

      expect(response.status).toBe(200);
    });

    it("should return 403 when agent tries to delete another agent's post", async () => {
      const author = await createMockUser("Author Agent", "AGENT");
      const otherAgent = await createMockUser("Other Agent", "AGENT");
      const post = await createMockPost({
        slug: "agent-post",
        authorId: author.id,
      });
      setAuthSession(otherAgent.id);

      const response = await makeRequest("agent-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should allow agent to delete their own post", async () => {
      const agent = await createMockUser("Agent User", "AGENT");
      const post = await createMockPost({
        slug: "my-agent-post",
        authorId: agent.id,
      });
      setAuthSession(agent.id);

      const response = await makeRequest("my-agent-post");

      expect(response.status).toBe(200);
    });

    it("should allow author role to delete their own post", async () => {
      const author = await createMockUser("Author User", "AUTHOR" as any);
      const post = await createMockPost({
        slug: "my-author-post",
        authorId: author.id,
      });
      setAuthSession(author.id);

      const response = await makeRequest("my-author-post");

      expect(response.status).toBe(200);
    });

    it("should return 403 when author tries to delete another user's post", async () => {
      const postOwner = await createMockUser("Post Owner");
      const author = await createMockUser("Author User", "AUTHOR" as any);
      const post = await createMockPost({
        slug: "author-other-post",
        authorId: postOwner.id,
      });
      setAuthSession(author.id);

      const response = await makeRequest("author-other-post");
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only delete your own posts");
    });

    it("should return 401 for guest user (no session)", async () => {
      const post = await createMockPost({ slug: "guest-post" });
      setAuthSession(null);

      const response = await makeRequest("guest-post");

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

      const response = await makeRequest("guest-author-post");
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

      const response = await makeRequest("fake-user-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should allow owner to delete private post", async () => {
      const user = await createMockUser("Owner");
      const post = await createMockPost({
        slug: "owner-private",
        authorId: user.id,
        visibility: "PRIVATE",
        publishedAt: null,
      });
      setAuthSession(user.id);

      const response = await makeRequest("owner-private");

      expect(response.status).toBe(200);
    });

    it("should return 403 for user with undefined id", async () => {
      const author = await createMockUser("Author");
      const post = await createMockPost({
        slug: "undefined-id-post",
        authorId: author.id,
      });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: undefined },
      });

      const response = await makeRequest("undefined-id-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 403 when trying to delete with string user id instead of matching", async () => {
      const author = await createMockUser("Author");
      const post = await createMockPost({
        slug: "mismatch-id-post",
        authorId: author.id,
      });
      setAuthSession("non-matching-user-id");

      const response = await makeRequest("mismatch-id-post");
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

      const response = await makeRequest("null-author-post");

      expect(response.status).toBe(403);
    });

    it("should not allow owner to delete when session is manipulated", async () => {
      const author = await createMockUser("Author");
      const post = await createMockPost({
        slug: "manipulated-post",
        authorId: author.id,
      });
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: "manipulated-id" },
      });

      const response = await makeRequest("manipulated-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should allow owner to delete draft post", async () => {
      const user = await createMockUser("Owner");
      const post = await createMockPost({
        slug: "draft-post",
        authorId: user.id,
        visibility: "PRIVATE",
        publishedAt: null,
      });
      setAuthSession(user.id);

      const response = await makeRequest("draft-post");

      expect(response.status).toBe(200);
    });

    it("should return 403 when trying to delete with numeric user id", async () => {
      const author = await createMockUser("Author");
      const post = await createMockPost({
        slug: "numeric-id-post",
        authorId: author.id,
      });
      setAuthSession("12345" as any);

      const response = await makeRequest("numeric-id-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("3. Basic Functionality Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should return 200 on successful deletion", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "success-post",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("success-post");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });

    it("should actually remove post from database", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "remove-post",
        authorId: user.id,
      });
      setAuthSession(user.id);

      expect(mockPosts.length).toBe(1);

      const response = await makeRequest("remove-post");

      expect(response.status).toBe(200);
      expect(mockPosts.length).toBe(0);
    });

    it("should return 404 when fetching deleted post", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "fetch-deleted",
        authorId: user.id,
      });
      setAuthSession(user.id);

      await makeRequest("fetch-deleted");

      const checkResponse = await prisma.post.findUnique({
        where: { slug: "fetch-deleted" },
      });
      expect(checkResponse).toBeNull();
    });

    it("should not include deleted post in public list", async () => {
      const user = await createMockUser("Author");
      await createMockPost({
        slug: "public-post-1",
        authorId: user.id,
        visibility: "PUBLIC",
      });
      await createMockPost({
        slug: "public-post-2",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      setAuthSession(user.id);
      await makeRequest("public-post-1");

      const publicPosts = await prisma.post.findMany({
        where: { visibility: "PUBLIC" },
      });

      expect(publicPosts.length).toBe(1);
      expect(publicPosts[0].slug).toBe("public-post-2");
    });

    it("should delete post and return proper response format", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "response-format",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("response-format");
      const data = await response.json();

      expect(data).toHaveProperty("message");
      expect(typeof data.message).toBe("string");
    });

    it("should delete multiple posts sequentially", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "multi-delete-1", authorId: user.id });
      await createMockPost({ slug: "multi-delete-2", authorId: user.id });
      await createMockPost({ slug: "multi-delete-3", authorId: user.id });

      setAuthSession(user.id);

      expect(mockPosts.length).toBe(3);

      await makeRequest("multi-delete-1");
      expect(mockPosts.length).toBe(2);

      await makeRequest("multi-delete-2");
      expect(mockPosts.length).toBe(1);

      await makeRequest("multi-delete-3");
      expect(mockPosts.length).toBe(0);
    });

    it("should delete post regardless of visibility", async () => {
      const user = await createMockUser("Author");

      const publicPost = await createMockPost({
        slug: "public-vis",
        authorId: user.id,
        visibility: "PUBLIC",
      });
      const privatePost = await createMockPost({
        slug: "private-vis",
        authorId: user.id,
        visibility: "PRIVATE",
      });

      setAuthSession(user.id);

      const response1 = await makeRequest("public-vis");
      expect(response1.status).toBe(200);

      const response2 = await makeRequest("private-vis");
      expect(response2.status).toBe(200);
    });

    it("should delete post and preserve other posts", async () => {
      const user1 = await createMockUser("User 1");
      const user2 = await createMockUser("User 2");

      await createMockPost({ slug: "user1-post", authorId: user1.id });
      await createMockPost({ slug: "user2-post", authorId: user2.id });

      setAuthSession(user1.id);
      await makeRequest("user1-post");

      expect(mockPosts.length).toBe(1);
      expect(mockPosts[0].slug).toBe("user2-post");
    });

    it("should delete post with all its content intact", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "full-content",
        authorId: user.id,
        bodyMarkdown:
          "# Full Content\n\nThis is a long post with lots of content.",
        bodyHtml:
          "<h1>Full Content</h1><p>This is a long post with lots of content.</p>",
      });
      setAuthSession(user.id);

      const response = await makeRequest("full-content");

      expect(response.status).toBe(200);
      expect(mockPosts.find(p => p.slug === "full-content")).toBeUndefined();
    });

    it("should return success even if post had no metadata", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({ slug: "no-meta", authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest("no-meta");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });
  });

  describe("4. Error Handling Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should return 404 when deleting non-existent post", async () => {
      const user = await createMockUser("Author");
      setAuthSession(user.id);

      const response = await makeRequest("non-existent-post");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should return 404 when deleting already deleted post", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "already-deleted", authorId: user.id });
      setAuthSession(user.id);

      await makeRequest("already-deleted");

      const response = await makeRequest("already-deleted");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should handle invalid slug format", async () => {
      const user = await createMockUser("Author");
      setAuthSession(user.id);

      const response = await makeRequest("");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should handle database errors during delete", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "db-error",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const originalDelete = prisma.post.delete;
      (prisma.post.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      try {
        const response = await makeRequest("db-error");
        expect(response.status).not.toBe(200);
      } catch (e) {
        expect((e as Error).message).toBe("Database connection failed");
      }

      prisma.post.delete = originalDelete;
    });

    it("should handle database errors during findUnique", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "find-error",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const originalFindUnique = prisma.post.findUnique;
      (
        prisma.post.findUnique as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("Database error"));

      try {
        const response = await makeRequest("find-error");
        expect(response.status).not.toBe(200);
      } catch (e) {
        expect((e as Error).message).toBe("Database error");
      }

      prisma.post.findUnique = originalFindUnique;
    });

    it("should return 404 for post with special characters in slug", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "special@#$%", authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest("special@#$%");

      expect(response.status).toBe(200);
    });

    it("should return 404 for post with slashes in slug", async () => {
      const user = await createMockUser("Author");
      setAuthSession(user.id);

      const response = await makeRequest("path/to/post");

      expect(response.status).toBe(404);
    });

    it("should handle concurrent delete attempts for different posts", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "concurrent-1", authorId: user.id });
      await createMockPost({ slug: "concurrent-2", authorId: user.id });
      await createMockPost({ slug: "concurrent-3", authorId: user.id });
      setAuthSession(user.id);

      const responses = await Promise.all([
        makeRequest("concurrent-1"),
        makeRequest("concurrent-2"),
        makeRequest("concurrent-3"),
      ]);

      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it("should handle rapid sequential delete requests", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "rapid-delete",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const response = await makeRequest("rapid-delete");
      expect(response.status).toBe(200);

      const secondResponse = await makeRequest("rapid-delete");
      expect(secondResponse.status).toBe(404);
    });

    it("should handle delete of post with null slug gracefully", async () => {
      const user = await createMockUser("Author");
      setAuthSession(user.id);

      try {
        const response = await makeRequest(null as any);
        expect(response.status).toBe(404);
      } catch (e) {
        expect(true).toBe(true);
      }
    });

    it("should handle delete of post with undefined slug", async () => {
      const user = await createMockUser("Author");
      setAuthSession(user.id);

      try {
        const response = await makeRequest(undefined as any);
        expect(response.status).toBe(404);
      } catch (e) {
        expect(true).toBe(true);
      }
    });

    it("should handle delete when findUnique returns post with null visibility", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "null-vis",
        authorId: user.id,
        visibility: null as any,
      });
      setAuthSession(user.id);

      const response = await makeRequest("null-vis");

      expect(response.status).toBe(200);
    });

    it("should return 404 when trying to delete post by different user's slug", async () => {
      const user1 = await createMockUser("User 1");
      const user2 = await createMockUser("User 2");
      await createMockPost({ slug: "user1-post", authorId: user1.id });
      setAuthSession(user2.id);

      const response = await makeRequest("user1-post");
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should handle database constraint errors", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "constraint-error",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const originalDelete = prisma.post.delete;
      (prisma.post.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Foreign key constraint failed")
      );

      try {
        const response = await makeRequest("constraint-error");
        expect(response.status).not.toBe(200);
      } catch (e) {
        expect((e as Error).message).toBe("Foreign key constraint failed");
      }

      prisma.post.delete = originalDelete;
    });
  });

  describe("5. Edge Cases Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should delete post with metadata", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "with-metadata",
        authorId: user.id,
        seoDescription: "SEO description",
        tags: ["tag1", "tag2", "tag3"],
      });
      setAuthSession(user.id);

      expect(mockMetadata.length).toBe(1);

      const response = await makeRequest("with-metadata");

      expect(response.status).toBe(200);
      expect(mockMetadata.length).toBe(0);
    });

    it("should delete post and cascade metadata deletion", async () => {
      const user = await createMockUser("Author");
      await createMockPost({
        slug: "cascade-meta",
        authorId: user.id,
        seoDescription: "Test SEO",
        tags: ["test"],
      });
      setAuthSession(user.id);

      const metaBeforeDelete = mockMetadata.find(
        m => m.postId === mockPosts[0].id
      );
      expect(metaBeforeDelete).toBeDefined();

      await makeRequest("cascade-meta");

      const metaAfterDelete = mockMetadata.find(m => m.postId === "post-1");
      expect(metaAfterDelete).toBeUndefined();
    });

    it("should delete post with very long slug", async () => {
      const user = await createMockUser("Author");
      const longSlug = "a".repeat(200);
      await createMockPost({ slug: longSlug, authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest(longSlug);

      expect(response.status).toBe(200);
    });

    it("should delete post with unicode in slug", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "unicode-日本語-post", authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest("unicode-日本語-post");

      expect(response.status).toBe(200);
    });

    it("should handle delete when author user is deleted", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "orphan-post",
        authorId: user.id,
      });
      setAuthSession(user.id);

      mockUsers.length = 0;

      const response = await makeRequest("orphan-post");

      expect(response.status).toBe(200);
    });

    it("should handle multiple rapid delete requests", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "rapid-requests",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const results = [];
      for (let i = 0; i < 10; i++) {
        const response = await makeRequest("rapid-requests");
        results.push(response.status);
      }

      expect(results[0]).toBe(200);
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBe(404);
      }
    });

    it("should delete post with empty body", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "empty-body",
        authorId: user.id,
        bodyMarkdown: "",
        bodyHtml: "",
      });
      setAuthSession(user.id);

      const response = await makeRequest("empty-body");

      expect(response.status).toBe(200);
    });

    it("should delete post with very long content", async () => {
      const user = await createMockUser("Author");
      const longContent = "Content line\n".repeat(10000);
      const post = await createMockPost({
        slug: "long-content",
        authorId: user.id,
        bodyMarkdown: longContent,
        bodyHtml: "<p>" + longContent + "</p>",
      });
      setAuthSession(user.id);

      const response = await makeRequest("long-content");

      expect(response.status).toBe(200);
    });

    it("should delete post with special HTML characters", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "special-html",
        authorId: user.id,
        bodyHtml: "<script>alert('xss')</script><div>Content</div>",
      });
      setAuthSession(user.id);

      const response = await makeRequest("special-html");

      expect(response.status).toBe(200);
    });

    it("should handle delete of post created long ago", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "old-post",
        authorId: user.id,
      });
      post.createdAt = new Date("2020-01-01");
      post.updatedAt = new Date("2020-01-01");
      setAuthSession(user.id);

      const response = await makeRequest("old-post");

      expect(response.status).toBe(200);
    });

    it("should delete post with numeric slug", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "12345", authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest("12345");

      expect(response.status).toBe(200);
    });

    it("should delete post with hyphenated slug", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "hyphenated-slug-post", authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest("hyphenated-slug-post");

      expect(response.status).toBe(200);
    });

    it("should delete post with underscore in slug", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "underscore_slug", authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest("underscore_slug");

      expect(response.status).toBe(200);
    });

    it("should delete post with trailing hyphen in slug", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "trailing-hyphen-", authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest("trailing-hyphen-");

      expect(response.status).toBe(200);
    });

    it("should delete post with leading hyphen in slug", async () => {
      const user = await createMockUser("Author");
      await createMockPost({ slug: "-leading-hyphen", authorId: user.id });
      setAuthSession(user.id);

      const response = await makeRequest("-leading-hyphen");

      expect(response.status).toBe(200);
    });

    it("should handle delete when post has many tags", async () => {
      const user = await createMockUser("Author");
      const manyTags = Array.from({ length: 100 }, (_, i) => `tag-${i}`);
      await createMockPost({
        slug: "many-tags",
        authorId: user.id,
        tags: manyTags,
      });
      setAuthSession(user.id);

      const response = await makeRequest("many-tags");

      expect(response.status).toBe(200);
      expect(mockMetadata.length).toBe(0);
    });

    it("should delete post and verify prisma delete was called with correct slug", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "verify-call",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const deleteSpy = vi.spyOn(prisma.post, "delete");

      await makeRequest("verify-call");

      expect(deleteSpy).toHaveBeenCalledWith({
        where: { slug: "verify-call" },
      });
    });
  });

  describe("6. Idempotency Tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should return consistent 404 when deleting already deleted post", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "idempotent-post",
        authorId: user.id,
      });
      setAuthSession(user.id);

      await makeRequest("idempotent-post");

      const response1 = await makeRequest("idempotent-post");
      const data1 = await response1.json();
      expect(response1.status).toBe(404);
      expect(data1.error).toBe("Post not found");

      const response2 = await makeRequest("idempotent-post");
      const data2 = await response2.json();
      expect(response2.status).toBe(404);
      expect(data2.error).toBe("Post not found");
    });

    it("should return same error message for second delete", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "same-error",
        authorId: user.id,
      });
      setAuthSession(user.id);

      await makeRequest("same-error");

      const response1 = await makeRequest("same-error");
      const response2 = await makeRequest("same-error");

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.error).toBe(data2.error);
    });

    it("should return 404 for multiple consecutive delete attempts", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "consecutive-deletes",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const responses = [];
      for (let i = 0; i < 5; i++) {
        const response = await makeRequest("consecutive-deletes");
        responses.push(response.status);
      }

      expect(responses[0]).toBe(200);
      for (let i = 1; i < responses.length; i++) {
        expect(responses[i]).toBe(404);
      }
    });

    it("should handle idempotent delete across different users", async () => {
      const user1 = await createMockUser("User 1");
      const user2 = await createMockUser("User 2");

      await createMockPost({ slug: "multi-user-post", authorId: user1.id });
      setAuthSession(user1.id);

      const response1 = await makeRequest("multi-user-post");
      expect(response1.status).toBe(200);

      setAuthSession(user2.id);
      const response2 = await makeRequest("multi-user-post");
      expect(response2.status).toBe(404);
    });

    it("should return same response format on repeated deletes", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "response-format",
        authorId: user.id,
      });
      setAuthSession(user.id);

      await makeRequest("response-format");

      const response = await makeRequest("response-format");
      const data = await response.json();

      expect(data).toHaveProperty("error");
      expect(typeof data.error).toBe("string");
      expect(response.status).toBe(404);
    });

    it("should handle rapid concurrent idempotent deletes", async () => {
      const user = await createMockUser("Author");
      const post = await createMockPost({
        slug: "rapid-idempotent",
        authorId: user.id,
      });
      setAuthSession(user.id);

      const results: number[] = [];

      for (let i = 0; i < 3; i++) {
        try {
          const response = await makeRequest("rapid-idempotent");
          results.push(response.status);
        } catch (e) {
          results.push(500);
        }
      }

      const successCount = results.filter(r => r === 200).length;
      expect(successCount).toBe(1);
    });
  });
});
