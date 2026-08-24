import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("page response security headers", () => {
  it("uses a per-request nonce and prevents intermediary HTML transforms", () => {
    const first = proxy(new NextRequest("https://blog.example.com/"));
    const second = proxy(new NextRequest("https://blog.example.com/"));
    const firstPolicy = first.headers.get("content-security-policy");
    const secondPolicy = second.headers.get("content-security-policy");

    expect(firstPolicy).toMatch(/script-src 'self' 'nonce-[^']+'/);
    expect(firstPolicy).toContain("'strict-dynamic'");
    expect(secondPolicy).not.toBe(firstPolicy);
    expect(first.headers.get("cache-control")).toContain("no-transform");
    expect(first.headers.get("cache-control")).toContain("no-store");
  });
});
