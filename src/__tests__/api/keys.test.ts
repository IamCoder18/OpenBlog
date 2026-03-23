import { describe, it, expect, vi, beforeEach } from "vitest";

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
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: () => new Headers(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { GET, POST } from "@/app/api/keys/route";
import { DELETE } from "@/app/api/keys/[id]/route";

describe("API Keys API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/keys", () => {
    it("returns 401 if not authenticated", async () => {
      (auth.api.getSession as any).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns keys for authenticated user", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.apiKey.findMany as any).mockResolvedValue([
        {
          id: "key-1",
          name: "Test Key",
          key: "ob_abc123",
          createdAt: new Date(),
          expiresAt: null,
        },
      ]);
      const res = await GET();
      const data = await res.json();
      expect(data.keys).toHaveLength(1);
      expect(data.keys[0].name).toBe("Test Key");
    });
  });

  describe("POST /api/keys", () => {
    it("returns 401 if not authenticated", async () => {
      (auth.api.getSession as any).mockResolvedValue(null);
      const req = new Request("http://localhost/api/keys", {
        method: "POST",
        body: JSON.stringify({ name: "My Key" }),
      }) as any;
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 if name is missing", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      const req = new Request("http://localhost/api/keys", {
        method: "POST",
        body: JSON.stringify({}),
      }) as any;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates an API key", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.apiKey.create as any).mockResolvedValue({
        id: "key-1",
        name: "My Key",
        key: "ob_abc123",
        createdAt: new Date(),
        expiresAt: null,
      });
      const req = new Request("http://localhost/api/keys", {
        method: "POST",
        body: JSON.stringify({ name: "My Key" }),
      }) as any;
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe("My Key");
      expect(data.key).toMatch(/^ob_/);
    });
  });

  describe("DELETE /api/keys/[id]", () => {
    it("returns 401 if not authenticated", async () => {
      (auth.api.getSession as any).mockResolvedValue(null);
      const req = new Request("http://localhost/api/keys/key-1", {
        method: "DELETE",
      }) as any;
      const params = Promise.resolve({ id: "key-1" });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(401);
    });

    it("returns 404 if key not found", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.apiKey.findUnique as any).mockResolvedValue(null);
      const req = new Request("http://localhost/api/keys/key-1", {
        method: "DELETE",
      }) as any;
      const params = Promise.resolve({ id: "key-1" });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(404);
    });

    it("returns 403 if key belongs to different user", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.apiKey.findUnique as any).mockResolvedValue({
        id: "key-1",
        userId: "user-2",
      });
      const req = new Request("http://localhost/api/keys/key-1", {
        method: "DELETE",
      }) as any;
      const params = Promise.resolve({ id: "key-1" });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(403);
    });

    it("deletes key successfully", async () => {
      (auth.api.getSession as any).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.apiKey.findUnique as any).mockResolvedValue({
        id: "key-1",
        userId: "user-1",
      });
      (prisma.apiKey.delete as any).mockResolvedValue({});
      const req = new Request("http://localhost/api/keys/key-1", {
        method: "DELETE",
      }) as any;
      const params = Promise.resolve({ id: "key-1" });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(200);
    });
  });
});
