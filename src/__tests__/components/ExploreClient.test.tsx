import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

import ExploreClient from "@/app/explore/ExploreClient";

describe("ExploreClient", () => {
  it("renders without crashing", () => {
    render(<ExploreClient initialPosts={[]} tags={[]} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
