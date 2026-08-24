import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import DashboardStories from "@/components/dashboard/DashboardStories";

const router = {
  refresh: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/stories",
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams("mode=admin"),
}));

vi.mock("@/components/ToastContext", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const server = setupServer(
  http.get("/api/posts", () => HttpResponse.json({ posts: [], total: 0 }))
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DashboardStories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves publication mode while synchronizing story filters", async () => {
    render(<DashboardStories scope="site" />);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        "/dashboard/stories?mode=admin",
        { scroll: false }
      )
    );
  });
});
