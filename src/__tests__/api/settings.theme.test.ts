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
    siteSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

import { GET, PUT } from "@/app/api/settings/theme/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("Theme Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns default theme when no setting exists", async () => {
      (prisma.siteSettings.findUnique as any).mockResolvedValue(null);
      const res = await GET();
      const body = await res.json();
      expect(body.theme).toBe("default");
    });

    it("returns saved theme", async () => {
      (prisma.siteSettings.findUnique as any).mockResolvedValue({
        value: "ocean",
      });
      const res = await GET();
      const body = await res.json();
      expect(body.theme).toBe("ocean");
    });
  });

  describe("PUT", () => {
    it("returns 401 for unauthenticated user", async () => {
      (auth.api.getSession as any).mockResolvedValue(null);
      const req = new Request("http://localhost:3000/api/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "ocean" }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin user", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.userProfile.findUnique as any).mockResolvedValue({
        role: "AGENT",
      });
      const req = new Request("http://localhost:3000/api/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "ocean" }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(403);
    });
  });
});
