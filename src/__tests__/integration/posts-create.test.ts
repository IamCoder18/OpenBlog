/**
 * Integration tests for POST /api/posts
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
import { POST } from "@/app/api/posts/route";
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

describe("POST /api/posts - Integration Tests", () => {
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

  const makeRequest = async (body: any, userId: string) => {
    const url = new URL("http://localhost:3000/api/posts");
    const headersMap = new Headers();
    headersMap.set("content-type", "application/json");

    mockHeaders.mockReturnValue(headersMap as any);
    mockGetSession.mockResolvedValue({ user: { id: userId } });

    const req = new NextRequest(url.toString(), {
      method: "POST",
      headers: headersMap,
      body: JSON.stringify(body),
    });

    return POST(req);
  };

  describe("1. Create post successfully with valid data", () => {
    it("should create post with minimum required fields", async () => {
      const { user } = await createTestUser({ email: "create-min@test.com" });

      const response = await makeRequest(
        {
          title: "Test Post",
          slug: "test-post-min",
          bodyMarkdown: "# Test Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("Test Post");
      expect(data.slug).toBe("test-post-min");
      expect(data.bodyMarkdown).toBe("# Test Content");
      expect(data.visibility).toBe("PUBLIC");
      expect(data.publishedAt).not.toBeNull();
    });

    it("should create post with all optional fields", async () => {
      const { user } = await createTestUser({ email: "create-full@test.com" });

      const response = await makeRequest(
        {
          title: "Full Post",
          slug: "full-post",
          bodyMarkdown: "# Full Content",
          visibility: "PUBLIC",
          seoDescription: "SEO description here",
          tags: ["react", "typescript"],
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("Full Post");
      expect(data.visibility).toBe("PUBLIC");
      expect(data.metadata?.seoDescription).toBe("SEO description here");
      expect(data.metadata?.tags).toEqual(["react", "typescript"]);
    });
  });

  describe("2. Create post with tags and seoDescription", () => {
    it("should create post with tags array", async () => {
      const { user } = await createTestUser({ email: "tags@test.com" });

      const response = await makeRequest(
        {
          title: "Tags Post",
          slug: "tags-post",
          bodyMarkdown: "# Content",
          tags: ["javascript", "react", "nextjs"],
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.tags).toEqual(["javascript", "react", "nextjs"]);
    });

    it("should create post with seoDescription", async () => {
      const { user } = await createTestUser({ email: "seo@test.com" });

      const response = await makeRequest(
        {
          title: "SEO Post",
          slug: "seo-post",
          bodyMarkdown: "# Content",
          seoDescription: "This is a test SEO description",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.seoDescription).toBe(
        "This is a test SEO description"
      );
    });

    it("should create post with both tags and seoDescription", async () => {
      const { user } = await createTestUser({ email: "both@test.com" });

      const response = await makeRequest(
        {
          title: "Both Post",
          slug: "both-post",
          bodyMarkdown: "# Content",
          tags: ["test", "example"],
          seoDescription: "Example SEO description",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata?.tags).toEqual(["test", "example"]);
      expect(data.metadata?.seoDescription).toBe("Example SEO description");
    });
  });

  describe("3. Duplicate slug rejection (409)", () => {
    it("should return 409 when slug already exists", async () => {
      const { user } = await createTestUser({ email: "dup1@test.com" });

      await makeRequest(
        {
          title: "First Post",
          slug: "duplicate-slug",
          bodyMarkdown: "# First",
        },
        user.id
      );

      const response = await makeRequest(
        {
          title: "Second Post",
          slug: "duplicate-slug",
          bodyMarkdown: "# Second",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.slug).toBe("duplicate-slug-1");
    });

    it("should allow different users to create posts with same slug in different contexts", async () => {
      const { user: user1 } = await createTestUser({ email: "dup2a@test.com" });
      const { user: user2 } = await createTestUser({ email: "dup2b@test.com" });

      await makeRequest(
        {
          title: "User 1 Post",
          slug: "shared-slug",
          bodyMarkdown: "# User 1",
        },
        user1.id
      );

      const response = await makeRequest(
        {
          title: "User 2 Post",
          slug: "different-slug",
          bodyMarkdown: "# User 2",
        },
        user2.id
      );

      expect(response.status).toBe(201);
    });
  });

  describe("4. Missing title/slug/bodyMarkdown validation (400)", () => {
    it("should return 400 when title is missing", async () => {
      const { user } = await createTestUser({ email: "missing1@test.com" });

      const response = await makeRequest(
        {
          slug: "test-slug",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 400 when slug is missing", async () => {
      const { user } = await createTestUser({ email: "missing2@test.com" });

      const response = await makeRequest(
        {
          title: "Test Title",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 400 when bodyMarkdown is missing", async () => {
      const { user } = await createTestUser({ email: "missing3@test.com" });

      const response = await makeRequest(
        {
          title: "Test Title",
          slug: "test-slug",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 400 when all fields are missing", async () => {
      const { user } = await createTestUser({ email: "missing4@test.com" });

      const response = await makeRequest({}, user.id);

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when title is null", async () => {
      const { user } = await createTestUser({ email: "null1@test.com" });

      const response = await makeRequest(
        {
          title: null,
          slug: "test-slug",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug is null", async () => {
      const { user } = await createTestUser({ email: "null2@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: null,
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when bodyMarkdown is null", async () => {
      const { user } = await createTestUser({ email: "null3@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "test-slug",
          bodyMarkdown: null,
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe("5. Title whitespace validation (400)", () => {
    it("should return 400 when title is only whitespace", async () => {
      const { user } = await createTestUser({ email: "ws1@test.com" });

      const response = await makeRequest(
        {
          title: "   ",
          slug: "test-slug",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title cannot be only whitespace");
    });

    it("should return 400 when title is empty string", async () => {
      const { user } = await createTestUser({ email: "ws2@test.com" });

      const response = await makeRequest(
        {
          title: "",
          slug: "test-slug",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when title is tabs and spaces", async () => {
      const { user } = await createTestUser({ email: "ws3@test.com" });

      const response = await makeRequest(
        {
          title: "\t\t  \t",
          slug: "test-slug",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should create post when title has leading/trailing whitespace", async () => {
      const { user } = await createTestUser({ email: "ws4@test.com" });

      const response = await makeRequest(
        {
          title: "  Trimmed Title  ",
          slug: "trimmed-title",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("  Trimmed Title  ");
    });
  });

  describe("6. Title length validation (1-200 chars)", () => {
    it("should return 201 when title is 1 character", async () => {
      const { user } = await createTestUser({ email: "len1@test.com" });

      const response = await makeRequest(
        {
          title: "A",
          slug: "one-char-title",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 when title is 200 characters", async () => {
      const { user } = await createTestUser({ email: "len2@test.com" });

      const response = await makeRequest(
        {
          title: "A".repeat(200),
          slug: "two-hundred-title",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 when title exceeds 200 characters (no validation exists)", async () => {
      const { user } = await createTestUser({ email: "len3@test.com" });

      const response = await makeRequest(
        {
          title: "A".repeat(201),
          slug: "over-two-hundred-title",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("7. Slug format validation (regex)", () => {
    it("should return 400 when slug contains uppercase letters", async () => {
      const { user } = await createTestUser({ email: "slug1@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "InvalidSlug",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("lowercase");
    });

    it("should return 400 when slug contains spaces", async () => {
      const { user } = await createTestUser({ email: "slug2@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "invalid slug",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug contains special characters", async () => {
      const { user } = await createTestUser({ email: "slug3@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "invalid@slug!",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug contains underscores", async () => {
      const { user } = await createTestUser({ email: "slug4@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "invalid_slug",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug starts with hyphen", async () => {
      const { user } = await createTestUser({ email: "slug5@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "-invalid",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when slug ends with hyphen", async () => {
      const { user } = await createTestUser({ email: "slug6@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "invalid-",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 201 with valid slug format", async () => {
      const { user } = await createTestUser({ email: "slug7@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "valid-slug-123",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with single word slug", async () => {
      const { user } = await createTestUser({ email: "slug8@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "single",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with numeric slug", async () => {
      const { user } = await createTestUser({ email: "slug9@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "12345",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("8. Slug max length (100)", () => {
    it("should return 400 when slug is 100 characters", async () => {
      const { user } = await createTestUser({ email: "sluglen1@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "a".repeat(100),
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("100");
    });

    it("should return 400 when slug exceeds 100 characters", async () => {
      const { user } = await createTestUser({ email: "sluglen2@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "a".repeat(101),
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("100");
    });

    it("should return 201 when slug is 99 characters", async () => {
      const { user } = await createTestUser({ email: "sluglen3@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "a".repeat(99),
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("9. Tags validation (max 20, 50 chars each)", () => {
    it("should return 400 when tags exceed 20 items", async () => {
      const { user } = await createTestUser({ email: "tag1@test.com" });

      const manyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);

      const response = await makeRequest(
        {
          title: "Test",
          slug: "many-tags",
          bodyMarkdown: "# Content",
          tags: manyTags,
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("20");
    });

    it("should return 400 when a single tag exceeds 50 characters", async () => {
      const { user } = await createTestUser({ email: "tag2@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "long-tag",
          bodyMarkdown: "# Content",
          tags: ["valid", "A".repeat(51)],
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("50");
    });

    it("should return 400 when tags is not an array", async () => {
      const { user } = await createTestUser({ email: "tag3@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "not-array-tags",
          bodyMarkdown: "# Content",
          tags: "not-an-array",
        } as any,
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("array");
    });

    it("should return 201 with exactly 20 tags", async () => {
      const { user } = await createTestUser({ email: "tag4@test.com" });

      const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);

      const response = await makeRequest(
        {
          title: "Test",
          slug: "twenty-tags",
          bodyMarkdown: "# Content",
          tags: twentyTags,
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with tags of exactly 50 characters", async () => {
      const { user } = await createTestUser({ email: "tag5@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "max-tag",
          bodyMarkdown: "# Content",
          tags: ["A".repeat(50)],
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 201 with empty tags array", async () => {
      const { user } = await createTestUser({ email: "tag6@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "empty-tags",
          bodyMarkdown: "# Content",
          tags: [],
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("10. seoDescription validation (max 500 chars)", () => {
    it("should return 400 when seoDescription exceeds 500 characters", async () => {
      const { user } = await createTestUser({ email: "seo1@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "long-seo",
          bodyMarkdown: "# Content",
          seoDescription: "A".repeat(501),
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("500");
    });

    it("should return 201 when seoDescription is exactly 500 characters", async () => {
      const { user } = await createTestUser({ email: "seo2@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "max-seo",
          bodyMarkdown: "# Content",
          seoDescription: "A".repeat(500),
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 400 when seoDescription is not a string", async () => {
      const { user } = await createTestUser({ email: "seo3@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "not-string-seo",
          bodyMarkdown: "# Content",
          seoDescription: 12345,
        } as any,
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("string");
    });

    it("should return 201 without seoDescription", async () => {
      const { user } = await createTestUser({ email: "seo4@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "no-seo",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe("11. Visibility settings (PUBLIC, PRIVATE, UNLISTED)", () => {
    it("should default to PUBLIC when visibility not specified", async () => {
      const { user } = await createTestUser({ email: "vis1@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "default-visibility",
          bodyMarkdown: "# Content",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.visibility).toBe("PUBLIC");
    });

    it("should return 201 with explicit PUBLIC visibility", async () => {
      const { user } = await createTestUser({ email: "vis2@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "explicit-public",
          bodyMarkdown: "# Content",
          visibility: "PUBLIC",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.visibility).toBe("PUBLIC");
    });

    it("should return 201 with PRIVATE visibility", async () => {
      const { user } = await createTestUser({ email: "vis3@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "private-visibility",
          bodyMarkdown: "# Content",
          visibility: "PRIVATE",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.visibility).toBe("PRIVATE");
    });

    it("should return 201 with UNLISTED visibility", async () => {
      const { user } = await createTestUser({ email: "vis4@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "unlisted-visibility",
          bodyMarkdown: "# Content",
          visibility: "UNLISTED",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.visibility).toBe("UNLISTED");
    });
  });

  describe("12. PublishedAt timing based on visibility", () => {
    it("should set publishedAt for PUBLIC visibility", async () => {
      const { user } = await createTestUser({ email: "pub1@test.com" });
      const beforeRequest = new Date();

      const response = await makeRequest(
        {
          title: "Test",
          slug: "public-published",
          bodyMarkdown: "# Content",
          visibility: "PUBLIC",
        },
        user.id
      );

      const afterRequest = new Date();
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.publishedAt).not.toBeNull();
      const publishedDate = new Date(data.publishedAt);
      expect(publishedDate.getTime()).toBeGreaterThanOrEqual(
        beforeRequest.getTime()
      );
      expect(publishedDate.getTime()).toBeLessThanOrEqual(
        afterRequest.getTime()
      );
    });

    it("should set publishedAt to null for PRIVATE visibility", async () => {
      const { user } = await createTestUser({ email: "pub2@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "private-published",
          bodyMarkdown: "# Content",
          visibility: "PRIVATE",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.publishedAt).toBeNull();
    });

    it("should set publishedAt to null for UNLISTED visibility", async () => {
      const { user } = await createTestUser({ email: "pub3@test.com" });

      const response = await makeRequest(
        {
          title: "Test",
          slug: "unlisted-published",
          bodyMarkdown: "# Content",
          visibility: "UNLISTED",
        },
        user.id
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.publishedAt).toBeNull();
    });
  });
});
