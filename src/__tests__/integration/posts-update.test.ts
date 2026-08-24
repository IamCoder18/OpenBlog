/**
 * Integration tests for PUT /api/posts/[slug]
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
import { PUT } from "@/app/api/posts/[slug]/route";
import { headers } from "next/headers";
import {
  prisma,
  cleanupDatabase,
  createTestAuthor,
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

describe("PUT /api/posts/[slug] - Integration Tests", () => {
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

  const makeRequest = async (slug: string, body: any, userId: string) => {
    const url = new URL(`http://localhost:3000/api/posts/${slug}`);
    const headersMap = new Headers();
    headersMap.set("content-type", "application/json");

    mockHeaders.mockReturnValue(headersMap as any);
    mockGetSession.mockResolvedValue({ user: { id: userId } });

    const req = new NextRequest(url.toString(), {
      method: "PUT",
      headers: headersMap,
      body: JSON.stringify(body),
    });

    const params = Promise.resolve({ slug });
    return PUT(req, { params });
  };

  describe("1. Update post title successfully", () => {
    it("should update title with valid data", async () => {
      const { user } = await createTestAuthor({
        email: "title-update@test.com",
      });
      const post = await createTestPost({
        title: "Original Title",
        slug: "original-title-test",
        bodyMarkdown: "# Original Content",
        bodyHtml: "<h1>Original Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "original-title-test",
        { title: "Updated Title" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Title");
    });

    it("should preserve other fields when updating title", async () => {
      const { user } = await createTestAuthor({ email: "preserve@test.com" });
      const post = await createTestPost({
        title: "Original",
        slug: "preserve-fields-test",
        bodyMarkdown: "# Original Content",
        bodyHtml: "<h1>Original Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "preserve-fields-test",
        { title: "New Title" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("New Title");
      expect(data.bodyMarkdown).toBe("# Original Content");
      expect(data.slug).toBe("preserve-fields-test");
    });
  });

  describe("2. Update post bodyMarkdown and verify HTML rendering", () => {
    it("should update bodyMarkdown and render HTML", async () => {
      const { user } = await createTestAuthor({
        email: "body-update@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "body-update-test",
        bodyMarkdown: "# Old Content",
        bodyHtml: "<h1>Old Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "body-update-test",
        { bodyMarkdown: "# New Content" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toBe("# New Content");
      expect(data.bodyHtml).toContain("New Content");
    });

    it("should preserve existing HTML when bodyMarkdown unchanged", async () => {
      const { user } = await createTestAuthor({
        email: "body-unchanged@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "body-unchanged-test",
        bodyMarkdown: "# Same Content",
        bodyHtml: "<h1>Same Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "body-unchanged-test",
        { title: "New Title" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toBe("# Same Content");
      expect(data.bodyHtml).toBe("<h1>Same Content</h1>");
    });

    it("should handle complex markdown rendering", async () => {
      const { user } = await createTestAuthor({ email: "complex-md@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "complex-md-test",
        bodyMarkdown: "# Simple",
        bodyHtml: "<h1>Simple</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "complex-md-test",
        { bodyMarkdown: "## Heading\n\n**Bold** and *italic*" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toBe("## Heading\n\n**Bold** and *italic*");
      expect(data.bodyHtml).toContain("<h2>");
      expect(data.bodyHtml).toContain("<strong>");
      expect(data.bodyHtml).toContain("<em>");
    });
  });

  describe("3. Update slug (with validation for format and uniqueness)", () => {
    it("should update slug to valid format", async () => {
      const { user } = await createTestAuthor({
        email: "slug-update@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "old-slug-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "old-slug-test",
        { slug: "new-slug-test" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slug).toBe("new-slug-test");
    });

    it("should return 409 when slug already exists", async () => {
      const { user } = await createTestAuthor({
        email: "slug-conflict@test.com",
      });
      await createTestPost({
        title: "Existing Post",
        slug: "existing-slug-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const post2 = await createTestPost({
        title: "To Update Post",
        slug: "to-update-slug-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "to-update-slug-test",
        { slug: "existing-slug-test" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("A post with this slug already exists");
    });

    it("should allow same user to keep same slug", async () => {
      const { user } = await createTestAuthor({ email: "same-slug@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "same-slug-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "same-slug-test",
        { title: "Updated Title" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slug).toBe("same-slug-test");
    });

    it("should return 400 for invalid slug format (uppercase)", async () => {
      const { user } = await createTestAuthor({ email: "slug-upper@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "valid-slug-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "valid-slug-test",
        { slug: "InvalidSlug" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("lowercase");
    });

    it("should return 400 for invalid slug format (special chars)", async () => {
      const { user } = await createTestAuthor({
        email: "slug-special@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "valid-slug-2",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "valid-slug-2",
        { slug: "invalid_slug" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug is too long (100 chars)", async () => {
      const { user } = await createTestAuthor({ email: "slug-long@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "short-slug-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "short-slug-test",
        { slug: "a".repeat(100) },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("100");
    });
  });

  describe("4. Update visibility (PUBLIC, PRIVATE, UNLISTED)", () => {
    it("should update visibility to PRIVATE", async () => {
      const { user } = await createTestAuthor({
        email: "vis-private@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "vis-private-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "vis-private-test",
        { visibility: "PRIVATE" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.visibility).toBe("PRIVATE");
      expect(data.publishedAt).toBeNull();
    });

    it("should update visibility to PUBLIC and set publishedAt", async () => {
      const { user } = await createTestAuthor({ email: "vis-public@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "vis-public-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PRIVATE",
      });

      const response = await makeRequest(
        "vis-public-test",
        { visibility: "PUBLIC" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.visibility).toBe("PUBLIC");
      expect(data.publishedAt).not.toBeNull();
    });

    it("should update visibility to UNLISTED", async () => {
      const { user } = await createTestAuthor({
        email: "vis-unlisted@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "vis-unlisted-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "vis-unlisted-test",
        { visibility: "UNLISTED" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.visibility).toBe("UNLISTED");
    });

    it("should preserve publishedAt when already PUBLIC", async () => {
      const { user } = await createTestAuthor({
        email: "vis-preserve@test.com",
      });
      const originalDate = new Date("2024-01-01");
      const post = await createTestPost({
        title: "Test Post",
        slug: "vis-preserve-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
        publishedAt: originalDate,
      } as any);

      const response = await makeRequest(
        "vis-preserve-test",
        { title: "Updated Title" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(new Date(data.publishedAt).getTime()).toBe(originalDate.getTime());
    });
  });

  describe("5. Update seoDescription", () => {
    it("should update seoDescription", async () => {
      const { user } = await createTestAuthor({ email: "seo-update@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "seo-update-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
        seoDescription: "Original SEO",
      });

      const response = await makeRequest(
        "seo-update-test",
        { seoDescription: "Updated SEO Description" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.seoDescription).toBe("Updated SEO Description");
    });

    it("should add seoDescription when metadata doesn't exist", async () => {
      const { user } = await createTestAuthor({ email: "seo-add@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "seo-add-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "seo-add-test",
        { seoDescription: "New SEO Description" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.seoDescription).toBe("New SEO Description");
    });
  });

  describe("6. Update tags", () => {
    it("should update tags", async () => {
      const { user } = await createTestAuthor({
        email: "tags-update@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "tags-update-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
        tags: ["old-tag"],
      });

      const response = await makeRequest(
        "tags-update-test",
        { tags: ["new-tag-1", "new-tag-2"] },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.tags).toEqual(["new-tag-1", "new-tag-2"]);
    });

    it("should add tags when metadata doesn't exist", async () => {
      const { user } = await createTestAuthor({ email: "tags-add@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "tags-add-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "tags-add-test",
        { tags: ["tag1", "tag2"] },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.tags).toEqual(["tag1", "tag2"]);
    });

    it("should clear tags when empty array provided", async () => {
      const { user } = await createTestAuthor({ email: "tags-clear@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "tags-clear-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
        tags: ["existing-tag"],
      });

      const response = await makeRequest(
        "tags-clear-test",
        { tags: [] },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.tags).toEqual([]);
    });
  });

  describe("7. Metadata upsert - create metadata if doesn't exist, update if exists", () => {
    it("should create metadata when post has no metadata", async () => {
      const { user } = await createTestAuthor({
        email: "meta-create@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "meta-create-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "meta-create-test",
        { seoDescription: "New SEO", tags: ["tag1"] },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata).not.toBeNull();
      expect(data.metadata.seoDescription).toBe("New SEO");
      expect(data.metadata.tags).toEqual(["tag1"]);
    });

    it("should update existing metadata", async () => {
      const { user } = await createTestAuthor({
        email: "meta-update@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "meta-update-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
        seoDescription: "Old SEO",
        tags: ["old-tag"],
      });

      const response = await makeRequest(
        "meta-update-test",
        { seoDescription: "Updated SEO", tags: ["new-tag"] },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.seoDescription).toBe("Updated SEO");
      expect(data.metadata.tags).toEqual(["new-tag"]);
    });

    it("should only update seoDescription when tags not provided", async () => {
      const { user } = await createTestAuthor({
        email: "meta-partial@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "meta-partial-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
        seoDescription: "Old SEO",
        tags: ["existing-tag"],
      });

      const response = await makeRequest(
        "meta-partial-test",
        { seoDescription: "New SEO" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.seoDescription).toBe("New SEO");
      expect(data.metadata.tags).toEqual(["existing-tag"]);
    });
  });

  describe("8. Partial updates (only some fields)", () => {
    it("should update only title", async () => {
      const { user } = await createTestAuthor({
        email: "partial-title@test.com",
      });
      const post = await createTestPost({
        title: "Original",
        slug: "partial-title-test",
        bodyMarkdown: "# Original Content",
        bodyHtml: "<h1>Original Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "partial-title-test",
        { title: "New Title" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("New Title");
      expect(data.bodyMarkdown).toBe("# Original Content");
    });

    it("should update only bodyMarkdown", async () => {
      const { user } = await createTestAuthor({
        email: "partial-body@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "partial-body-test",
        bodyMarkdown: "# Old Content",
        bodyHtml: "<h1>Old Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "partial-body-test",
        { bodyMarkdown: "# New Content" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyMarkdown).toBe("# New Content");
      expect(data.title).toBe("Test Post");
    });

    it("should handle empty body gracefully", async () => {
      const { user } = await createTestAuthor({
        email: "empty-update@test.com",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "empty-update-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest("empty-update-test", {}, user.id);

      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("9. Update own post succeeds", () => {
    it("should allow owner to update their post", async () => {
      const { user } = await createTestAuthor({
        email: "owner-update@test.com",
      });
      const post = await createTestPost({
        title: "My Post",
        slug: "owner-post-test",
        bodyMarkdown: "# My Content",
        bodyHtml: "<h1>My Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "owner-post-test",
        { title: "Updated My Post" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated My Post");
    });
  });

  describe("10. Update other's post forbidden (403) - unless ADMIN", () => {
    it("should return 403 when non-owner tries to update", async () => {
      const { user: owner } = await createTestAuthor({
        email: "owner@test.com",
      });
      const { user: other } = await createTestAuthor({
        email: "other@test.com",
      });
      const post = await createTestPost({
        title: "Owner's Post",
        slug: "other-post-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: owner.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "other-post-test",
        { title: "Hacked Title" },
        other.id
      );

      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only edit your own posts");
    });
  });

  describe("11. ADMIN can edit any post", () => {
    it("should allow admin to update someone else's post", async () => {
      const { user: author } = await createTestAuthor({
        email: "author@test.com",
      });
      const { user: admin } = await createTestAuthor({
        email: "admin@test.com",
        role: "ADMIN",
      });
      const post = await createTestPost({
        title: "Author's Post",
        slug: "admin-edit-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "admin-edit-test",
        { title: "Admin Updated Title" },
        admin.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Admin Updated Title");
    });
  });

  describe("12. AUTHOR can update own posts but not others'", () => {
    it("should allow AUTHOR to update their own post", async () => {
      const { user: author } = await createTestAuthor({
        email: "author-own-update@test.com",
        role: "AUTHOR",
      });
      const post = await createTestPost({
        title: "Author's Post",
        slug: "author-own-update-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "author-own-update-test",
        { title: "Author Updated Title" },
        author.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Author Updated Title");
    });

    it("should deny AUTHOR from updating another user's post", async () => {
      const { user: postAuthor } = await createTestAuthor({
        email: "post-author-update@test.com",
      });
      const { user: author } = await createTestAuthor({
        email: "author-other-update@test.com",
        role: "AUTHOR",
      });
      const post = await createTestPost({
        title: "Other's Post",
        slug: "author-other-update-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: postAuthor.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "author-other-update-test",
        { title: "Author Hacked Title" },
        author.id
      );

      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only edit your own posts");
    });
  });

  describe("13. GUEST role rejected (403)", () => {
    it("should return 403 for GUEST role", async () => {
      const { user: author } = await createTestAuthor({
        email: "author-guest@test.com",
      });
      const { user: guest } = await createTestAuthor({
        email: "guest@test.com",
        role: "GUEST",
      });
      const post = await createTestPost({
        title: "Test Post",
        slug: "guest-post-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "guest-post-test",
        { title: "Guest Title" },
        guest.id
      );

      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("13. UserProfile existence check", () => {
    it("should return 403 when user has no profile", async () => {
      const { user } = await createTestAuthor({ email: "no-profile@test.com" });
      const post = await createTestPost({
        title: "Test Post",
        slug: "no-profile-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      await prisma.userProfile.delete({
        where: { userId: user.id },
      });

      const response = await makeRequest(
        "no-profile-test",
        { title: "Test" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("14. Update non-existent post (404)", () => {
    it("should return 404 when post doesn't exist", async () => {
      const { user } = await createTestAuthor({ email: "not-found@test.com" });

      const response = await makeRequest(
        "non-existent-post",
        { title: "Test" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });
  });

  describe("15. Title length validation (1-200 chars)", () => {
    it("should return 200 for 1 character title", async () => {
      const { user } = await createTestAuthor({ email: "title-min@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "title-min-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "title-min-test",
        { title: "A" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 200 for 200 character title", async () => {
      const { user } = await createTestAuthor({ email: "title-max@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "title-max-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "title-max-test",
        { title: "A".repeat(200) },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 400 for empty title", async () => {
      const { user } = await createTestAuthor({
        email: "title-empty@test.com",
      });
      const post = await createTestPost({
        title: "Test",
        slug: "title-empty-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "title-empty-test",
        { title: "" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("1");
    });

    it("should return 400 for title over 200 characters", async () => {
      const { user } = await createTestAuthor({ email: "title-over@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "title-over-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "title-over-test",
        { title: "A".repeat(201) },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("200");
    });
  });

  describe("16. Slug format validation", () => {
    it("should return 400 for slug with spaces", async () => {
      const { user } = await createTestAuthor({ email: "slug-space@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "slug-space-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "slug-space-test",
        { slug: "invalid slug" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 for slug starting with hyphen", async () => {
      const { user } = await createTestAuthor({ email: "slug-start@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "slug-start-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "slug-start-test",
        { slug: "-invalid" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 for slug ending with hyphen", async () => {
      const { user } = await createTestAuthor({ email: "slug-end@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "slug-end-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "slug-end-test",
        { slug: "invalid-" },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe("17. Tags validation (max 10, 40 chars)", () => {
    it("should return 400 when tags exceed 10 items", async () => {
      const { user } = await createTestAuthor({ email: "tags-many@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "tags-many-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const manyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);

      const response = await makeRequest(
        "tags-many-test",
        { tags: manyTags },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("10");
    });

    it("should return 400 when tag exceeds 40 characters", async () => {
      const { user } = await createTestAuthor({ email: "tags-long@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "tags-long-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "tags-long-test",
        { tags: ["A".repeat(41)] },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("40");
    });

    it("should return 400 when tags is not an array", async () => {
      const { user } = await createTestAuthor({
        email: "tags-not-array@test.com",
      });
      const post = await createTestPost({
        title: "Test",
        slug: "tags-not-array-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "tags-not-array-test",
        { tags: "not-an-array" } as any,
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("array");
    });

    it("should return 200 with exactly 10 tags", async () => {
      const { user } = await createTestAuthor({ email: "tags-exact@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "tags-exact-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const twentyTags = Array.from({ length: 10 }, (_, i) => `tag${i}`);

      const response = await makeRequest(
        "tags-exact-test",
        { tags: twentyTags },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 200 with tag of exactly 40 characters", async () => {
      const { user } = await createTestAuthor({ email: "tags-max@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "tags-max-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "tags-max-test",
        { tags: ["A".repeat(40)] },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("18. seoDescription validation (max 320 chars)", () => {
    it("should return 400 when seoDescription exceeds 320 characters", async () => {
      const { user } = await createTestAuthor({ email: "seo-long@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "seo-long-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "seo-long-test",
        { seoDescription: "A".repeat(321) },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("320");
    });

    it("should return 200 when seoDescription is exactly 320 characters", async () => {
      const { user } = await createTestAuthor({ email: "seo-exact@test.com" });
      const post = await createTestPost({
        title: "Test",
        slug: "seo-exact-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "seo-exact-test",
        { seoDescription: "A".repeat(320) },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 400 when seoDescription is not a string", async () => {
      const { user } = await createTestAuthor({
        email: "seo-not-string@test.com",
      });
      const post = await createTestPost({
        title: "Test",
        slug: "seo-not-string-test",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });

      const response = await makeRequest(
        "seo-not-string-test",
        { seoDescription: 12345 } as any,
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("string");
    });
  });

  describe("19. Editorial priority", () => {
    it("lets an author feature and pin their own article", async () => {
      const { user } = await createTestAuthor({
        email: "update-priority@test.com",
      });
      await createTestPost({
        title: "Priority",
        slug: "update-priority",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });
      const response = await makeRequest(
        "update-priority",
        { isPinned: true, isFeatured: true },
        user.id
      );
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.isPinned).toBe(true);
      expect(data.isFeatured).toBe(true);
    });

    it("rejects non-boolean editorial priority values", async () => {
      const { user } = await createTestAuthor({
        email: "update-priority-invalid@test.com",
      });
      await createTestPost({
        title: "Priority",
        slug: "update-priority-invalid",
        bodyMarkdown: "# Content",
        bodyHtml: "<h1>Content</h1>",
        authorId: user.id,
        visibility: "PUBLIC",
      });
      const response = await makeRequest(
        "update-priority-invalid",
        { isFeatured: 1 },
        user.id
      );
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain("boolean");
    });
  });
});
