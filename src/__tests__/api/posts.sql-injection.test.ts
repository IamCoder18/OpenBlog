import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    post: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

import { POST } from "@/app/api/posts/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("POST /api/posts - SQL Injection Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts code blocks with SQL keywords", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.post.findUnique as any).mockResolvedValue(null);
    (prisma.post.create as any).mockResolvedValue({
      id: "post-1",
      title: "SQL Post",
      slug: "sql-post",
      bodyMarkdown: "# Content",
      bodyHtml: "<p>Content</p>",
      visibility: "PUBLIC",
      authorId: "user-1",
      publishedAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null,
      author: { id: "user-1", name: "Test", image: null },
    });

    const req = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Post with SQL in code",
        slug: "sql-code-post",
        bodyMarkdown:
          "```sql\nSELECT * FROM users;\nINSERT INTO posts VALUES (1);\n```",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("accepts inline code with SQL keywords", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.post.findUnique as any).mockResolvedValue(null);
    (prisma.post.create as any).mockResolvedValue({
      id: "post-2",
      title: "Inline SQL",
      slug: "inline-sql",
      bodyMarkdown: "# Content",
      bodyHtml: "<p>Content</p>",
      visibility: "PUBLIC",
      authorId: "user-1",
      publishedAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null,
      author: { id: "user-1", name: "Test", image: null },
    });

    const req = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Post with inline SQL",
        slug: "inline-sql-post",
        bodyMarkdown: "Use `SELECT * FROM users` to query",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});
