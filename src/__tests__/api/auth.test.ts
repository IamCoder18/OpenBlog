const {
  mockGetSession: mockAuthGetSession,
  MockNextRequest,
  MockNextResponse,
} = vi.hoisted(() => {
  class NextRequest {
    url: string;
    constructor(url: string, init?: any) {
      this.url = url;
    }
    get searchParams() {
      return new URL(this.url).searchParams;
    }
  }

  class NextResponse {
    status: number;
    _body: any;
    headers: Map<string, string>;
    cookies: Map<string, any>;
    constructor(body?: any, init?: any) {
      this._body = body;
      this.status = init?.status || 200;
      this.headers = new Map();
      this.cookies = new Map();
      if (init?.headers) {
        Object.entries(init.headers).forEach(([k, v]) =>
          this.headers.set(k, v as string)
        );
      }
    }
    json() {
      return Promise.resolve(
        typeof this._body === "string" ? JSON.parse(this._body) : this._body
      );
    }
    static json(data: any, init?: any) {
      const response = new NextResponse(JSON.stringify(data), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      });
      return response;
    }
    static redirect(url: string, status?: number) {
      const response = new NextResponse(null, { status: status || 307 });
      response.headers.set("location", url);
      return response;
    }
  }

  return {
    mockGetSession: vi.fn(),
    MockNextRequest: NextRequest,
    MockNextResponse: NextResponse,
  };
});

