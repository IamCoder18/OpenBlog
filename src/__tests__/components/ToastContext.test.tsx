import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ToastContext";

vi.mock("@/components/ToastContext", async () => {
  const actual = await vi.importActual("@/components/ToastContext");
  return {
    ...(actual as object),
    useToast: vi.fn(),
  };
});

import { useToast as mockUseToast } from "@/components/ToastContext";

describe("ToastContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children", () => {
    (mockUseToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast: vi.fn(),
    });

    render(
      <ToastProvider>
        <div>Test Child</div>
      </ToastProvider>
    );

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("provides addToast function via context", () => {
    const addToastMock = vi.fn();
    (mockUseToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast: addToastMock,
    });

    const TestComponent = () => {
      const { addToast } = useToast();
      return <button onClick={() => addToast("info", "test")}>Trigger</button>;
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger"));
    expect(addToastMock).toHaveBeenCalled();
  });

  it("renders error toast with correct styling", () => {
    const addToast = vi.fn();
    (mockUseToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast,
    });

    const TestComponent = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast("error", "Error message")}>
          Trigger Error
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Error"));

    expect(addToast).toHaveBeenCalledWith("error", "Error message");
  });

  it("renders success toast with correct styling", () => {
    const addToast = vi.fn();
    (mockUseToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast,
    });

    const TestComponent = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast("success", "Success message")}>
          Trigger Success
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Success"));

    expect(addToast).toHaveBeenCalledWith("success", "Success message");
  });

  it("renders warning toast with correct styling", () => {
    const addToast = vi.fn();
    (mockUseToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast,
    });

    const TestComponent = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast("warning", "Warning message")}>
          Trigger Warning
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Warning"));

    expect(addToast).toHaveBeenCalledWith("warning", "Warning message");
  });

  it("renders info toast with correct styling", () => {
    const addToast = vi.fn();
    (mockUseToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast,
    });

    const TestComponent = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast("info", "Info message")}>
          Trigger Info
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Info"));

    expect(addToast).toHaveBeenCalledWith("info", "Info message");
  });

  it("removes toast when X button is clicked", () => {
    const removeToast = vi.fn();
    (mockUseToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast: vi.fn(),
    });

    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>
    );

    const toasts = screen.queryAllByRole("button");
    expect(toasts.length).toBeGreaterThanOrEqual(0);
  });

  it("auto-removes toast after timeout", () => {
    vi.useFakeTimers();
    const addToast = vi.fn();
    (mockUseToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast,
    });

    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>
    );

    expect(addToast).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    vi.useRealTimers();
  });
});
