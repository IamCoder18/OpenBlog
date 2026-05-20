import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import QueryToast from "@/components/QueryToast";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/components/ToastContext", () => ({
  useToast: vi.fn(),
}));

import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastContext";

describe("QueryToast", () => {
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast: mockAddToast,
    });
  });

  it("renders without crashing", () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });

    render(<QueryToast />);
    expect(screen.getByTestId("query-toast")).toBeInTheDocument();
  });

  it("shows toast for UNAUTHORIZED error", () => {
    const mockGet = vi.fn().mockReturnValue("UNAUTHORIZED");
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
    });

    render(<QueryToast />);

    expect(mockAddToast).toHaveBeenCalledWith(
      "error",
      "You are not authorized to access this page."
    );
  });

  it("shows toast for FORBIDDEN error", () => {
    const mockGet = vi.fn().mockReturnValue("FORBIDDEN");
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
    });

    render(<QueryToast />);

    expect(mockAddToast).toHaveBeenCalledWith(
      "error",
      "You don't have permission to access this resource."
    );
  });

  it("shows toast for dashboard_unauthorized error", () => {
    const mockGet = vi.fn().mockReturnValue("dashboard_unauthorized");
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
    });

    render(<QueryToast />);

    expect(mockAddToast).toHaveBeenCalledWith(
      "error",
      "You don't have permission to access the dashboard."
    );
  });

  it("does not show toast for unknown error", () => {
    const mockGet = vi.fn().mockReturnValue("UNKNOWN_ERROR");
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
    });

    render(<QueryToast />);

    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it("does not show toast when no error param", () => {
    const mockGet = vi.fn().mockReturnValue(null);
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
    });

    render(<QueryToast />);

    expect(mockAddToast).not.toHaveBeenCalled();
  });
});