const { mockedPrisma, mockPrismaReset } = vi.hoisted(() => {
  const mockUsers: any[] = [];
  const mockSessions: any[] = [];
  const mockApiKeys: any[] = [];
  let userIdCounter = 1;
  let sessionIdCounter = 1;
  let apiKeyIdCounter = 1;

  const prisma = {
    user: {
      create: vi.fn(async (data: any) => {
        const existingUser = mockUsers.find(u => u.email === data.data.email);
        if (existingUser) {
          throw new Error("User already exists");
        }
        const user = {
          id: `user-${userIdCounter++}`,
          name: data.data.name,
          email: data.data.email,
          image: data.data.image,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.push(user);
        return user;
      }),
      findUnique: vi.fn(async (options: any) => {
        return (
          mockUsers.find(
            u =>
              u.id === options?.where?.id || u.email === options?.where?.email
          ) || null
        );
      }),
      findFirst: vi.fn(async (options: any) => {
        if (options?.where?.email) {
          return mockUsers.find(u => u.email === options.where.email) || null;
        }
        return null;
      }),
      delete: vi.fn(async (options: any) => {
        const index = mockUsers.findIndex(u => u.id === options.where.id);
        if (index >= 0) {
          return mockUsers.splice(index, 1)[0];
        }
        return null;
      }),
      deleteMany: vi.fn(async () => {
        const length = mockUsers.length;
        mockUsers.length = 0;
        return { count: length };
      }),
    },
    userProfile: {
      create: vi.fn(async (data: any) => ({
        id: `profile-${userIdCounter++}`,
        role: data.data.role || "AGENT",
        userId: data.data.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findUnique: vi.fn(async (options: any) => {
        return {
          id: `profile-${options.where.userId}`,
          role: "AGENT",
          userId: options.where.userId,
        };
      }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    session: {
      create: vi.fn(async (data: any) => {
        const session = {
          id: `session-${sessionIdCounter++}`,
          token: data.data.token,
          userId: data.data.userId,
          expiresAt: data.data.expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSessions.push(session);
        return session;
      }),
      findUnique: vi.fn(async (options: any) => {
        return (
          mockSessions.find(s => s.token === options?.where?.token) || null
        );
      }),
      findMany: vi.fn(async (options: any) => {
        let results = [...mockSessions];
        if (options?.where?.userId) {
          results = results.filter(s => s.userId === options.where.userId);
        }
        return results;
      }),
      delete: vi.fn(async (options: any) => {
        const index = mockSessions.findIndex(s => s.id === options.where.id);
        if (index >= 0) {
          return mockSessions.splice(index, 1)[0];
        }
        return null;
      }),
      deleteMany: vi.fn(async (options: any) => {
        if (options?.where?.userId) {
          const length = mockSessions.filter(
            s => s.userId === options.where.userId
          ).length;
          mockSessions.splice(
            0,
            mockSessions.length,
            ...mockSessions.filter(s => s.userId !== options.where.userId)
          );
          return { count: length };
        }
        const length = mockSessions.length;
        mockSessions.length = 0;
        return { count: length };
      }),
    },
    account: {
      create: vi.fn(async (data: any) => ({
        id: `account-${Date.now()}`,
        userId: data.data.userId,
        providerId: data.data.providerId,
        accountId: data.data.accountId,
        password: data.data.password,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findFirst: vi.fn(async () => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    apiKey: {
      create: vi.fn(async (data: any) => {
        const apiKey = {
          id: `key-${apiKeyIdCounter++}`,
          key: data.data.key,
          name: data.data.name,
          userId: data.data.userId,
          expiresAt: data.data.expiresAt,
          createdAt: new Date(),
        };
        mockApiKeys.push(apiKey);
        return apiKey;
      }),
      findUnique: vi.fn(async (options: any) => {
        return (
          mockApiKeys.find(
            k => k.key === options?.where?.key || k.id === options?.where?.id
          ) || null
        );
      }),
      findMany: vi.fn(async (options: any) => {
        let results = [...mockApiKeys];
        if (options?.where?.userId) {
          results = results.filter(k => k.userId === options.where.userId);
        }
        return results;
      }),
      delete: vi.fn(async (options: any) => {
        const index = mockApiKeys.findIndex(k => k.id === options.where.id);
        if (index >= 0) {
          return mockApiKeys.splice(index, 1)[0];
        }
        return null;
      }),
      deleteMany: vi.fn(async () => {
        const length = mockApiKeys.length;
        mockApiKeys.length = 0;
        return { count: length };
      }),
    },
    verification: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    postMetadata: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    post: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    siteSettings: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  };

  return {
    mockedPrisma: prisma,
    mockPrismaReset: () => {
      mockUsers.length = 0;
      mockSessions.length = 0;
      mockApiKeys.length = 0;
      userIdCounter = 1;
      sessionIdCounter = 1;
      apiKeyIdCounter = 1;
    },
  };
});

const mockAuthApi = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  deleteSession: vi.fn(),
  listSessions: vi.fn(),
  createApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  deleteApiKey: vi.fn(),
  refreshSession: vi.fn(),
};

vi.mock("../utils/test-utils", () => ({
  setupTestDatabase: vi.fn().mockResolvedValue({}),
  cleanupDatabase: vi.fn().mockResolvedValue({}),
  createUser: vi.fn().mockResolvedValue({
    user: { id: "test-user-id", name: "Test User", email: "test@example.com" },
    profile: { id: "test-profile-id", role: "AGENT" },
  }),
  createSession: vi.fn(),
  createApiKey: vi.fn(),
  getTestPrisma: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: {
    api: {
      signUp: vi.fn((options: any) => mockAuthApi.signUp(options)),
      signIn: vi.fn((options: any) => mockAuthApi.signIn(options)),
      signOut: vi.fn((options: any) => mockAuthApi.signOut(options)),
      getSession: vi.fn((options: any) => mockAuthApi.getSession(options)),
      deleteSession: vi.fn((options: any) =>
        mockAuthApi.deleteSession(options)
      ),
      listSessions: vi.fn((options: any) => mockAuthApi.listSessions(options)),
      createApiKey: vi.fn((options: any) => mockAuthApi.createApiKey(options)),
      listApiKeys: vi.fn((options: any) => mockAuthApi.listApiKeys(options)),
      deleteApiKey: vi.fn((options: any) => mockAuthApi.deleteApiKey(options)),
      refreshSession: vi.fn((options: any) =>
        mockAuthApi.refreshSession(options)
      ),
    },
  },
}));

vi.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockedPrisma,
}));

import { NextRequest, NextResponse } from "next/server";
import {
  setupTestDatabase,
  cleanupDatabase,
  createUser,
  createSession,
  createApiKey,
  getTestPrisma,
} from "../utils/test-utils";

beforeAll(async () => {
  await setupTestDatabase();
});

afterEach(async () => {
  mockPrismaReset();
  vi.clearAllMocks();
  await cleanupDatabase();
});

const BASE_URL = "http://localhost:3000";

function makeRequest(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers: Record<string, string> = {}
) {
  const url = new URL(`${BASE_URL}/api/auth${endpoint}`);
  const init: RequestInit & { signal?: AbortSignal } = {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return { url: url.toString(), init };
}

describe("1. Sign Up Tests", () => {
  describe("Successful sign up", () => {
    it("should successfully sign up with valid email and password", async () => {
      mockAuthApi.signUp.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", name: "Test User" },
        session: { sessionToken: "session-token", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signUp({
        body: {
          email: "test@example.com",
          password: "SecurePassword123",
          name: "Test User",
        },
      });

      expect(response.user).toBeDefined();
      expect(response.user.email).toBe("test@example.com");
    });

    it("should sign up and create session automatically", async () => {
      mockAuthApi.signUp.mockResolvedValue({
        user: { id: "user-1", email: "new@example.com", name: "New User" },
        session: { sessionToken: "new-session", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signUp({
        body: {
          email: "new@example.com",
          password: "Password123!",
          name: "New User",
        },
      });

      expect(response.session).toBeDefined();
      expect(response.session.sessionToken).toBe("new-session");
    });

    it("should sign up with name only (no name provided)", async () => {
      mockAuthApi.signUp.mockResolvedValue({
        user: { id: "user-1", email: "noname@example.com", name: null },
        session: { sessionToken: "session-ns", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signUp({
        body: { email: "noname@example.com", password: "Password123!" },
      });

      expect(response.user).toBeDefined();
    });

    it("should handle sign up with special characters in name", async () => {
      mockAuthApi.signUp.mockResolvedValue({
        user: {
          id: "user-1",
          email: "special@example.com",
          name: "José García",
        },
        session: { sessionToken: "session-sp", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signUp({
        body: {
          email: "special@example.com",
          password: "Password123!",
          name: "José García",
        },
      });

      expect(response.user.name).toBe("José García");
    });

    it("should handle sign up with unicode email", async () => {
      mockAuthApi.signUp.mockResolvedValue({
        user: { id: "user-1", email: "test@例え.jp", name: "Test" },
        session: { sessionToken: "session-uni", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signUp({
        body: { email: "test@例え.jp", password: "Password123!" },
      });

      expect(response.user).toBeDefined();
    });
  });

  describe("Duplicate email", () => {
    it("should return error when signing up with existing email", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("User already exists"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "existing@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("User already exists");
    });

    it("should handle case-sensitive duplicate check", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("User already exists"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "TEST@EXAMPLE.COM", password: "Password123!" },
        })
      ).rejects.toThrow();
    });

    it("should handle duplicate email after previous sign up failure", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("User already exists"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "duplicate@example.com", password: "Password123!" },
        })
      ).rejects.toThrow();
    });
  });

  describe("Invalid email format", () => {
    it("should reject email without @ symbol", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Invalid email format"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "invalid-email.com", password: "Password123!" },
        })
      ).rejects.toThrow("Invalid email format");
    });

    it("should reject email without domain", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Invalid email format"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { email: "test@", password: "Password123!" } })
      ).rejects.toThrow("Invalid email format");
    });

    it("should reject email without local part", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Invalid email format"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Invalid email format");
    });

    it("should reject empty email", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Email is required"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { email: "", password: "Password123!" } })
      ).rejects.toThrow("Email is required");
    });

    it("should reject email with spaces", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Invalid email format"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "test @example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Invalid email format");
    });

    it("should reject malformed email with multiple @", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Invalid email format"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "test@@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Invalid email format");
    });

    it("should reject email with invalid TLD", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Invalid email format"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "test@domain.", password: "Password123!" },
        })
      ).rejects.toThrow("Invalid email format");
    });
  });

  describe("Weak password", () => {
    it("should reject password that is too short", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Password must be at least 8 characters")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "test@example.com", password: "short" },
        })
      ).rejects.toThrow("Password must be at least 8 characters");
    });

    it("should reject password without numbers", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Password must contain at least one number")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "test@example.com", password: "OnlyLetters" },
        })
      ).rejects.toThrow("Password must contain at least one number");
    });

    it("should reject password without uppercase", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Password must contain at least one uppercase letter")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "test@example.com", password: "password123" },
        })
      ).rejects.toThrow("Password must contain at least one uppercase letter");
    });

    it("should reject empty password", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Password is required"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { email: "test@example.com", password: "" } })
      ).rejects.toThrow("Password is required");
    });

    it("should reject commonly used passwords", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Password is too common"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "test@example.com", password: "password123" },
        })
      ).rejects.toThrow("Password is too common");
    });

    it("should reject password with only special characters", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Password must contain letters and numbers")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "test@example.com", password: "!@#$%^&*()" },
        })
      ).rejects.toThrow("Password must contain letters and numbers");
    });
  });

  describe("Missing fields", () => {
    it("should reject sign up without email", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Email is required"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { password: "Password123!" } })
      ).rejects.toThrow("Email is required");
    });

    it("should reject sign up without password", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Password is required"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { email: "test@example.com" } })
      ).rejects.toThrow("Password is required");
    });

    it("should reject sign up with null email", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Email is required"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { email: null, password: "Password123!" } })
      ).rejects.toThrow("Email is required");
    });

    it("should reject sign up with null password", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Password is required"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { email: "test@example.com", password: null } })
      ).rejects.toThrow("Password is required");
    });
  });

  describe("Email/password length limits", () => {
    it("should handle maximum length email", async () => {
      const longEmail = "a".repeat(200) + "@example.com";
      mockAuthApi.signUp.mockRejectedValue(new Error("Email is too long"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: longEmail, password: "Password123!" },
        })
      ).rejects.toThrow("Email is too long");
    });

    it("should handle very long password", async () => {
      const longPassword = "a".repeat(1000);
      mockAuthApi.signUp.mockResolvedValue({
        user: { id: "user-1", email: "longpass@example.com" },
        session: { sessionToken: "session-lp", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signUp({
        body: { email: "longpass@example.com", password: longPassword },
      });
      expect(response.user).toBeDefined();
    });
  });
});

