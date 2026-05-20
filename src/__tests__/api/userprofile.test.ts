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

const mockUsers: any[] = [];
const mockUserProfiles: Map<string, { role: string; userId: string }> =
  new Map();
let userIdCounter = 1;

const mockPosts: any[] = [];
let postIdCounter = 1;

vi.mock("@/lib/db", () => ({
  prisma: {
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
      update: vi.fn(async (options: any) => {
        const profile = mockUserProfiles.get(options.where.userId);
        if (profile) {
          profile.role = options.data.role;
        }
        return profile;
      }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
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
          metadata: null,
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
      deleteMany: vi.fn(async () => {
        const length = mockPosts.length;
        mockPosts.length = 0;
        return { count: length };
      }),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    account: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    apiKey: {
      create: vi.fn(),
      findUnique: vi.fn(async () => null),
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

import { PUT } from "@/app/api/posts/[slug]/route";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("UserProfile Existence Tests", () => {
  beforeEach(async () => {
    mockUsers.length = 0;
    mockUserProfiles.clear();
    mockPosts.length = 0;
    userIdCounter = 1;
    postIdCounter = 1;
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
    role: string = "AGENT",
    createProfile: boolean = true
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
    if (createProfile) {
      mockUserProfiles.set(user.id, { role, userId: user.id });
    }
    return user;
  };

  const createMockPost = async (
    authorId: string,
    slug: string = "test-post"
  ) => {
    const post = {
      id: `post-${postIdCounter++}`,
      title: "Test Post",
      slug,
      bodyMarkdown: "# Test Content",
      bodyHtml: "<h1>Test Content</h1>",
      visibility: "PUBLIC",
      authorId,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null,
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

  describe("1. UserProfile Creation on Signup", () => {
    it("should create UserProfile with default AGENT role on signup", async () => {
      const profile = await prisma.userProfile.create({
        data: {
          userId: "new-user-1",
          role: "AGENT",
        },
      });

      expect(profile.role).toBe("AGENT");
      expect(profile.userId).toBe("new-user-1");
    });

    it("should allow creating UserProfile with ADMIN role", async () => {
      const profile = await prisma.userProfile.create({
        data: {
          userId: "admin-user-1",
          role: "ADMIN",
        },
      });

      expect(profile.role).toBe("ADMIN");
    });

    it("should allow creating UserProfile with GUEST role", async () => {
      const profile = await prisma.userProfile.create({
        data: {
          userId: "guest-user-1",
          role: "GUEST",
        },
      });

      expect(profile.role).toBe("GUEST");
    });
  });

  describe("2. UserProfile Role Check", () => {
    it("should return 403 when user has no UserProfile", async () => {
      const user = await createMockUser("Test User", "AGENT", false);
      setAuthSession(user.id);

      (prisma.post.findUnique as vi.Mock).mockResolvedValue(
        await createMockPost(user.id)
      );

      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should allow access when user has AGENT role", async () => {
      const user = await createMockUser("Agent User", "AGENT", true);
      setAuthSession(user.id);

      (prisma.post.findUnique as vi.Mock).mockResolvedValue(
        await createMockPost(user.id)
      );

      const response = await makeRequest("test-post", { title: "New Title" });

      expect(response.status).toBe(200);
    });

    it("should allow access when user has ADMIN role", async () => {
      const user = await createMockUser("Admin User", "ADMIN", true);
      setAuthSession(user.id);

      const post = await createMockPost("other-author-id");
      (prisma.post.findUnique as vi.Mock).mockResolvedValue(post);

      const response = await makeRequest("test-post", { title: "New Title" });

      expect(response.status).toBe(200);
    });

    it("should return 403 when user has GUEST role", async () => {
      const user = await createMockUser("Guest User", "GUEST", true);
      setAuthSession(user.id);

      (prisma.post.findUnique as vi.Mock).mockResolvedValue(
        await createMockPost("other-author-id")
      );

      const response = await makeRequest("test-post", { title: "New Title" });
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("3. UserProfile API Response", () => {
    it("should retrieve UserProfile by userId", async () => {
      const user = await createMockUser("Test User", "AGENT", true);

      const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });

      expect(profile).not.toBeNull();
      expect(profile?.role).toBe("AGENT");
      expect(profile?.userId).toBe(user.id);
    });

    it("should return null when UserProfile doesn't exist", async () => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: "non-existent-user" },
      });

      expect(profile).toBeNull();
    });

    it("should update UserProfile role", async () => {
      const user = await createMockUser("Test User", "AGENT", true);

      const updatedProfile = await prisma.userProfile.update({
        where: { userId: user.id },
        data: { role: "ADMIN" },
      });

      expect(updatedProfile.role).toBe("ADMIN");
    });
  });

  describe("4. UserProfile Graceful Handling", () => {
    it("should handle missing profile gracefully in authorization", async () => {
      const user = await createMockUser("User Without Profile", "AGENT", false);
      setAuthSession(user.id);

      (prisma.post.findUnique as vi.Mock).mockResolvedValue(
        await createMockPost(user.id)
      );

      const response = await makeRequest("test-post", { title: "Title" });

      expect(response.status).toBe(403);
    });

    it("should check profile role correctly for non-owner access", async () => {
      const owner = await createMockUser("Owner", "AGENT", true);
      const otherUser = await createMockUser("Other User", "AGENT", true);
      setAuthSession(otherUser.id);

      (prisma.post.findUnique as vi.Mock).mockResolvedValue(
        await createMockPost(owner.id)
      );

      const response = await makeRequest("test-post", {
        title: "Hacked Title",
      });
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should allow admin to edit any post regardless of profile", async () => {
      const author = await createMockUser("Author", "AGENT", true);
      const admin = await createMockUser("Admin", "ADMIN", true);
      setAuthSession(admin.id);

      (prisma.post.findUnique as vi.Mock).mockResolvedValue(
        await createMockPost(author.id)
      );

      const response = await makeRequest("test-post", { title: "Admin Title" });

      expect(response.status).toBe(200);
    });

    it("should handle multiple users with different roles", async () => {
      const adminUser = await createMockUser("Admin", "ADMIN", true);
      const agentUser = await createMockUser("Agent", "AGENT", true);
      const guestUser = await createMockUser("Guest", "GUEST", true);

      const adminProfile = await prisma.userProfile.findUnique({
        where: { userId: adminUser.id },
      });
      const agentProfile = await prisma.userProfile.findUnique({
        where: { userId: agentUser.id },
      });
      const guestProfile = await prisma.userProfile.findUnique({
        where: { userId: guestUser.id },
      });

      expect(adminProfile?.role).toBe("ADMIN");
      expect(agentProfile?.role).toBe("AGENT");
      expect(guestProfile?.role).toBe("GUEST");
    });
  });

  describe("5. UserProfile and Post Operations", () => {
    it("should require profile before checking for post existence", async () => {
      const user = await createMockUser("Test User", "AGENT", false);
      setAuthSession(user.id);

      const response = await makeRequest("new-post", { title: "New Post" });

      expect(response.status).toBe(403);
    });

    it("should allow profile owner to update their posts", async () => {
      const user = await createMockUser("Author", "AGENT", true);
      setAuthSession(user.id);

      const post = await createMockPost(user.id, "my-post");

      const response = await makeRequest("my-post", {
        title: "Updated Title",
      });

      expect(response.status).toBe(200);
    });

    it("should handle profile deletion scenario", async () => {
      const userId = "user-to-delete";
      mockUsers.push({ id: userId, name: "To Delete" });
      mockUserProfiles.set(userId, { role: "AGENT", userId });

      mockUserProfiles.delete(userId);

      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      expect(profile).toBeNull();
    });
  });
});
