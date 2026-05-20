import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShareButton from "@/components/ShareButton";

describe("ShareButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Share icon button", () => {
    render(<ShareButton title="Test Post" slug="test-post" />);
    expect(screen.getByLabelText("Share")).toBeInTheDocument();
  });

  it("shows popover when clicked", () => {
    render(<ShareButton title="Test Post" slug="test-post" />);
    const button = screen.getByLabelText("Share");
    fireEvent.click(button);

    expect(screen.getByText("Share story")).toBeInTheDocument();
    expect(screen.getByText("Test Post")).toBeInTheDocument();
  });

  it("displays correct URL", () => {
    vi.spyOn(window, "location", "get").mockReturnValue({
      origin: "https://example.com",
    } as unknown as Location);

    render(<ShareButton title="Test Post" slug="my-post" />);
    const button = screen.getByLabelText("Share");
    fireEvent.click(button);

    expect(screen.getByText(/example\.com\/blog\/my-post/)).toBeInTheDocument();
  });

  it("copies URL to clipboard", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
    });
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");

    render(<ShareButton title="Test" slug="test" />);
    const button = screen.getByLabelText("Share");
    fireEvent.click(button);

    const copyButton = screen.getByText("Copy to clipboard");
    await fireEvent.click(copyButton);

    expect(clipboardSpy).toHaveBeenCalled();
  });

  it("shows 'Link copied!' after copying", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
    });

    render(<ShareButton title="Test" slug="test" />);
    const button = screen.getByLabelText("Share");
    fireEvent.click(button);

    const copyButton = screen.getByText("Copy to clipboard");
    await fireEvent.click(copyButton);

    const copiedButton = await screen.findByText("Link copied!");
    expect(copiedButton).toBeInTheDocument();
  });

  it("closes popover when clicking outside", () => {
    render(<ShareButton title="Test" slug="test" />);
    const button = screen.getByLabelText("Share");
    fireEvent.click(button);

    expect(screen.getByText("Share story")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText("Share story")).not.toBeInTheDocument();
  });

  it("applies correct styling when copied", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
    });

    render(<ShareButton title="Test" slug="test" />);
    const button = screen.getByLabelText("Share");
    fireEvent.click(button);

    const copyButton = screen.getByText("Copy to clipboard");
    await fireEvent.click(copyButton);

    const copiedButton = await screen.findByText("Link copied!");
    expect(copiedButton).toBeInTheDocument();
    expect(copiedButton.className).toContain("theme-success-soft");
  });
});
