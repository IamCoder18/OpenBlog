import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({ user: null }),
}));

vi.mock("@/lib/config", () => ({
  config: {
    get BLOG_NAME() {
      return "OpenBlog";
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
    vi.mocked(getSession).mockResolvedValue({ user: null });
  });

  describe("Logo", () => {
    it("renders OpenBlog logo with link to /", async () => {
      const ui = await Navbar({});
      render(ui);

      const logo = screen.getByText("OpenBlog");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("href", "/");
    });
  });

  describe("Navigation links", () => {
    it("renders Feed link with href /", async () => {
      const ui = await Navbar({});
      render(ui);

      const feedLinks = screen.getAllByText("Feed");
      expect(feedLinks[0]).toHaveAttribute("href", "/");
    });

    it("renders Explore link with href /explore", async () => {
      const ui = await Navbar({});
      render(ui);

      const exploreLinks = screen.getAllByText("Explore");
      expect(exploreLinks[0]).toHaveAttribute("href", "/explore");
    });

    it("renders Dashboard link for admin users", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "1", role: "ADMIN" },
      } as any);
      const ui = await Navbar({});
      render(ui);

      const dashboardLinks = screen.getAllByText("Dashboard");
      expect(dashboardLinks[0]).toHaveAttribute("href", "/dashboard");
    });

    it("renders Dashboard link for author users", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "1", role: "AUTHOR" },
      } as any);
      const ui = await Navbar({});
      render(ui);

      const dashboardLinks = screen.getAllByText("Dashboard");
      expect(dashboardLinks[0]).toHaveAttribute("href", "/dashboard");
    });

    it("does not render Dashboard link for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "1", role: "USER" },
      } as any);
      const ui = await Navbar({});
      render(ui);

      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });
  });

  describe("Active link styling", () => {
    it("active feed link has violet styling classes", async () => {
      const ui = await Navbar({ activeLink: "feed" });
      render(ui);

      const feedLinks = screen.getAllByText("Feed");
      expect(feedLinks[0]).toHaveClass("text-violet-300");
      expect(feedLinks[0]).toHaveClass("border-b-2");
      expect(feedLinks[0]).toHaveClass("border-violet-500");
    });

    it("active explore link has violet styling classes", async () => {
      const ui = await Navbar({ activeLink: "explore" });
      render(ui);

      const exploreLinks = screen.getAllByText("Explore");
      expect(exploreLinks[0]).toHaveClass("text-violet-300");
      expect(exploreLinks[0]).toHaveClass("border-b-2");
      expect(exploreLinks[0]).toHaveClass("border-violet-500");
    });

    it("active dashboard link has violet styling classes", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "1", role: "ADMIN" },
      } as any);
      const ui = await Navbar({ activeLink: "dashboard" });
      render(ui);

      const dashboardLinks = screen.getAllByText("Dashboard");
      expect(dashboardLinks[0]).toHaveClass("text-violet-300");
      expect(dashboardLinks[0]).toHaveClass("border-b-2");
      expect(dashboardLinks[0]).toHaveClass("border-violet-500");
    });

    it("inactive links have zinc-400 text", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "1", role: "ADMIN" },
      } as any);
      const ui = await Navbar({ activeLink: "feed" });
      render(ui);

      const exploreLinks = screen.getAllByText("Explore");
      const dashboardLinks = screen.getAllByText("Dashboard");

      expect(exploreLinks[0]).toHaveClass("text-zinc-400");
      expect(dashboardLinks[0]).toHaveClass("text-zinc-400");
    });
  });

  describe("Auth state", () => {
    it("renders Logout button when user is logged in", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "1", role: "USER" },
      } as any);
      const ui = await Navbar({});
      render(ui);

      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    it("does not render Logout button when user is not logged in", async () => {
      vi.mocked(getSession).mockResolvedValue({ user: null });
      const ui = await Navbar({});
      render(ui);

      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });
  });

  describe("Back link", () => {
    it("shows back link when showBack is true", async () => {
      const ui = await Navbar({ showBack: true });
      render(ui);

      const backLink = screen.getByText("Back to Feed");
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute("href", "/");
    });

    it("hides back link when showBack is false", async () => {
      const ui = await Navbar({ showBack: false });
      render(ui);

      expect(screen.queryByText("Back to Feed")).not.toBeInTheDocument();
    });

    it("back link shows custom label", async () => {
      const ui = await Navbar({ showBack: true, backLabel: "Go Back" });
      render(ui);

      expect(screen.getByText("Go Back")).toBeInTheDocument();
    });

    it("back link has custom href", async () => {
      const ui = await Navbar({
        showBack: true,
        backHref: "/custom-path",
      });
      render(ui);

      const backLink = screen.getByText("Back to Feed");
      expect(backLink).toHaveAttribute("href", "/custom-path");
    });
  });

  describe("Styling and animations", () => {
    it("has glassmorphism backdrop-blur class", async () => {
      const ui = await Navbar({});
      const { container } = render(ui);

      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("backdrop-blur-xl");
    });

    it("has animate-fade-in-down animation class", async () => {
      const ui = await Navbar({});
      const { container } = render(ui);

      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("animate-fade-in-down");
    });
  });
});
