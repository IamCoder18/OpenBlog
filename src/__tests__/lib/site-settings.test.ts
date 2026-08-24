import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "BLOG_NAME",
  "BLOG_DESCRIPTION",
  "SITE_LOGO_URL",
  "SITE_CONTACT_EMAIL",
  "SITE_SOCIAL_URL",
] as const;

const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

afterEach(() => {
  for (const key of ENV_KEYS) {
    const original = originalEnv[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
  vi.resetModules();
});

describe("site settings — env precedence", () => {
  it("reports every field as not overridden when no env vars are set", async () => {
    for (const key of ENV_KEYS) delete process.env[key];
    const { getSiteProfileEnvOverrides } = await import("@/lib/site-settings");
    expect(getSiteProfileEnvOverrides()).toEqual({
      name: false,
      description: false,
      logoUrl: false,
      contactEmail: false,
      socialUrl: false,
    });
  });

  it("flags a field as overridden when its env var is set (even empty string is ignored)", async () => {
    process.env.BLOG_NAME = "  From Env  ";
    delete process.env.BLOG_DESCRIPTION;
    const { getSiteProfileEnvOverrides } = await import("@/lib/site-settings");
    const overrides = getSiteProfileEnvOverrides();
    expect(overrides.name).toBe(true);
    expect(overrides.description).toBe(false);
  });

  it("treats whitespace-only env values as not set", async () => {
    process.env.BLOG_NAME = "   ";
    const { getSiteProfileEnvOverrides } = await import("@/lib/site-settings");
    expect(getSiteProfileEnvOverrides().name).toBe(false);
  });
});

describe("site settings — getSiteProfile precedence", () => {
  it("uses env value for name when BLOG_NAME is set, ignoring any stored DB row", async () => {
    process.env.BLOG_NAME = "Env Wins";
    delete process.env.BLOG_DESCRIPTION;
    const findUnique = vi.fn().mockResolvedValue({
      key: "site_profile",
      value: JSON.stringify({
        name: "DB Name",
        description: "DB Description",
      }),
    });
    vi.doMock("@/lib/db", () => ({ prisma: { siteSettings: { findUnique } } }));
    const { getSiteProfile } = await import("@/lib/site-settings");
    const profile = await getSiteProfile();
    expect(profile.name).toBe("Env Wins");
    expect(profile.description).toBe("DB Description");
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("falls back to stored DB value when env is unset", async () => {
    delete process.env.BLOG_NAME;
    delete process.env.BLOG_DESCRIPTION;
    process.env.SITE_LOGO_URL = "https://cdn.example.com/logo.png";
    const findUnique = vi.fn().mockResolvedValue({
      key: "site_profile",
      value: JSON.stringify({
        name: "DB Name",
        description: "DB Description",
        logoUrl: "",
        contactEmail: "",
        socialUrl: "",
      }),
    });
    vi.doMock("@/lib/db", () => ({ prisma: { siteSettings: { findUnique } } }));
    const { getSiteProfile } = await import("@/lib/site-settings");
    const profile = await getSiteProfile();
    expect(profile.name).toBe("DB Name");
    expect(profile.description).toBe("DB Description");
    expect(profile.logoUrl).toBe("https://cdn.example.com/logo.png");
  });

  it("env wins for every individual field independently", async () => {
    process.env.BLOG_NAME = "Env Name";
    process.env.BLOG_DESCRIPTION = "Env Description";
    process.env.SITE_LOGO_URL = "https://env.example/logo.png";
    process.env.SITE_CONTACT_EMAIL = "env@example.com";
    process.env.SITE_SOCIAL_URL = "https://social.example";
    const findUnique = vi.fn().mockResolvedValue({
      key: "site_profile",
      value: JSON.stringify({
        name: "DB Name",
        description: "DB Description",
        logoUrl: "https://db.example/logo.png",
        contactEmail: "db@example.com",
        socialUrl: "https://db.example/social",
      }),
    });
    vi.doMock("@/lib/db", () => ({ prisma: { siteSettings: { findUnique } } }));
    const { getSiteProfile } = await import("@/lib/site-settings");
    const profile = await getSiteProfile();
    expect(profile).toEqual({
      name: "Env Name",
      description: "Env Description",
      logoUrl: "https://env.example/logo.png",
      contactEmail: "env@example.com",
      socialUrl: "https://social.example",
    });
  });

  it("falls back to config.BLOG_NAME only when env and DB are both absent", async () => {
    delete process.env.BLOG_NAME;
    delete process.env.BLOG_DESCRIPTION;
    process.env.BLOG_NAME = "From Env Final";
    const findUnique = vi.fn().mockResolvedValue(null);
    vi.doMock("@/lib/db", () => ({ prisma: { siteSettings: { findUnique } } }));
    const { getSiteProfile } = await import("@/lib/site-settings");
    const profile = await getSiteProfile();
    expect(profile.name).toBe("From Env Final");
  });
});
