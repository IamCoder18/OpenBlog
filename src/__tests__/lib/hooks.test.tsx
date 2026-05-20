import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import * as hooks from "@/lib/hooks";

const { useDebouncedCallback } = hooks;

interface TestProps {
  cb: (value: string) => void;
}

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("calls callback after delay", () => {
    const callback = vi.fn();
    let debouncedFn: (value: string) => void;

    const TestComponent = (props: TestProps) => {
      debouncedFn = useDebouncedCallback(props.cb, 500);
      return null;
    };

    render(<TestComponent cb={callback} />);
    act(() => {
      debouncedFn("test");
    });

    expect(callback).not.toBeCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(callback).toBeCalledWith("test");
  });

  it("cancels previous call on rapid invocations", () => {
    const callback = vi.fn();
    let debouncedFn: (value: string) => void;

    const TestComponent = (props: TestProps) => {
      debouncedFn = useDebouncedCallback(props.cb, 500);
      return null;
    };

    render(<TestComponent cb={callback} />);
    act(() => {
      debouncedFn("first");
      debouncedFn("second");
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(callback).toBeCalledTimes(1);
    expect(callback).toBeCalledWith("second");
  });
});
