/**
 * Integration tests for UserProfile
 *
 * These tests use a real database and test the actual UserProfile
 * Prisma queries directly, as well as role-based access control.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { DELETE } from "@/app/api/posts/[slug]/route";
import { headers } from "next/headers";
import {
  prisma,
  cleanupDatabase,
  createTestUser,
  createTestPost,
} from "./test-utils";

const { mockGetSession, mockHeaders } = vi.hoisted(() => {
  return {
    mockGetSession: vi.fn(),
    mockHeaders: vi.fn(() => new Headers()),
  };
});

vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

describe("UserProfile Integration Tests", () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    vi.clearAllMocks();
  });

  const makeRequest = async (slug: string, userId: string) => {
    const url = new URL(`http://localhost:3000/api/posts/${slug}`);
    const headersMap = new Headers();

    mockHeaders.mockReturnValue(headersMap as any);
    mockGetSession.mockResolvedValue({ user: { id: userId } });

    const req = new NextRequest(url.toString(), {
      method: "DELETE",
      headers: headersMap,
    });

    const params = Promise.resolve({ slug });
    return DELETE(req, { params });
  };

  describe("1. UserProfile is created with correct role when user is created", () => {
    it("should create UserProfile with default AGENT role", async () => {
      const { user, profile } = await createTestUser({
        email: "agent-profile@test.com",
      });

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(user.id);
      expect(profile.role).toBe("AGENT");
    });

    it("should create UserProfile with ADMIN role when specified", async () => {
      const { user, profile } = await createTestUser({
        email: "admin-profile@test.com",
        role: "ADMIN",
      });

      expect(profile).toBeDefined();
      expect(profile.role).toBe("ADMIN");
      expect(profile.userId).toBe(user.id);
    });

    it("should create UserProfile with GUEST role when specified", async () => {
      const { user, profile } = await createTestUser({
        email: "guest-profile@test.com",
        role: "GUEST",
      });

      expect(profile).toBeDefined();
      expect(profile.role).toBe("GUEST");
      expect(profile.userId).toBe(user.id);
    });

    it("should link UserProfile to User via userId relationship", async () => {
      const { user, profile } = await createTestUser({
        email: "relationship-test@test.com",
      });

      const userWithProfile = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true },
      });

      expect(userWithProfile?.profile).toBeDefined();
      expect(userWithProfile?.profile?.id).toBe(profile.id);
    });
  });

  describe("2. AGENT role has correct permissions", () => {
    it("should allow AGENT to delete their own post", async () => {
      const { user } = await createTestUser({
        email: "agent-owner@test.com",
      });
      const post = await createTestPost({
        title: "Agent Own Post",
        slug: "agent-own-post",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("agent-own-post", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should deny AGENT to delete another user's post", async () => {
      const { user: author } = await createTestUser({
        email: "author-agent@test.com",
      });
      const { user: agent } = await createTestUser({
        email: "agent-other@test.com",
      });
      await createTestPost({
        title: "Author Post",
        slug: "author-post-agent-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("author-post-agent-test", agent.id);
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("3. ADMIN role has correct permissions", () => {
    it("should allow ADMIN to delete their own post", async () => {
      const { user } = await createTestUser({
        email: "admin-owner@test.com",
        role: "ADMIN",
      });
      const post = await createTestPost({
        title: "Admin Own Post",
        slug: "admin-own-post",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("admin-own-post", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should allow ADMIN to delete any user's post", async () => {
      const { user: author } = await createTestUser({
        email: "author-admin@test.com",
      });
      const { user: admin } = await createTestUser({
        email: "admin-any@test.com",
        role: "ADMIN",
      });
      await createTestPost({
        title: "Any Post",
        slug: "any-post-admin-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("any-post-admin-test", admin.id);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should allow ADMIN to update any user's post", async () => {
      const { user: author } = await createTestUser({
        email: "author-update-admin@test.com",
      });
      const { user: admin } = await createTestUser({
        email: "admin-update@test.com",
        role: "ADMIN",
      });
      await createTestPost({
        title: "Original Title",
        slug: "admin-update-post",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const url = new URL("http://localhost:3000/api/posts/admin-update-post");
      mockHeaders.mockReturnValue(new Headers() as any);
      mockGetSession.mockResolvedValue({ user: { id: admin.id } });

      const req = new NextRequest(url.toString(), {
        method: "PUT",
        body: JSON.stringify({ title: "Updated by Admin" }),
      });
      const params = Promise.resolve({ slug: "admin-update-post" });

      const { PUT } = await import("@/app/api/posts/[slug]/route");
      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("3a. AUTHOR role has correct permissions", () => {
    it("should allow AUTHOR to delete their own post", async () => {
      const { user } = await createTestUser({
        email: "author-owner@test.com",
        role: "AUTHOR",
      });
      const post = await createTestPost({
        title: "Author Own Post",
        slug: "author-own-post",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("author-own-post", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should deny AUTHOR to delete another user's post", async () => {
      const { user: postAuthor } = await createTestUser({
        email: "post-author-int@test.com",
      });
      const { user: author } = await createTestUser({
        email: "author-other-int@test.com",
        role: "AUTHOR",
      });
      await createTestPost({
        title: "Other Post",
        slug: "author-post-other-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: postAuthor.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("author-post-other-test", author.id);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should allow AUTHOR to update their own post", async () => {
      const { user } = await createTestUser({
        email: "author-update@test.com",
        role: "AUTHOR",
      });
      const post = await createTestPost({
        title: "Author Post",
        slug: "author-update-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      mockGetSession.mockResolvedValue({ user: { id: user.id } });

      const req = new NextRequest(
        new URL(`/api/posts/author-update-test`, "http://localhost"),
        {
          method: "PUT",
          body: JSON.stringify({ title: "Updated by Author" }),
        }
      );
      const params = Promise.resolve({ slug: "author-update-test" });

      const { PUT } = await import("@/app/api/posts/[slug]/route");
      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("4. GUEST role has correct permissions", () => {
    it("should deny GUEST to delete their own post", async () => {
      const { user } = await createTestUser({
        email: "guest-owner@test.com",
        role: "GUEST",
      });
      const post = await createTestPost({
        title: "Guest Own Post",
        slug: "guest-own-post",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("guest-own-post", user.id);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should deny GUEST to delete another user's post", async () => {
      const { user: author } = await createTestUser({
        email: "author-guest@test.com",
      });
      const { user: guest } = await createTestUser({
        email: "guest-other@test.com",
        role: "GUEST",
      });
      await createTestPost({
        title: "Author Post",
        slug: "author-post-guest-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("author-post-guest-test", guest.id);
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("5. UserProfile role can be updated", () => {
    it("should update role from AGENT to ADMIN", async () => {
      const { user, profile } = await createTestUser({
        email: "upgrade-agent@test.com",
      });

      expect(profile.role).toBe("AGENT");

      const updated = await prisma.userProfile.update({
        where: { userId: user.id },
        data: { role: "ADMIN" },
      });

      expect(updated.role).toBe("ADMIN");

      const fetched = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });
      expect(fetched?.role).toBe("ADMIN");
    });

    it("should update role from ADMIN to AGENT", async () => {
      const { user, profile } = await createTestUser({
        email: "downgrade-admin@test.com",
        role: "ADMIN",
      });

      expect(profile.role).toBe("ADMIN");

      const updated = await prisma.userProfile.update({
        where: { userId: user.id },
        data: { role: "AGENT" },
      });

      expect(updated.role).toBe("AGENT");
    });

    it("should update role from GUEST to AGENT", async () => {
      const { user, profile } = await createTestUser({
        email: "upgrade-guest@test.com",
        role: "GUEST",
      });

      expect(profile.role).toBe("GUEST");

      const updated = await prisma.userProfile.update({
        where: { userId: user.id },
        data: { role: "AGENT" },
      });

      expect(updated.role).toBe("AGENT");
    });

    it("should update role from AGENT to GUEST", async () => {
      const { user } = await createTestUser({
        email: "downgrade-guest@test.com",
      });

      const updated = await prisma.userProfile.update({
        where: { userId: user.id },
        data: { role: "GUEST" },
      });

      expect(updated.role).toBe("GUEST");
    });
  });

  describe("6. User without profile is rejected for protected operations", () => {
    it("should return 403 when user has no UserProfile", async () => {
      const { user } = await createTestUser({
        email: "no-profile-user@test.com",
      });

      await prisma.userProfile.delete({
        where: { userId: user.id },
      });

      const post = await createTestPost({
        title: "Some Post",
        slug: "no-profile-post",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("no-profile-post", user.id);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should verify userProfile is deleted from database", async () => {
      const { user } = await createTestUser({
        email: "delete-profile@test.com",
      });

      const profileBefore = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });
      expect(profileBefore).toBeDefined();

      await prisma.userProfile.delete({
        where: { userId: user.id },
      });

      const profileAfter = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });
      expect(profileAfter).toBeNull();
    });

    it("should reject user with profile deleted after initial creation", async () => {
      const { user } = await createTestUser({
        email: "revoked-profile@test.com",
      });

      const post = await createTestPost({
        title: "Post Before Revoke",
        slug: "revoke-post",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const responseBefore = await makeRequest("revoke-post", user.id);
      expect(responseBefore.status).toBe(200);

      await prisma.userProfile.delete({
        where: { userId: user.id },
      });

      const responseAfter = await makeRequest("revoke-post", user.id);
      expect(responseAfter.status).toBe(403);
    });
  });

  describe("7. Role-based access control works correctly", () => {
    it("should correctly distinguish between AGENT and ADMIN permissions", async () => {
      const author = await prisma.user.create({
        data: {
          email: `author-rbac-${Date.now()}@test.com`,
          name: "Author User",
        },
      });
      await prisma.userProfile.create({
        data: {
          userId: author.id,
          role: "AGENT",
        },
      });

      const agent = await prisma.user.create({
        data: {
          email: `agent-rbac-${Date.now()}@test.com`,
          name: "Agent User",
        },
      });
      await prisma.userProfile.create({
        data: {
          userId: agent.id,
          role: "AGENT",
        },
      });

      const admin = await prisma.user.create({
        data: {
          email: `admin-rbac-${Date.now()}@test.com`,
          name: "Admin User",
        },
      });
      await prisma.userProfile.create({
        data: {
          userId: admin.id,
          role: "ADMIN",
        },
      });

      const slug = `rbac-post-${Date.now()}`;
      const post = await createTestPost({
        title: "Protected Post",
        slug,
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const agentResponse = await makeRequest(slug, agent.id);
      expect(agentResponse.status).toBe(403);

      const adminResponse = await makeRequest(slug, admin.id);
      expect(adminResponse.status).toBe(200);
    });

    it("should correctly handle GUEST role restrictions", async () => {
      const author = await prisma.user.create({
        data: {
          email: `author-guest-rbac-${Date.now()}@test.com`,
          name: "Author Guest",
        },
      });
      await prisma.userProfile.create({
        data: {
          userId: author.id,
          role: "AGENT",
        },
      });

      const guest = await prisma.user.create({
        data: {
          email: `guest-rbac-${Date.now()}@test.com`,
          name: "Guest User",
        },
      });
      await prisma.userProfile.create({
        data: {
          userId: guest.id,
          role: "GUEST",
        },
      });

      const slug = `guest-rbac-post-${Date.now()}`;
      const post = await createTestPost({
        title: "Guest Protected Post",
        slug,
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const guestResponse = await makeRequest(slug, guest.id);
      expect(guestResponse.status).toBe(403);

      const guestProfile = await prisma.userProfile.findUnique({
        where: { userId: guest.id },
      });
      expect(guestProfile?.role).toBe("GUEST");
    });

    it("should allow role upgrade and grant additional permissions", async () => {
      const { user, profile } = await createTestUser({
        email: `upgrade-perms-${Date.now()}@test.com`,
        role: "GUEST",
      });

      expect(profile).toBeDefined();
      expect(profile.role).toBe("GUEST");

      const slug = `pre-upgrade-post-${Date.now()}`;
      const post = await createTestPost({
        title: "Pre-upgrade Post",
        slug,
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const responseBefore = await makeRequest(slug, user.id);
      expect(responseBefore.status).toBe(403);

      await prisma.userProfile.update({
        where: { userId: user.id },
        data: { role: "AGENT" },
      });

      const responseAfter = await makeRequest(slug, user.id);
      expect(responseAfter.status).toBe(200);
    });

    it("should handle multiple users with different roles simultaneously", async () => {
      const { user: authorUser } = await createTestUser({
        email: `multi-author-${Date.now()}@test.com`,
        role: "AGENT",
      });
      const { user: agentUser } = await createTestUser({
        email: `multi-agent-${Date.now()}@test.com`,
        role: "AGENT",
      });
      const { user: adminUser } = await createTestUser({
        email: `multi-admin-${Date.now()}@test.com`,
        role: "ADMIN",
      });
      const { user: guestUser } = await createTestUser({
        email: `multi-guest-${Date.now()}@test.com`,
        role: "GUEST",
      });

      const slug = `multi-user-post-${Date.now()}`;
      const post = await createTestPost({
        title: "Multi User Post",
        slug,
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: authorUser.id,
        visibility: "PUBLIC",
      });

      const agentResponse = await makeRequest(slug, agentUser.id);
      expect(agentResponse.status).toBe(403);

      const guestResponse = await makeRequest(slug, guestUser.id);
      expect(guestResponse.status).toBe(403);

      const adminResponse = await makeRequest(slug, adminUser.id);
      expect(adminResponse.status).toBe(200);
    });

    it("should verify role persistence in database", async () => {
      const { user: agentUser } = await createTestUser({
        email: `persist-agent-${Date.now()}@test.com`,
        role: "AGENT",
      });
      const { user: adminUser } = await createTestUser({
        email: `persist-admin-${Date.now()}@test.com`,
        role: "ADMIN",
      });
      const { user: guestUser } = await createTestUser({
        email: `persist-guest-${Date.now()}@test.com`,
        role: "GUEST",
      });

      const [agentProfile, adminProfile, guestProfile] = await Promise.all([
        prisma.userProfile.findUnique({
          where: { userId: agentUser.id },
        }),
        prisma.userProfile.findUnique({
          where: { userId: adminUser.id },
        }),
        prisma.userProfile.findUnique({
          where: { userId: guestUser.id },
        }),
      ]);

      expect(agentProfile?.role).toBe("AGENT");
      expect(adminProfile?.role).toBe("ADMIN");
      expect(guestProfile?.role).toBe("GUEST");
    });
  });
});
