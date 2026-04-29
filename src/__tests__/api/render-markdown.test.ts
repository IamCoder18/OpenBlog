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
    userProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

// Import the actual route handler (don't mock renderMarkdown)
import { POST } from "@/app/api/render-markdown/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("Render Markdown API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated user", async () => {
    (auth.api.getSession as any).mockResolvedValue(null);
    const req = new Request("http://localhost:3000/api/render-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: "# Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for guest user", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({ role: "GUEST" });
    const req = new Request("http://localhost:3000/api/render-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: "# Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing markdown", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({ role: "AGENT" });
    const req = new Request("http://localhost:3000/api/render-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("renders markdown with actual renderer", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({ role: "AGENT" });
    const req = new Request("http://localhost:3000/api/render-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: "# Hello World" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.html).toBeDefined();
    expect(data.html).toContain("Hello World");
  });

  it("strips HTML comments before sanitization", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({ role: "AGENT" });
    const markdown = "# Test <!-- <script>alert('xss')</script> --> content";
    const req = new Request("http://localhost:3000/api/render-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    // The HTML comment and script should be stripped
    expect(data.html).not.toContain("<script>");
  });
});