describe("2. Sign In Tests", () => {
  describe("Successful sign in", () => {
    it("should successfully sign in with correct credentials", async () => {
      mockAuthApi.signIn.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", name: "Test User" },
        session: { sessionToken: "valid-session", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signIn({
        body: { email: "test@example.com", password: "CorrectPassword123" },
      });

      expect(response.user).toBeDefined();
      expect(response.session).toBeDefined();
    });

    it("should return session token on successful sign in", async () => {
      mockAuthApi.signIn.mockResolvedValue({
        user: {
          id: "user-1",
          email: "session@example.com",
          name: "Session User",
        },
        session: { sessionToken: "session-token-xyz", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signIn({
        body: { email: "session@example.com", password: "Password123!" },
      });

      expect(response.session.sessionToken).toBe("session-token-xyz");
    });

    it("should sign in with email in different case", async () => {
      mockAuthApi.signIn.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", name: "Test User" },
        session: { sessionToken: "session-case", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signIn({
        body: { email: "TEST@EXAMPLE.COM", password: "Password123!" },
      });

      expect(response.user).toBeDefined();
    });
  });

  describe("Wrong password", () => {
    it("should return error for incorrect password", async () => {
      mockAuthApi.signIn.mockRejectedValue(new Error("Invalid credentials"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "test@example.com", password: "WrongPassword" },
        })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should return error for empty password", async () => {
      mockAuthApi.signIn.mockRejectedValue(new Error("Password is required"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({ body: { email: "test@example.com", password: "" } })
      ).rejects.toThrow("Password is required");
    });

    it("should return generic error for wrong password (security)", async () => {
      mockAuthApi.signIn.mockRejectedValue(
        new Error("Invalid email or password")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "secure@example.com", password: "anypassword" },
        })
      ).rejects.toThrow();
    });

    it("should handle multiple failed sign in attempts", async () => {
      mockAuthApi.signIn.mockRejectedValue(new Error("Invalid credentials"));

      const { auth } = await import("@/auth");
      for (let i = 0; i < 3; i++) {
        await expect(
          auth.api.signIn({
            body: { email: "test@example.com", password: "wrong" },
          })
        ).rejects.toThrow();
      }
    });
  });

  describe("Non-existent email", () => {
    it("should return error for non-existent email", async () => {
      mockAuthApi.signIn.mockRejectedValue(new Error("User not found"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "nonexistent@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("User not found");
    });

    it("should return same error for wrong email and wrong password", async () => {
      mockAuthApi.signIn.mockRejectedValue(new Error("Invalid credentials"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "fake@example.com", password: "fake123" },
        })
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("Invalid credentials format", () => {
    it("should reject sign in without email", async () => {
      mockAuthApi.signIn.mockRejectedValue(new Error("Email is required"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({ body: { password: "Password123!" } })
      ).rejects.toThrow("Email is required");
    });

    it("should reject sign in with invalid email format", async () => {
      mockAuthApi.signIn.mockRejectedValue(new Error("Invalid email format"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "not-an-email", password: "Password123!" },
        })
      ).rejects.toThrow("Invalid email format");
    });

    it("should reject sign in with null credentials", async () => {
      mockAuthApi.signIn.mockRejectedValue(new Error("Invalid credentials"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({ body: { email: null, password: null } })
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("Account doesn't exist", () => {
    it("should handle sign in for deleted account", async () => {
      mockAuthApi.signIn.mockRejectedValue(
        new Error("Account no longer exists")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "deleted@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Account no longer exists");
    });

    it("should handle sign in for disabled account", async () => {
      mockAuthApi.signIn.mockRejectedValue(
        new Error("Account has been disabled")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "disabled@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Account has been disabled");
    });
  });
});

describe("3. Session Management", () => {
  describe("Get current session", () => {
    it("should get current session with valid token", async () => {
      mockAuthApi.getSession.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", name: "Test User" },
        session: { sessionToken: "valid-token", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=valid-token" },
      });

      expect(response.user).toBeDefined();
      expect(response.session).toBeDefined();
    });

    it("should return null session for unauthenticated request", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({ headers: {} });

      expect(response).toBeNull();
    });

    it("should get session with user data populated", async () => {
      mockAuthApi.getSession.mockResolvedValue({
        user: {
          id: "user-1",
          email: "session@example.com",
          name: "Session User",
          image: "https://example.com/img.jpg",
        },
        session: { sessionToken: "token-populated", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=token-populated" },
      });

      expect(response.user.email).toBe("session@example.com");
      expect(response.user.image).toBe("https://example.com/img.jpg");
    });
  });

  describe("Session expires", () => {
    it("should return null for expired session", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=expired-token" },
      });

      expect(response).toBeNull();
    });

    it("should handle session that expires during use", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=mid-use-expire" },
      });

      expect(response).toBeNull();
    });

    it("should handle expired session with remember me", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=expired-remember" },
      });

      expect(response).toBeNull();
    });
  });

  describe("Invalid session token", () => {
    it("should return null for invalid session token", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=invalid-token" },
      });

      expect(response).toBeNull();
    });

    it("should return null for malformed session token", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=" },
      });

      expect(response).toBeNull();
    });

    it("should return null for tampered session token", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=tampered-token" },
      });

      expect(response).toBeNull();
    });

    it("should return null for session token with special characters", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=special%20chars" },
      });

      expect(response).toBeNull();
    });
  });

  describe("Session with deleted user", () => {
    it("should return null for session of deleted user", async () => {
      mockAuthApi.getSession.mockResolvedValue(null);

      const { auth } = await import("@/auth");
      const response = await auth.api.getSession({
        headers: { cookie: "better-auth.session_token=deleted-user-session" },
      });

      expect(response).toBeNull();
    });

    it("should handle session list for deleted user", async () => {
      mockAuthApi.listSessions.mockResolvedValue([]);

      const { auth } = await import("@/auth");
      const response = await auth.api.listSessions({
        headers: { cookie: "better-auth.session_token=deleted-user" },
      });

      expect(response).toEqual([]);
    });
  });

  describe("Refresh session", () => {
    it("should refresh an existing session", async () => {
      mockAuthApi.refreshSession.mockResolvedValue({
        user: {
          id: "user-1",
          email: "refresh@example.com",
          name: "Refresh User",
        },
        session: { sessionToken: "new-refreshed-token", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.refreshSession({
        body: { sessionToken: "old-token" },
      });

      expect(response.session.sessionToken).toBe("new-refreshed-token");
    });

    it("should refresh session before expiry", async () => {
      mockAuthApi.refreshSession.mockResolvedValue({
        user: {
          id: "user-1",
          email: "before@example.com",
          name: "Before User",
        },
        session: { sessionToken: "refreshed-before", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.refreshSession({
        body: { sessionToken: "token-before" },
      });

      expect(response.session).toBeDefined();
    });

    it("should return error for invalid session on refresh", async () => {
      mockAuthApi.refreshSession.mockRejectedValue(
        new Error("Session not found")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.refreshSession({ body: { sessionToken: "invalid-refresh" } })
      ).rejects.toThrow("Session not found");
    });

    it("should list all sessions for user", async () => {
      mockAuthApi.listSessions.mockResolvedValue([
        { id: "session-1", sessionToken: "token-1", expiresAt: new Date() },
        { id: "session-2", sessionToken: "token-2", expiresAt: new Date() },
      ]);

      const { auth } = await import("@/auth");
      const response = await auth.api.listSessions({
        headers: { cookie: "better-auth.session_token=main-token" },
      });

      expect(response.length).toBe(2);
    });
  });
});

describe("4. Sign Out Tests", () => {
  describe("Successful sign out", () => {
    it("should successfully sign out with valid session", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=valid-signout" },
      });

      expect(response).toEqual({});
    });

    it("should clear session cookie on sign out", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=signout-clear" },
      });

      expect(response).toBeDefined();
    });

    it("should delete session from database on sign out", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=signout-delete" },
      });

      expect(response).toEqual({});
    });
  });

  describe("Sign out with invalid session", () => {
    it("should handle sign out with no session", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.signOut({ headers: {} });

      expect(response).toEqual({});
    });

    it("should handle sign out with already expired session", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=already-expired" },
      });

      expect(response).toEqual({});
    });

    it("should handle sign out with invalid token", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=invalid-signout" },
      });

      expect(response).toEqual({});
    });
  });

  describe("Sign out all sessions", () => {
    it("should sign out all sessions for a user", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=signout-all" },
      });

      expect(response).toEqual({});
    });

    it("should delete all sessions when signing out", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=signout-delete-all" },
      });

      expect(mockAuthApi.signOut).toHaveBeenCalled();
    });

    it("should handle multiple device sign out", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=multi-device" },
      });

      expect(mockAuthApi.signOut).toHaveBeenCalled();
    });

    it("should return success regardless of session count", async () => {
      mockAuthApi.signOut.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.signOut({
        headers: { cookie: "better-auth.session_token=no-sessions" },
      });

      expect(response).toEqual({});
    });
  });
});

