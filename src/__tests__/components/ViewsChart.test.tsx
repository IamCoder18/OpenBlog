import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/ToastContext", () => ({
  useToast: vi.fn(() => ({ addToast: vi.fn() })),
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ total: 0, viewsByDay: [] }),
  } as Response);
});

import ViewsChart from "@/components/dashboard/ViewsChart";

describe("ViewsChart", () => {
  it("renders without crashing", () => {
    render(<ViewsChart />);
  });
});
