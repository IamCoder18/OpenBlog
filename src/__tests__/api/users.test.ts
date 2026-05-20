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
      findMany: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

import { GET } from "@/app/api/users/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("Users API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated user", async () => {
    (auth.api.getSession as any).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin user", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({
      role: "AGENT",
    });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns users list for admin", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "admin-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({
      role: "ADMIN",
    });
    (prisma.user.findMany as any).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
