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
    apiKey: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

import { DELETE } from "@/app/api/keys/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("API Key by ID API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated user", async () => {
    (auth.api.getSession as any).mockResolvedValue(null);
    const req = new Request("http://localhost/api/keys/key-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "key-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 if key not found", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.apiKey.findUnique as any).mockResolvedValue(null);
    const req = new Request("http://localhost/api/keys/key-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "key-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 if user doesn't own the key", async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.apiKey.findUnique as any).mockResolvedValue({
      userId: "user-2",
    });
    const req = new Request("http://localhost/api/keys/key-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "key-1" }) });
    expect(res.status).toBe(403);
  });
});
