/**
 * Integration tests for DELETE /api/posts/[slug]
 *
 * These tests use a real database and call the actual route handler.
 * Auth is mocked using vi.hoisted to return a mock session.
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

describe("DELETE /api/posts/[slug] - Integration Tests", () => {
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

  describe("1. Delete own post succeeds", () => {
    it("should delete post when user is the author", async () => {
      const { user } = await createTestUser({ email: "owner-delete@test.com" });
      const post = await createTestPost({
        title: "My Post",
        slug: "owner-delete-test",
        bodyMarkdown: "# My Content",
        bodyHtml: "<h1>My Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("owner-delete-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });

    it("should delete post with metadata", async () => {
      const { user } = await createTestUser({
        email: "owner-delete-meta@test.com",
      });
      const post = await createTestPost({
        title: "Post with Metadata",
        slug: "owner-delete-meta-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
        tags: ["tag1", "tag2"],
        seoDescription: "SEO Description",
      });

      const response = await makeRequest("owner-delete-meta-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });
  });

  describe("2. Delete other's post forbidden (403) - unless ADMIN", () => {
    it("should return 403 when non-owner tries to delete", async () => {
      const { user: owner } = await createTestUser({
        email: "owner-other@test.com",
      });
      const { user: other } = await createTestUser({
        email: "other-delete@test.com",
      });
      const post = await createTestPost({
        title: "Owner's Post",
        slug: "other-delete-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: owner.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("other-delete-test", other.id);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only delete your own posts");
    });

    it("should still allow owner to delete after other user tried", async () => {
      const { user: owner } = await createTestUser({
        email: "owner-still@test.com",
      });
      const { user: other } = await createTestUser({
        email: "other-still@test.com",
      });
      const post = await createTestPost({
        title: "Owner's Post",
        slug: "other-still-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: owner.id,
        visibility: "PUBLIC",
      });

      await makeRequest("other-still-test", other.id);

      const response = await makeRequest("other-still-test", owner.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });
  });

  describe("3. ADMIN can delete any post", () => {
    it("should allow admin to delete someone else's post", async () => {
      const { user: author } = await createTestUser({
        email: "author-delete@test.com",
      });
      const { user: admin } = await createTestUser({
        email: "admin-delete@test.com",
        role: "ADMIN",
      });
      const post = await createTestPost({
        title: "Author's Post",
        slug: "admin-delete-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("admin-delete-test", admin.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });

    it("should allow admin to delete their own post", async () => {
      const { user: admin } = await createTestUser({
        email: "admin-own-delete@test.com",
        role: "ADMIN",
      });
      const post = await createTestPost({
        title: "Admin's Post",
        slug: "admin-own-delete-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: admin.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("admin-own-delete-test", admin.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });
  });

  describe("4. AUTHOR role can delete own posts but not others'", () => {
    it("should allow AUTHOR to delete their own post", async () => {
      const { user: author } = await createTestUser({
        email: "author-own-delete@test.com",
        role: "AUTHOR",
      });
      const post = await createTestPost({
        title: "Author's Post",
        slug: "author-own-delete-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("author-own-delete-test", author.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });

    it("should deny AUTHOR from deleting another user's post", async () => {
      const { user: postAuthor } = await createTestUser({
        email: "post-author-delete@test.com",
      });
      const { user: author } = await createTestUser({
        email: "author-other-delete@test.com",
        role: "AUTHOR",
      });
      const post = await createTestPost({
        title: "Other's Post",
        slug: "author-other-delete-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: postAuthor.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("author-other-delete-test", author.id);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only delete your own posts");
    });
  });

  describe("5. GUEST role rejected (403)", () => {
    it("should return 403 for GUEST role", async () => {
      const { user: author } = await createTestUser({
        email: "author-guest-delete@test.com",
      });
      const { user: guest } = await createTestUser({
        email: "guest-delete@test.com",
        role: "GUEST",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "guest-delete-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("guest-delete-test", guest.id);
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("5. UserProfile existence check", () => {
    it("should return 403 when user has no profile", async () => {
      const { user } = await createTestUser({
        email: "no-profile-delete@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "no-profile-delete-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      await prisma.userProfile.delete({
        where: { userId: user.id },
      });

      const response = await makeRequest("no-profile-delete-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("6. Delete non-existent post (404)", () => {
    it("should return 404 when post doesn't exist", async () => {
      const { user } = await createTestUser({
        email: "not-found-delete@test.com",
      });

      const response = await makeRequest("non-existent-post-delete", user.id);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });
  });

  describe("7. Verify cascade delete - metadata is also deleted", () => {
    it("should delete post metadata when post is deleted", async () => {
      const { user } = await createTestUser({
        email: "cascade-delete@test.com",
      });
      const post = await createTestPost({
        title: "Post with Metadata",
        slug: "cascade-delete-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
        tags: ["tag1", "tag2"],
        seoDescription: "SEO Description",
      });

      const metadataBefore = await prisma.postMetadata.findUnique({
        where: { postId: post.id },
      });
      expect(metadataBefore).not.toBeNull();

      const response = await makeRequest("cascade-delete-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);

      const metadataAfter = await prisma.postMetadata.findUnique({
        where: { postId: post.id },
      });
      expect(metadataAfter).toBeNull();
    });
  });

  describe("8. Verify post is actually removed from database after delete", () => {
    it("should not find post in database after deletion", async () => {
      const { user } = await createTestUser({
        email: "removed-from-db@test.com",
      });
      const post = await createTestPost({
        title: "Post to Remove",
        slug: "removed-from-db-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const postBefore = await prisma.post.findUnique({
        where: { slug: "removed-from-db-test" },
      });
      expect(postBefore).not.toBeNull();

      const response = await makeRequest("removed-from-db-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);

      const postAfter = await prisma.post.findUnique({
        where: { slug: "removed-from-db-test" },
      });
      expect(postAfter).toBeNull();
    });
  });

  describe("9. Returns proper success message", () => {
    it("should return success message with correct text", async () => {
      const { user } = await createTestUser({
        email: "success-message@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "success-message-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("success-message-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe("string");
      expect(data.message.length).toBeGreaterThan(0);
    });

    it("should not return error field on success", async () => {
      const { user } = await createTestUser({
        email: "no-error-field@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "no-error-field-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("no-error-field-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeUndefined();
    });
  });

  describe("10. Unauthorized access (no session)", () => {
    it("should return 401 when no session", async () => {
      const { user } = await createTestUser({ email: "no-session@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "no-session-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      mockGetSession.mockResolvedValue(null);

      const url = new URL(`http://localhost:3000/api/posts/no-session-test`);
      const headersMap = new Headers();
      mockHeaders.mockReturnValue(headersMap as any);

      const req = new NextRequest(url.toString(), {
        method: "DELETE",
        headers: headersMap,
      });

      const params = Promise.resolve({ slug: "no-session-test" });
      const response = await DELETE(req, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("11. Delete different visibility posts", () => {
    it("should delete PRIVATE post", async () => {
      const { user } = await createTestUser({
        email: "delete-private@test.com",
      });
      const post = await createTestPost({
        title: "Private Post",
        slug: "delete-private-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PRIVATE",
      });

      const response = await makeRequest("delete-private-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });

    it("should delete DRAFT post", async () => {
      const { user } = await createTestUser({ email: "delete-draft@test.com" });
      const post = await createTestPost({
        title: "Draft Post",
        slug: "delete-draft-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "DRAFT",
      });

      const response = await makeRequest("delete-draft-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });

    it("should delete UNLISTED post", async () => {
      const { user } = await createTestUser({
        email: "delete-unlisted@test.com",
      });
      const post = await createTestPost({
        title: "Unlisted Post",
        slug: "delete-unlisted-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "UNLISTED",
      });

      const response = await makeRequest("delete-unlisted-test", user.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");
    });
  });
});
