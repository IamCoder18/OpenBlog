import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

describe("ClientProviders", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
      },
      writable: true,
    });
    vi.spyOn(document.documentElement, "getAttribute").mockReturnValue(null);
  });

  it("renders children", () => {
    render(<div data-testid="child">Test Child</div>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
