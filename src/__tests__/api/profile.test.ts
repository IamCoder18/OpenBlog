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
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

import { GET, PUT } from "@/app/api/profile/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("Profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 for unauthenticated user", async () => {
      (auth.api.getSession as any).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns 404 if user not found", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.user.findUnique as any).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(404);
    });

    it("returns user data for authenticated user", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-1",
        name: "Test",
        email: "test@example.com",
        image: null,
        createdAt: new Date(),
        profile: { role: "AGENT" },
      });
      const res = await GET();
      expect(res.status).toBe(200);
    });
  });

  describe("PUT", () => {
    it("returns 401 for unauthenticated user", async () => {
      (auth.api.getSession as any).mockResolvedValue(null);
      const req = new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 for empty name", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      const req = new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  " }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });
  });
});
