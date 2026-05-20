import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/db", () => ({
  prisma: {
    pageView: {
      create: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { POST, GET } from "@/app/api/analytics/route";
import { auth } from "@/auth";

describe("Analytics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
  });

  describe("POST /api/analytics", () => {
    it("returns 400 if path is missing", async () => {
      const req = new Request("http://localhost/api/analytics", {
        method: "POST",
        body: JSON.stringify({}),
      }) as any;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("records a page view", async () => {
      (prisma.pageView.create as any).mockResolvedValue({});
      const req = new Request("http://localhost/api/analytics", {
        method: "POST",
        body: JSON.stringify({ path: "/blog/test-post" }),
        headers: { "user-agent": "test-browser" },
      }) as any;
      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(prisma.pageView.create).toHaveBeenCalled();
    });
  });

  describe("GET /api/analytics", () => {
    it("returns analytics data", async () => {
      (prisma.pageView.count as any).mockResolvedValue(100);
      (prisma.$queryRaw as any).mockResolvedValue([
        { date: "2026-03-20", views: 10 },
        { date: "2026-03-21", views: 15 },
      ]);
      (prisma.pageView.groupBy as any).mockResolvedValue([]);
      const req = new Request("http://localhost/api/analytics?days=30") as any;
      const res = await GET(req);
      const data = await res.json();
      expect(data.totalViews).toBe(100);
      expect(data.viewsByDay).toHaveLength(2);
    });
  });
});
