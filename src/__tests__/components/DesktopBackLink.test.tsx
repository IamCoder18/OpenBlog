import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DesktopBackLink from "@/components/DesktopBackLink";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { useRouter } from "next/navigation";

describe("DesktopBackLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "location", "get").mockReturnValue({
      origin: "https://example.com",
    } as unknown as Location);
  });

  it("renders nothing when referrer is empty", () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue("");
    const { container } = render(<DesktopBackLink />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when referrer is from different origin", () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://other-site.com/page"
    );
    const { container } = render(<DesktopBackLink />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "back to Explore" when referrer is /explore', () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://example.com/explore"
    );
    render(<DesktopBackLink />);
    expect(screen.getByText(/back to Explore/i)).toBeInTheDocument();
  });

  it('renders "back to Feed" when referrer is /', () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://example.com/"
    );
    render(<DesktopBackLink />);
    expect(screen.getByText(/back to Feed/i)).toBeInTheDocument();
  });

  it('renders "back to Dashboard" when referrer starts with /dashboard', () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://example.com/dashboard/stories"
    );
    render(<DesktopBackLink />);
    expect(screen.getByText(/back to Dashboard/i)).toBeInTheDocument();
  });

  it('renders generic "Back" for other same-origin referrers', () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://example.com/some-other-page"
    );
    render(<DesktopBackLink />);
    expect(screen.getByText(/back/i)).toBeInTheDocument();
  });

  it("links to / when no specific path matches", () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://example.com/some-page"
    );
    render(<DesktopBackLink />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
  });

  it("is hidden on mobile (md:inline-flex)", () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://example.com/explore"
    );
    render(<DesktopBackLink />);
    const link = screen.getByRole("link");
    expect(link.className).toContain("hidden");
    expect(link.className).toContain("md:inline-flex");
  });

  it("contains ArrowLeft icon", () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://example.com/explore"
    );
    render(<DesktopBackLink />);
    const link = screen.getByRole("link");
    expect(link.querySelector("svg")).toBeInTheDocument();
  });
});
