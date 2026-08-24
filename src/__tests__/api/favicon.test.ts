import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { siteSettingsFindUnique } = vi.hoisted(() => ({
  siteSettingsFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSettings: { findUnique: siteSettingsFindUnique },
  },
}));

import { GET } from "@/app/favicon.ico/route";

describe("GET /favicon.ico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SITE_LOGO_URL", "");
    siteSettingsFindUnique.mockResolvedValue(null);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("redirects to the configured site logo without caching the result", async () => {
    vi.stubEnv("SITE_LOGO_URL", "https://cdn.example.com/site-logo.png");

    const response = await GET(
      new Request("https://blog.example.com/favicon.ico")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://cdn.example.com/site-logo.png"
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("uses the bundled favicon when no site logo is configured", async () => {
    const response = await GET(
      new Request("https://blog.example.com/favicon.ico")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://blog.example.com/default-favicon.ico"
    );
  });
});
