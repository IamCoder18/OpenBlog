import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LogoutButton from "@/components/LogoutButton";

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {});
    vi.spyOn(window, "location", "get").mockReturnValue({
      href: "",
    } as unknown as Location);
  });

  it("renders Logout text", () => {
    render(<LogoutButton />);
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("renders LogOut icon", () => {
    render(<LogoutButton />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls fetch on click", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
    } as Response);

    render(<LogoutButton />);
    const button = screen.getByRole("button");
    await fireEvent.click(button);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/auth/sign-out",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("sets loading state during logout", async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>(resolve => {
      resolveFetch = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(fetchPromise);

    render(<LogoutButton />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.getByText("...")).toBeInTheDocument();

    resolveFetch({ ok: true } as Response);
  });

  it("uses navbar variant by default", () => {
    render(<LogoutButton />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("hidden");
  });

  it("uses sidebar variant when specified", () => {
    render(<LogoutButton variant="sidebar" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("flex");
    expect(button.className).not.toContain("hidden");
  });
});
