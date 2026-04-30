import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSession,
  requireAuth,
  requireAdmin,
  requireAuthOrAbove,
} from "@/lib/session";

vi.mock("@/lib/auth", () => ({
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  it("returns null user when no session", async () => {
    const { auth } = await import("@/lib/auth");
    (auth.api.getSession as any).mockResolvedValue(null);
    const result = await getSession();
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
  });

  it("returns user with profile role", async () => {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      session: { id: "sess-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({ role: "ADMIN" });
    const result = await getSession();
    expect(result.user).not.toBeNull();
    expect(result.user?.role).toBe("ADMIN");
    expect(result.user?.name).toBe("Test");
  });

  it("defaults to AGENT role when profile missing", async () => {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      session: { id: "sess-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue(null);
    const result = await getSession();
    expect(result.user?.role).toBe("AGENT");
  });

  it("handles errors gracefully", async () => {
    const { auth } = await import("@/lib/auth");
    (auth.api.getSession as any).mockRejectedValue(new Error("Auth error"));
    const result = await getSession();
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
  });
});

describe("requireAuth", () => {
  it("returns user when authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      session: { id: "sess-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({
      role: "AUTHOR",
    });
    const user = await requireAuth();
    expect(user).not.toBeNull();
    expect(user.role).toBe("AUTHOR");
  });

  it("throws UNAUTHORIZED when not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    (auth.api.getSession as any).mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("requireAdmin", () => {
  it("returns user when ADMIN", async () => {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      session: { id: "sess-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({ role: "ADMIN" });
    const user = await requireAdmin();
    expect(user.role).toBe("ADMIN");
  });

  it("throws FORBIDDEN when not ADMIN", async () => {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "sess-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({
      role: "AUTHOR",
    });
    await expect(requireAdmin()).rejects.toThrow("FORBIDDEN");
  });
});

describe("requireAuthOrAbove", () => {
  it("allows AUTHOR", async () => {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "sess-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({
      role: "AUTHOR",
    });
    const user = await requireAuthOrAbove();
    expect(user).not.toBeNull();
  });

  it("allows ADMIN", async () => {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "sess-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({ role: "ADMIN" });
    const user = await requireAuthOrAbove();
    expect(user).not.toBeNull();
  });

  it("throws FORBIDDEN for AGENT", async () => {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "sess-1" },
    });
    (prisma.userProfile.findUnique as any).mockResolvedValue({ role: "AGENT" });
    await expect(requireAuthOrAbove()).rejects.toThrow("FORBIDDEN");
  });
});
