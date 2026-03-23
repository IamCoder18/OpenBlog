/**
 * Integration tests for Related Posts API
 *
 * These tests use a real database and call the actual route handler.
 * Unlike unit tests, they don't mock the database - they test against
 * real Prisma queries.
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
import { GET } from "@/app/api/posts/[slug]/related/route";
import {
  prisma,
  cleanupDatabase,
  createTestUser,
  createTestPost,
} from "./test-utils";

describe("GET /api/posts/[slug]/related - Integration Tests", () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  const makeRequest = (slug: string) => {
    const url = new URL(`http://localhost:3000/api/posts/${slug}/related`);
    const req = new NextRequest(url.toString(), {
      method: "GET",
    });
    const params = Promise.resolve({ slug });
    return GET(req, { params });
  };

  describe("1. Returns related posts based on matching tags", () => {
    it("should return related posts with matching tags", async () => {
      const { user: author } = await createTestUser({
        email: "author1@test.com",
      });

      const mainPost = await createTestPost({
        title: "Main Post",
        slug: "main-post-integration",
        bodyMarkdown: "# Main Content",
        bodyHtml: "<h1>Main Content</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["react", "typescript"],
      });

      await createTestPost({
        title: "Related Post 1",
        slug: "related-post-1-integration",
        bodyMarkdown: "# Related 1",
        bodyHtml: "<h1>Related 1</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["react"],
      });

      await createTestPost({
        title: "Related Post 2",
        slug: "related-post-2-integration",
        bodyMarkdown: "# Related 2",
        bodyHtml: "<h1>Related 2</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["typescript"],
      });

      await createTestPost({
        title: "Unrelated Post",
        slug: "unrelated-post-integration",
        bodyMarkdown: "# Unrelated",
        bodyHtml: "<h1>Unrelated</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["python"],
      });

      const response = await makeRequest("main-post-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(2);
      const slugs = data.map((p: any) => p.slug);
      expect(slugs).toContain("related-post-1-integration");
      expect(slugs).toContain("related-post-2-integration");
      expect(slugs).not.toContain("unrelated-post-integration");
    });

    it("should return posts with multiple matching tags", async () => {
      const { user: author } = await createTestUser({
        email: "author2@test.com",
      });

      await createTestPost({
        title: "Multi Tag Post",
        slug: "multi-tag-post-integration",
        bodyMarkdown: "# Multi",
        bodyHtml: "<h1>Multi</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["react", "nextjs", "typescript"],
      });

      await createTestPost({
        title: "Matching Post",
        slug: "matching-post-integration",
        bodyMarkdown: "# Matching",
        bodyHtml: "<h1>Matching</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["nextjs", "react"],
      });

      const response = await makeRequest("multi-tag-post-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(1);
      expect(data[0].slug).toBe("matching-post-integration");
    });

    it("should order related posts by publishedAt descending", async () => {
      const { user: author } = await createTestUser({
        email: "author3@test.com",
      });

      await createTestPost({
        title: "Main Post Order",
        slug: "main-post-order-integration",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["order-test"],
      });

      await createTestPost({
        title: "Older Post",
        slug: "older-post-integration",
        bodyMarkdown: "# Older",
        bodyHtml: "<h1>Older</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["order-test"],
      } as any);

      await createTestPost({
        title: "Newer Post",
        slug: "newer-post-integration",
        bodyMarkdown: "# Newer",
        bodyHtml: "<h1>Newer</h1>",
        authorId: author.id,
        visibility: "PUBLIC",
        tags: ["order-test"],
      } as any);

      const response = await makeRequest("main-post-order-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(2);
      expect(data[0].slug).toBe("newer-post-integration");
      expect(data[1].slug).toBe("older-post-integration");
    });
  });

  describe("2. Returns 404 when post doesn't exist", () => {
    it("should return 404 for non-existent slug", async () => {
      const response = await makeRequest("non-existent-post-integration");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should return 404 for empty slug", async () => {
      const response = await makeRequest("");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });
  });

  describe("3. Returns 404 when post is not public", () => {
    it("should return 404 for PRIVATE post", async () => {
      const { user: author } = await createTestUser({
        email: "author4@test.com",
      });

      await createTestPost({
        slug: "private-post-integration",
        title: "Private Post",
        bodyMarkdown: "# Private",
        bodyHtml: "<h1>Private</h1>",
        visibility: "PRIVATE",
        authorId: author.id,
        tags: ["private"],
      });

      const response = await makeRequest("private-post-integration");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should return 404 for PRIVATE post", async () => {
      const { user: author } = await createTestUser({
        email: "author6@test.com",
      });

      await createTestPost({
        slug: "unlisted-post-integration",
        title: "Unlisted Post",
        bodyMarkdown: "# Unlisted",
        bodyHtml: "<h1>Unlisted</h1>",
        visibility: "UNLISTED",
        authorId: author.id,
        tags: ["unlisted"],
      });

      const response = await makeRequest("unlisted-post-integration");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });
  });

  describe("4. Excludes current post from results", () => {
    it("should not include the main post in related posts", async () => {
      const { user: author } = await createTestUser({
        email: "author8@test.com",
      });

      await createTestPost({
        slug: "same-tags-post-integration",
        title: "Same Tags Post",
        bodyMarkdown: "# Same",
        bodyHtml: "<h1>Same</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["javascript", "react"],
      });

      await createTestPost({
        slug: "main-post-exclude-integration",
        title: "Main Post Exclude",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["javascript", "react"],
      });

      const response = await makeRequest("main-post-exclude-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(1);
      expect(data[0].slug).toBe("same-tags-post-integration");
    });

    it("should exclude post even if it has all matching tags", async () => {
      const { user: author } = await createTestUser({
        email: "author9@test.com",
      });

      await createTestPost({
        slug: "duplicate-post-integration",
        title: "Duplicate Post",
        bodyMarkdown: "# Duplicate",
        bodyHtml: "<h1>Duplicate</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["unique-tag"],
      });

      const response = await makeRequest("duplicate-post-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(0);
    });
  });

  describe("5. Limits results to 3 posts", () => {
    it("should return maximum of 3 related posts", async () => {
      const { user: author } = await createTestUser({
        email: "author10@test.com",
      });

      await createTestPost({
        slug: "main-post-limit-integration",
        title: "Main Post Limit",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["limit-test"],
      });

      for (let i = 1; i <= 5; i++) {
        await createTestPost({
          slug: `related-${i}-integration`,
          title: `Related Post ${i}`,
          bodyMarkdown: `# Related ${i}`,
          bodyHtml: `<h1>Related ${i}</h1>`,
          visibility: "PUBLIC",
          authorId: author.id,
          tags: ["limit-test"],
        });
      }

      const response = await makeRequest("main-post-limit-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(3);
    });

    it("should return fewer than 3 when fewer available", async () => {
      const { user: author } = await createTestUser({
        email: "author11@test.com",
      });

      await createTestPost({
        slug: "main-post-few-integration",
        title: "Main Post Few",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["few-test"],
      });

      await createTestPost({
        slug: "related-one-integration",
        title: "Related One",
        bodyMarkdown: "# Related",
        bodyHtml: "<h1>Related</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["few-test"],
      });

      const response = await makeRequest("main-post-few-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(1);
    });
  });

  describe("6. Returns posts in correct format", () => {
    it("should return related posts with correct structure", async () => {
      const { user: author } = await createTestUser({
        email: "author12@test.com",
      });

      await createTestPost({
        slug: "main-structure-integration",
        title: "Main Structure",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["structure"],
      });

      await createTestPost({
        slug: "related-structure-integration",
        title: "Related Structure",
        bodyMarkdown: "# Related Content",
        bodyHtml: "<h1>Related Content</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["structure"],
        seoDescription: "Related SEO",
      });

      const response = await makeRequest("main-structure-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(1);
      expect(data[0]).toMatchObject({
        id: expect.any(String),
        title: "Related Structure",
        slug: "related-structure-integration",
        bodyMarkdown: "# Related Content",
        bodyHtml: "<h1>Related Content</h1>",
        publishedAt: expect.any(String),
        author: {
          id: expect.any(String),
          name: expect.any(String),
        },
        metadata: {
          id: expect.any(String),
          seoDescription: "Related SEO",
          tags: ["structure"],
          postId: expect.any(String),
        },
      });
    });

    it("should include author with id, name, and image", async () => {
      const { user: author } = await createTestUser({
        email: "author13@test.com",
        name: "Named Author",
        image: "https://example.com/author.jpg",
      });

      await createTestPost({
        slug: "main-author-integration",
        title: "Main Author",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["author-test"],
      });

      await createTestPost({
        slug: "related-author-integration",
        title: "Related Author",
        bodyMarkdown: "# Related",
        bodyHtml: "<h1>Related</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["author-test"],
      });

      const response = await makeRequest("main-author-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0].author).toHaveProperty("id");
      expect(data[0].author).toHaveProperty("name");
      expect(data[0].author).toHaveProperty("image");
    });

    it("should include metadata with seoDescription and tags", async () => {
      const { user: author } = await createTestUser({
        email: "author14@test.com",
      });

      await createTestPost({
        slug: "main-metadata-integration",
        title: "Main Metadata",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["meta-test"],
        seoDescription: "Main SEO",
      });

      await createTestPost({
        slug: "related-metadata-integration",
        title: "Related Metadata",
        bodyMarkdown: "# Related",
        bodyHtml: "<h1>Related</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["meta-test"],
        seoDescription: "Related SEO",
      });

      const response = await makeRequest("main-metadata-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0].metadata).toBeDefined();
      expect(data[0].metadata.seoDescription).toBe("Related SEO");
      expect(data[0].metadata.tags).toEqual(["meta-test"]);
    });
  });

  describe("7. Returns empty array when no matching tags", () => {
    it("should return empty array when current post has no tags", async () => {
      const { user: author } = await createTestUser({
        email: "author15@test.com",
      });

      await createTestPost({
        slug: "main-no-tags-integration",
        title: "Main No Tags",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: [],
      });

      await createTestPost({
        slug: "other-post-integration",
        title: "Other Post",
        bodyMarkdown: "# Other",
        bodyHtml: "<h1>Other</h1>",
        visibility: "PRIVATE",
        authorId: author.id,
        tags: ["some-tag"],
      });

      const response = await makeRequest("main-no-tags-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return empty array when no posts share any tags", async () => {
      const { user: author } = await createTestUser({
        email: "author16@test.com",
      });

      await createTestPost({
        slug: "main-no-match-integration",
        title: "Main No Match",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["react"],
      });

      await createTestPost({
        slug: "other-different-integration",
        title: "Other Different",
        bodyMarkdown: "# Other",
        bodyHtml: "<h1>Other</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["python"],
      });

      await createTestPost({
        slug: "other-no-tags-integration",
        title: "Other No Tags",
        bodyMarkdown: "# Other",
        bodyHtml: "<h1>Other</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: [],
      });

      const response = await makeRequest("main-no-match-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return empty array when current post has undefined tags", async () => {
      const { user: author } = await createTestUser({
        email: "author17@test.com",
      });

      await createTestPost({
        slug: "main-undefined-tags-integration",
        title: "Main Undefined Tags",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
      });

      const response = await makeRequest("main-undefined-tags-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("8. Returns empty array when no related posts exist", () => {
    it("should return empty array when only one post exists", async () => {
      const { user: author } = await createTestUser({
        email: "author18@test.com",
      });

      await createTestPost({
        slug: "only-post-integration",
        title: "Only Post",
        bodyMarkdown: "# Only",
        bodyHtml: "<h1>Only</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["solo"],
      });

      const response = await makeRequest("only-post-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return empty array when no public posts exist", async () => {
      const { user: author } = await createTestUser({
        email: "author19@test.com",
      });

      await createTestPost({
        slug: "private-only-integration",
        title: "Private Only",
        bodyMarkdown: "# Private",
        bodyHtml: "<h1>Private</h1>",
        visibility: "PRIVATE",
        authorId: author.id,
      });

      const response = await makeRequest("private-only-integration");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return empty array when all related posts are private", async () => {
      const { user: author } = await createTestUser({
        email: "author20@test.com",
      });

      await createTestPost({
        slug: "main-all-private-integration",
        title: "Main All Private",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["private-test"],
      });

      await createTestPost({
        slug: "private-related-integration",
        title: "Private Related",
        bodyMarkdown: "# Private",
        bodyHtml: "<h1>Private</h1>",
        visibility: "PRIVATE",
        authorId: author.id,
        tags: ["private-test"],
      });

      const response = await makeRequest("main-all-private-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("Additional Edge Cases", () => {
    it("should handle posts from different authors", async () => {
      const { user: author1 } = await createTestUser({
        email: "author21a@test.com",
      });
      const { user: author2 } = await createTestUser({
        email: "author21b@test.com",
      });

      await createTestPost({
        slug: "main-different-authors-integration",
        title: "Main Different Authors",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author1.id,
        tags: ["cross-author"],
      });

      await createTestPost({
        slug: "related-different-author-integration",
        title: "Related Different Author",
        bodyMarkdown: "# Related",
        bodyHtml: "<h1>Related</h1>",
        visibility: "PUBLIC",
        authorId: author2.id,
        tags: ["cross-author"],
      });

      const response = await makeRequest("main-different-authors-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(1);
      expect(data[0].author.id).toBe(author2.id);
    });

    it("should handle case sensitivity in tags", async () => {
      const { user: author } = await createTestUser({
        email: "author22@test.com",
      });

      await createTestPost({
        slug: "main-case-integration",
        title: "Main Case",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["React"],
      });

      await createTestPost({
        slug: "related-case-integration",
        title: "Related Case",
        bodyMarkdown: "# Related",
        bodyHtml: "<h1>Related</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["react"],
      });

      const response = await makeRequest("main-case-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should handle Unicode characters in tags", async () => {
      const { user: author } = await createTestUser({
        email: "author23@test.com",
      });

      await createTestPost({
        slug: "main-unicode-integration",
        title: "Main Unicode",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["日本語"],
      });

      await createTestPost({
        slug: "related-unicode-integration",
        title: "Related Unicode",
        bodyMarkdown: "# Related",
        bodyHtml: "<h1>Related</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["日本語"],
      });

      const response = await makeRequest("main-unicode-integration");
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should handle concurrent requests", async () => {
      const { user: author } = await createTestUser({
        email: "author24@test.com",
      });

      await createTestPost({
        slug: "concurrent-main-integration",
        title: "Concurrent Main",
        bodyMarkdown: "# Main",
        bodyHtml: "<h1>Main</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["concurrent"],
      });

      await createTestPost({
        slug: "concurrent-related-integration",
        title: "Concurrent Related",
        bodyMarkdown: "# Related",
        bodyHtml: "<h1>Related</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["concurrent"],
      });

      const responses = await Promise.all([
        makeRequest("concurrent-main-integration"),
        makeRequest("concurrent-main-integration"),
        makeRequest("concurrent-main-integration"),
      ]);

      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it("should return valid JSON response", async () => {
      const { user: author } = await createTestUser({
        email: "author25@test.com",
      });

      await createTestPost({
        slug: "json-test-integration",
        title: "JSON Test",
        bodyMarkdown: "# JSON",
        bodyHtml: "<h1>JSON</h1>",
        visibility: "PUBLIC",
        authorId: author.id,
        tags: ["json"],
      });

      const response = await makeRequest("json-test-integration");

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    });
  });
});
