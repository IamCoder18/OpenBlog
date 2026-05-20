import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileBackButton from "@/components/MobileBackButton";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

import { useRouter } from "next/navigation";

describe("MobileBackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders back arrow icon", () => {
    render(<MobileBackButton />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("calls router.back() when history length > 1", () => {
    const mockRouter = {
      back: vi.fn(),
      push: vi.fn(),
    };
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    vi.spyOn(window, "history", "get").mockReturnValue({
      length: 2,
    } as unknown as History);

    render(<MobileBackButton />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("calls router.push('/') when history length is 1", () => {
    const mockRouter = {
      back: vi.fn(),
      push: vi.fn(),
    };
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    vi.spyOn(window, "history", "get").mockReturnValue({
      length: 1,
    } as unknown as History);

    render(<MobileBackButton />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/");
  });

  it("has correct aria-label", () => {
    render(<MobileBackButton />);
    const button = screen.getByLabelText("Go back");
    expect(button).toBeInTheDocument();
  });

  it("is hidden on desktop (md:hidden)", () => {
    render(<MobileBackButton />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("md:hidden");
  });
});
