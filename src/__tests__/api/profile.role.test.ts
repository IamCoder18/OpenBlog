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
      update: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

import { POST } from "@/app/api/profile/role/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("Profile Role API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated user", async () => {
    (auth.api.getSession as any).mockResolvedValue(null);
    const req = new Request("http://localhost:3000/api/profile/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "AUTHOR" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing role", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    const req = new Request("http://localhost:3000/api/profile/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid role", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    const req = new Request("http://localhost:3000/api/profile/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "INVALID" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("updates role for valid request", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.userProfile.update as any).mockResolvedValue({
      role: "AUTHOR",
    });
    const req = new Request("http://localhost:3000/api/profile/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "AUTHOR" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
