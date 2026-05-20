import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/ToastContext", () => ({
  useToast: vi.fn(() => ({ addToast: vi.fn() })),
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ keys: [] }),
  } as Response);
});

import AgentApiKeys from "@/components/agent/AgentApiKeys";

describe("AgentApiKeys", () => {
  it("renders without crashing", () => {
    render(<AgentApiKeys />);
  });
});
