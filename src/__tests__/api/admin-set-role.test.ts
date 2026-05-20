import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
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
    },
    userProfile: {
      update: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/admin/set-role/route";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

describe("POST /api/admin/set-role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    return new NextRequest("http://localhost/api/admin/set-role", {
      method: "POST",
      headers: new Headers(headers),
      body: JSON.stringify(body),
    });
  };

  describe("1. Authentication", () => {
    it("should return 401 when no session user", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue(null);

      const req = createRequest({ email: "test@example.com", role: "ADMIN" });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session is undefined", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue(undefined);

      const req = createRequest({ email: "test@example.com", role: "ADMIN" });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
    });
  });

  describe("2. Input Validation", () => {
    it("should return 400 when email is missing", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });

      const req = createRequest(
        { role: "ADMIN" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing email or role");
    });

    it("should return 400 when role is missing", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });

      const req = createRequest(
        { email: "test@example.com" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing email or role");
    });

    it("should return 400 when both email and role are missing", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });

      const req = createRequest({}, { authorization: "Bearer token" });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe("3. User Lookup", () => {
    it("should return 404 when user not found by email", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });
      (prisma.user.findUnique as vi.Mock).mockResolvedValue(null);

      const req = createRequest(
        { email: "nonexistent@example.com", role: "ADMIN" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should find user by email", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });
      (prisma.user.findUnique as vi.Mock).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });
      (prisma.userProfile.update as vi.Mock).mockResolvedValue({
        role: "ADMIN",
      });

      const req = createRequest(
        { email: "test@example.com", role: "ADMIN" },
        { authorization: "Bearer token" }
      );
      await POST(req);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });
  });

  describe("4. Role Update", () => {
    it("should update user role successfully", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });
      (prisma.user.findUnique as vi.Mock).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });
      (prisma.userProfile.update as vi.Mock).mockResolvedValue({
        role: "ADMIN",
      });

      const req = createRequest(
        { email: "test@example.com", role: "ADMIN" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.role).toBe("ADMIN");
      expect(prisma.userProfile.update).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        data: { role: "ADMIN" },
      });
    });

    it("should return correct role value after update", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });
      (prisma.user.findUnique as vi.Mock).mockResolvedValue({
        id: "user-456",
        email: "agent@example.com",
      });
      (prisma.userProfile.update as vi.Mock).mockResolvedValue({
        role: "AGENT",
      });

      const req = createRequest(
        { email: "agent@example.com", role: "AGENT" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(data.role).toBe("AGENT");
    });
  });

  describe("5. Different Role Values", () => {
    it("should handle ADMIN role", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });
      (prisma.user.findUnique as vi.Mock).mockResolvedValue({
        id: "user-admin",
        email: "admin@example.com",
      });
      (prisma.userProfile.update as vi.Mock).mockResolvedValue({
        role: "ADMIN",
      });

      const req = createRequest(
        { email: "admin@example.com", role: "ADMIN" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.role).toBe("ADMIN");
    });

    it("should handle AGENT role", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });
      (prisma.user.findUnique as vi.Mock).mockResolvedValue({
        id: "user-agent",
        email: "agent@example.com",
      });
      (prisma.userProfile.update as vi.Mock).mockResolvedValue({
        role: "AGENT",
      });

      const req = createRequest(
        { email: "agent@example.com", role: "AGENT" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.role).toBe("AGENT");
    });

    it("should handle AUTHOR role", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });
      (prisma.user.findUnique as vi.Mock).mockResolvedValue({
        id: "user-author",
        email: "author@example.com",
      });
      (prisma.userProfile.update as vi.Mock).mockResolvedValue({
        role: "AUTHOR",
      });

      const req = createRequest(
        { email: "author@example.com", role: "AUTHOR" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.role).toBe("AUTHOR");
    });

    it("should handle GUEST role", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({ user: { id: "1" } });
      (prisma.user.findUnique as vi.Mock).mockResolvedValue({
        id: "user-guest",
        email: "guest@example.com",
      });
      (prisma.userProfile.update as vi.Mock).mockResolvedValue({
        role: "GUEST",
      });

      const req = createRequest(
        { email: "guest@example.com", role: "GUEST" },
        { authorization: "Bearer token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.role).toBe("GUEST");
    });
  });

  describe("6. Successful Role Update Flow", () => {
    it("should complete full flow with authenticated user", async () => {
      (auth.api.getSession as vi.Mock).mockResolvedValue({
        user: { id: "admin-user-id", email: "admin@test.com" },
      });

      const mockUser = {
        id: "target-user-id",
        email: "target@example.com",
        name: "Target User",
      };
      (prisma.user.findUnique as vi.Mock).mockResolvedValue(mockUser);

      const mockUpdatedProfile = {
        role: "ADMIN",
        userId: "target-user-id",
      };
      (prisma.userProfile.update as vi.Mock).mockResolvedValue(
        mockUpdatedProfile
      );

      const req = createRequest(
        { email: "target@example.com", role: "ADMIN" },
        { authorization: "Bearer valid-token" }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.role).toBe("ADMIN");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "target@example.com" },
      });
      expect(prisma.userProfile.update).toHaveBeenCalledWith({
        where: { userId: "target-user-id" },
        data: { role: "ADMIN" },
      });
    });
  });
});
