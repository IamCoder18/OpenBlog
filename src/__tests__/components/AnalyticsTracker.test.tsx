import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AnalyticsTracker from "@/components/AnalyticsTracker";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

describe("AnalyticsTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
    } as Response);
    vi.spyOn(document, "referrer", "get").mockReturnValue("");
  });

  it("renders null (no visible UI)", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/test");
    const { container } = render(<AnalyticsTracker />);
    expect(container.firstChild).toBeNull();
  });

  it("calls fetch on pathname change", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
    } as Response);
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/initial");

    render(<AnalyticsTracker />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("sends correct path and referrer in body", async () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://example.com/from"
    );
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/test-page");

    let sentBody: string | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      sentBody = options?.body as string;
      return { ok: true } as Response;
    });

    render(<AnalyticsTracker />);

    expect(sentBody).toBeDefined();
    const parsed = JSON.parse(sentBody!);
    expect(parsed.path).toBe("/test-page");
    expect(parsed.referrer).toBe("https://example.com/from");
  });

  it("does not track if pathname has not changed", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
    } as Response);
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/same-path");

    const { rerender } = render(<AnalyticsTracker />);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    rerender(<AnalyticsTracker />);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("silently fails on fetch error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/test");

    expect(() => render(<AnalyticsTracker />)).not.toThrow();

    consoleSpy.mockRestore();
  });
});
