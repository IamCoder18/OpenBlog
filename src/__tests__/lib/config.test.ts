import { config, getSiteSettings } from "@/lib/config";
import { prisma } from "@/lib/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSettings: {
      findFirst: vi.fn(),
    },
  },
}));

describe("config", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    delete process.env.NEXT_PUBLIC_BLOG_NAME;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.PORT;
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("config object getters - default values", () => {
    it("should return default BLOG_NAME", () => {
      expect(config.BLOG_NAME).toBe("OpenBlog");
    });

    it("should return default BASE_URL", () => {
      expect(config.BASE_URL).toBe("http://localhost:3000");
    });

    it("should return default PORT as number", () => {
      expect(config.PORT).toBe(3000);
      expect(typeof config.PORT).toBe("number");
    });

    it("should return empty DATABASE_URL", () => {
      expect(config.DATABASE_URL).toBe("");
    });

    it("should return empty AUTH_SECRET", () => {
      expect(config.AUTH_SECRET).toBe("");
    });

    it("should return default NODE_ENV as development", () => {
      expect(config.NODE_ENV).toBe("development");
    });
  });

  describe("config object getters - custom values from env vars", () => {
    it("should return custom BLOG_NAME", () => {
      process.env.NEXT_PUBLIC_BLOG_NAME = "My Custom Blog";
      expect(config.BLOG_NAME).toBe("My Custom Blog");
    });

    it("should return custom BASE_URL", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
      expect(config.BASE_URL).toBe("https://example.com");
    });

    it("should return custom PORT", () => {
      process.env.PORT = "8080";
      expect(config.PORT).toBe(8080);
      expect(typeof config.PORT).toBe("number");
    });

    it("should return custom DATABASE_URL", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
      expect(config.DATABASE_URL).toBe(
        "postgresql://user:pass@localhost:5432/db"
      );
    });

    it("should return custom AUTH_SECRET", () => {
      process.env.AUTH_SECRET = "my-secret-key";
      expect(config.AUTH_SECRET).toBe("my-secret-key");
    });

    it("should return custom NODE_ENV", () => {
      process.env.NODE_ENV = "production";
      expect(config.NODE_ENV).toBe("production");
    });

    it("should return test NODE_ENV", () => {
      process.env.NODE_ENV = "test";
      expect(config.NODE_ENV).toBe("test");
    });
  });

  describe("config object getters behavior", () => {
    it("should read fresh env values each time getter is accessed", () => {
      process.env.NEXT_PUBLIC_BLOG_NAME = "First";
      const first = config.BLOG_NAME;
      process.env.NEXT_PUBLIC_BLOG_NAME = "Second";
      const second = config.BLOG_NAME;
      expect(first).toBe("First");
      expect(second).toBe("Second");
    });

    it("should return PORT as number even when env is string", () => {
      process.env.PORT = "4000";
      expect(config.PORT).toBe(4000);
      expect(typeof config.PORT).toBe("number");
    });

    it("should handle PORT with leading zeros", () => {
      process.env.PORT = "0800";
      expect(config.PORT).toBe(800);
    });

    it("should handle empty string PORT gracefully", () => {
      process.env.PORT = "";
      expect(config.PORT).toBe(3000);
    });
  });

  describe("config.SIGN_UP_ENABLED", () => {
    it("should return false by default (env var not set)", () => {
      delete process.env.SIGN_UP_ENABLED;
      expect(config.SIGN_UP_ENABLED).toBe(false);
    });

    it("should return true when SIGN_UP_ENABLED is 'true'", () => {
      process.env.SIGN_UP_ENABLED = "true";
      expect(config.SIGN_UP_ENABLED).toBe(true);
    });

    it("should return false when SIGN_UP_ENABLED is 'false'", () => {
      process.env.SIGN_UP_ENABLED = "false";
      expect(config.SIGN_UP_ENABLED).toBe(false);
    });
 
    it("should return false for non-'true' values", () => {
      process.env.SIGN_UP_ENABLED = "1";
      expect(config.SIGN_UP_ENABLED).toBe(false);
    });
  });

  describe("getSiteSettings", () => {
    it("should return null when no settings exist", async () => {
      vi.mocked(prisma.siteSettings.findFirst).mockResolvedValueOnce(null);
      const result = await getSiteSettings();
      expect(result).toBeNull();
      expect(prisma.siteSettings.findFirst).toHaveBeenCalledTimes(1);
    });

    it("should return site settings when they exist", async () => {
      const mockSettings = {
        id: 1,
        blogName: "Test Blog",
        description: "Test description",
      };
      vi.mocked(prisma.siteSettings.findFirst).mockResolvedValueOnce(
        mockSettings
      );
      const result = await getSiteSettings();
      expect(result).toEqual(mockSettings);
      expect(prisma.siteSettings.findFirst).toHaveBeenCalledTimes(1);
    });

    it("should call findFirst without arguments", async () => {
      vi.mocked(prisma.siteSettings.findFirst).mockResolvedValueOnce(null);
      await getSiteSettings();
      expect(prisma.siteSettings.findFirst).toHaveBeenCalledWith();
    });
  });
});