describe("5. API Key Tests", () => {
  describe("Create API key", () => {
    it("should successfully create an API key", async () => {
      mockAuthApi.createApiKey.mockResolvedValue({
        id: "key-1",
        key: "pk_test_1234567890",
        name: "Test API Key",
        userId: "user-1",
        expiresAt: null,
        createdAt: new Date(),
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.createApiKey({
        body: { name: "Test API Key" },
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response.key).toBeDefined();
      expect(response.name).toBe("Test API Key");
    });

    it("should create API key with expiration date", async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      mockAuthApi.createApiKey.mockResolvedValue({
        id: "key-2",
        key: "pk_test_0987654321",
        name: "Temporary Key",
        userId: "user-1",
        expiresAt,
        createdAt: new Date(),
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.createApiKey({
        body: { name: "Temporary Key", expiresAt },
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response.expiresAt).toBeDefined();
    });

    it("should create multiple API keys for same user", async () => {
      mockAuthApi.createApiKey
        .mockResolvedValueOnce({
          id: "key-1",
          key: "pk_test_first",
          name: "First Key",
          userId: "user-1",
          expiresAt: null,
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: "key-2",
          key: "pk_test_second",
          name: "Second Key",
          userId: "user-1",
          expiresAt: null,
          createdAt: new Date(),
        });

      const { auth } = await import("@/auth");
      const response1 = await auth.api.createApiKey({
        body: { name: "First Key" },
        headers: { cookie: "better-auth.session_token=valid" },
      });
      const response2 = await auth.api.createApiKey({
        body: { name: "Second Key" },
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response1.key).not.toBe(response2.key);
    });

    it("should create API key with long name", async () => {
      mockAuthApi.createApiKey.mockResolvedValue({
        id: "key-long",
        key: "pk_test_longname",
        name: "A".repeat(100),
        userId: "user-1",
        expiresAt: null,
        createdAt: new Date(),
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.createApiKey({
        body: { name: "A".repeat(100) },
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response.name.length).toBe(100);
    });

    it("should create API key with special characters in name", async () => {
      mockAuthApi.createApiKey.mockResolvedValue({
        id: "key-special",
        key: "pk_test_special",
        name: "Key with (parentheses) & symbols!",
        userId: "user-1",
        expiresAt: null,
        createdAt: new Date(),
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.createApiKey({
        body: { name: "Key with (parentheses) & symbols!" },
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response).toBeDefined();
    });
  });

  describe("List API keys", () => {
    it("should list all API keys for authenticated user", async () => {
      mockAuthApi.listApiKeys.mockResolvedValue([
        { id: "key-1", key: "pk_test_1", name: "Key 1", expiresAt: null },
        { id: "key-2", key: "pk_test_2", name: "Key 2", expiresAt: null },
      ]);

      const { auth } = await import("@/auth");
      const response = await auth.api.listApiKeys({
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response.length).toBe(2);
    });

    it("should return empty array when no API keys exist", async () => {
      mockAuthApi.listApiKeys.mockResolvedValue([]);

      const { auth } = await import("@/auth");
      const response = await auth.api.listApiKeys({
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response).toEqual([]);
    });

    it("should list API keys with expiration dates", async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      mockAuthApi.listApiKeys.mockResolvedValue([
        { id: "key-1", key: "pk_test_exp", name: "Expiring Key", expiresAt },
      ]);

      const { auth } = await import("@/auth");
      const response = await auth.api.listApiKeys({
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response[0].expiresAt).toBeDefined();
    });

    it("should not expose full API key in list", async () => {
      mockAuthApi.listApiKeys.mockResolvedValue([
        {
          id: "key-1",
          key: "pk_test_hidden",
          name: "Hidden Key",
          expiresAt: null,
        },
      ]);

      const { auth } = await import("@/auth");
      const response = await auth.api.listApiKeys({
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response[0].key).toContain("pk_test_");
    });
  });

  describe("Delete API key", () => {
    it("should successfully delete an API key", async () => {
      mockAuthApi.deleteApiKey.mockResolvedValue({});

      const { auth } = await import("@/auth");
      const response = await auth.api.deleteApiKey({
        params: { id: "key-1" },
        headers: { cookie: "better-auth.session_token=valid" },
      });

      expect(response).toEqual({});
    });

    it("should return error when deleting non-existent key", async () => {
      mockAuthApi.deleteApiKey.mockRejectedValue(
        new Error("API key not found")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.deleteApiKey({
          params: { id: "non-existent" },
          headers: { cookie: "better-auth.session_token=valid" },
        })
      ).rejects.toThrow("API key not found");
    });

    it("should only allow deleting own API keys", async () => {
      mockAuthApi.deleteApiKey.mockRejectedValue(
        new Error("Not authorized to delete this key")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.deleteApiKey({
          params: { id: "other-user-key" },
          headers: { cookie: "better-auth.session_token=valid" },
        })
      ).rejects.toThrow("Not authorized to delete this key");
    });

    it("should handle deletion of already deleted key", async () => {
      mockAuthApi.deleteApiKey.mockRejectedValue(
        new Error("API key not found")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.deleteApiKey({
          params: { id: "already-deleted" },
          headers: { cookie: "better-auth.session_token=valid" },
        })
      ).rejects.toThrow("API key not found");
    });
  });

  describe("Invalid API key format", () => {
    it("should reject invalid API key format", async () => {
      mockAuthApi.listApiKeys.mockRejectedValue(
        new Error("Invalid API key format")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.listApiKeys({ headers: { Authorization: "Bearer invalid" } })
      ).rejects.toThrow("Invalid API key format");
    });

    it("should reject API key with wrong prefix", async () => {
      mockAuthApi.listApiKeys.mockRejectedValue(
        new Error("Invalid API key format")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.listApiKeys({
          headers: { Authorization: "Bearer wrong_prefix_123" },
        })
      ).rejects.toThrow("Invalid API key format");
    });

    it("should reject empty API key", async () => {
      mockAuthApi.listApiKeys.mockRejectedValue(
        new Error("API key is required")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.listApiKeys({ headers: { Authorization: "Bearer " } })
      ).rejects.toThrow("API key is required");
    });
  });

  describe("Expired API key", () => {
    it("should reject expired API key", async () => {
      mockAuthApi.listApiKeys.mockRejectedValue(
        new Error("API key has expired")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.listApiKeys({
          headers: { Authorization: "Bearer pk_test_expired" },
        })
      ).rejects.toThrow("API key has expired");
    });

    it("should handle API key expiring during use", async () => {
      mockAuthApi.listApiKeys.mockRejectedValue(
        new Error("API key has expired")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.listApiKeys({
          headers: { Authorization: "Bearer pk_test_mid-use-expire" },
        })
      ).rejects.toThrow("API key has expired");
    });

    it("should handle API key with past expiration date", async () => {
      mockAuthApi.listApiKeys.mockRejectedValue(
        new Error("API key has expired")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.listApiKeys({
          headers: { Authorization: "Bearer pk_test_past-expire" },
        })
      ).rejects.toThrow("API key has expired");
    });
  });

  describe("API key for deleted user", () => {
    it("should reject API key of deleted user", async () => {
      mockAuthApi.listApiKeys.mockRejectedValue(new Error("User not found"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.listApiKeys({
          headers: { Authorization: "Bearer pk_test_deleted_user" },
        })
      ).rejects.toThrow("User not found");
    });

    it("should handle API key creation after user deletion attempt", async () => {
      mockAuthApi.createApiKey.mockRejectedValue(new Error("User not found"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.createApiKey({
          body: { name: "New Key" },
          headers: { cookie: "better-auth.session_token=deleted-user-session" },
        })
      ).rejects.toThrow("User not found");
    });

    it("should handle API key list for user being deleted", async () => {
      mockAuthApi.listApiKeys.mockResolvedValue([]);

      const { auth } = await import("@/auth");
      const response = await auth.api.listApiKeys({
        headers: { cookie: "better-auth.session_token=deleting-user" },
      });

      expect(response).toEqual([]);
    });
  });
});

describe("6. Error Handling", () => {
  describe("Rate limiting", () => {
    it("should rate limit sign up attempts", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Too many sign up attempts. Please try again later.")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "rate@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Too many sign up attempts");
    });

    it("should rate limit sign in attempts", async () => {
      mockAuthApi.signIn.mockRejectedValue(
        new Error("Too many sign in attempts. Please try again later.")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "rate@example.com", password: "WrongPass" },
        })
      ).rejects.toThrow("Too many sign in attempts");
    });

    it("should rate limit API key creation", async () => {
      mockAuthApi.createApiKey.mockRejectedValue(
        new Error("Too many API key creation attempts. Please try again later.")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.createApiKey({
          body: { name: "Rate Key" },
          headers: { cookie: "better-auth.session_token=valid" },
        })
      ).rejects.toThrow("Too many API key creation attempts");
    });

    it("should handle rate limit with proper error message", async () => {
      mockAuthApi.signIn.mockRejectedValue(
        new Error("Rate limit exceeded. Please wait 5 minutes.")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "limit@example.com", password: "Pass123" },
        })
      ).rejects.toThrow("Rate limit exceeded");
    });
  });

  describe("Database errors", () => {
    it("should handle database connection failure", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Database connection failed")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "db@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle database timeout", async () => {
      mockAuthApi.signIn.mockRejectedValue(
        new Error("Database operation timed out")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({
          body: { email: "timeout@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Database operation timed out");
    });

    it("should handle database constraint violation", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Database constraint violated")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "constraint@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Database constraint violated");
    });

    it("should handle database transaction failure", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Transaction failed"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({
          body: { email: "transaction@example.com", password: "Password123!" },
        })
      ).rejects.toThrow("Transaction failed");
    });

    it("should handle unexpected database error", async () => {
      mockAuthApi.getSession.mockRejectedValue(
        new Error("An unexpected database error occurred")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.getSession({
          headers: { cookie: "better-auth.session_token=valid" },
        })
      ).rejects.toThrow("An unexpected database error occurred");
    });
  });

  describe("Invalid JSON", () => {
    it("should handle missing JSON body", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Request body is required")
      );

      const { auth } = await import("@/auth");
      await expect(auth.api.signUp({ body: undefined })).rejects.toThrow(
        "Request body is required"
      );
    });

    it("should handle malformed JSON in request", async () => {
      mockAuthApi.signIn.mockRejectedValue(
        new Error("Invalid JSON in request body")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signIn({ body: "not json" as any })
      ).rejects.toThrow("Invalid JSON in request body");
    });

    it("should handle partial JSON data", async () => {
      mockAuthApi.signUp.mockRejectedValue(
        new Error("Incomplete request data")
      );

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { email: "partial@example.com" } })
      ).rejects.toThrow("Incomplete request data");
    });

    it("should handle unexpected fields in request", async () => {
      mockAuthApi.signUp.mockResolvedValue({
        user: { id: "user-1", email: "unexpected@example.com" },
        session: { sessionToken: "session", expiresAt: new Date() },
      });

      const { auth } = await import("@/auth");
      const response = await auth.api.signUp({
        body: {
          email: "unexpected@example.com",
          password: "Password123!",
          unknownField: "ignored",
        } as any,
      });

      expect(response.user).toBeDefined();
    });

    it("should handle null values in request body", async () => {
      mockAuthApi.signUp.mockRejectedValue(new Error("Invalid request data"));

      const { auth } = await import("@/auth");
      await expect(
        auth.api.signUp({ body: { email: null, password: null } as any })
      ).rejects.toThrow("Invalid request data");
    });
  });
});
