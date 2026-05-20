import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  config: {
    get BLOG_NAME() {
      return "OpenBlog";
    },
    get BASE_URL() {
      return "http://localhost:3000";
    },
  },
}));

vi.mock("../../components/LogoutButton", () => ({
  default: () => <button>Logout</button>,
}));

vi.mock("../../components/MobileBackButton", () => ({
  default: () => <button>Back</button>,
}));

import { getSession } from "@/lib/session";
import Navbar from "../../components/Navbar";

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Logo", () => {
    it("renders OpenBlog logo with link to /", async () => {
      vi.mocked(getSession).mockResolvedValue({ user: null });
      const ui = Navbar({ user: null });
      const { container } = render(ui);
      const logo = container.querySelector('a[href="/"]');
      expect(logo).toBeInTheDocument();
    });
  });

  describe("Navigation links", () => {
    it("renders Feed link with href /", async () => {
      vi.mocked(getSession).mockResolvedValue({ user: null });
      const ui = Navbar({ user: null });
      const { container } = render(ui);
      const link = container.querySelector('a[href="/"]');
      expect(link).toBeInTheDocument();
    });

    it("renders Explore link with href /explore", async () => {
      vi.mocked(getSession).mockResolvedValue({ user: null });
      const ui = Navbar({ user: null });
      const { container } = render(ui);
      const link = container.querySelector('a[href="/explore"]');
      expect(link).toBeInTheDocument();
    });

    it("renders Dashboard link for admin users", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "1", role: "ADMIN" },
      });
      const ui = Navbar({ user: { id: "1", name: "Test", role: "ADMIN" } });
      const { container } = render(ui);
      const link = container.querySelector('a[href="/dashboard"]');
      expect(link).toBeInTheDocument();
    });
  });
});
