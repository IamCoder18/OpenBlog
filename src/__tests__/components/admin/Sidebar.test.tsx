import { render, screen } from "@testing-library/react";
import Sidebar from "../../../components/admin/Sidebar";

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe("Sidebar", () => {
  describe("Renders core elements", () => {
    it("renders OpenBlog Admin title", () => {
      render(<Sidebar />);

      expect(screen.getByText("OpenBlog Admin")).toBeInTheDocument();
    });

    it("renders New Post button with link to /dashboard/editor", () => {
      render(<Sidebar />);

      const newPostLink = screen.getByText("New Post").closest("a");
      expect(newPostLink).toHaveAttribute("href", "/dashboard/editor");
    });

    it("renders Logout link", () => {
      render(<Sidebar />);

      expect(screen.getByText("Logout")).toBeInTheDocument();
    });
  });

  describe("Navigation links", () => {
    it("renders Analytics link to /dashboard", () => {
      render(<Sidebar />);

      const analyticsLink = screen.getByText("Analytics").closest("a");
      expect(analyticsLink).toHaveAttribute("href", "/dashboard");
    });

    it("renders Stories link to /dashboard/stories", () => {
      render(<Sidebar />);

      const storiesLink = screen.getByText("Stories").closest("a");
      expect(storiesLink).toHaveAttribute("href", "/dashboard/stories");
    });

    it("renders Settings link to /dashboard/settings", () => {
      render(<Sidebar />);

      const settingsLink = screen.getByText("Settings").closest("a");
      expect(settingsLink).toHaveAttribute("href", "/dashboard/settings");
    });
  });

  describe("Active item styling", () => {
    it("active analytics has primary styling", () => {
      render(<Sidebar activeItem="analytics" />);

      const analyticsLink = screen.getByText("Analytics").closest("a");
      expect(analyticsLink).toHaveClass("bg-primary/10");
      expect(analyticsLink).toHaveClass("text-primary");
      expect(analyticsLink).toHaveClass("border-primary-container");
    });

    it("active stories has primary styling", () => {
      render(<Sidebar activeItem="stories" />);

      const storiesLink = screen.getByText("Stories").closest("a");
      expect(storiesLink).toHaveClass("bg-primary/10");
      expect(storiesLink).toHaveClass("text-primary");
      expect(storiesLink).toHaveClass("border-primary-container");
    });

    it("active settings has primary styling", () => {
      render(<Sidebar activeItem="settings" />);

      const settingsLink = screen.getByText("Settings").closest("a");
      expect(settingsLink).toHaveClass("bg-primary/10");
      expect(settingsLink).toHaveClass("text-primary");
      expect(settingsLink).toHaveClass("border-primary-container");
    });

    it("inactive items have on-surface-variant text", () => {
      render(<Sidebar activeItem="analytics" />);

      const storiesLink = screen.getByText("Stories").closest("a");
      const settingsLink = screen.getByText("Settings").closest("a");

      expect(storiesLink).toHaveClass("text-on-surface-variant");
      expect(settingsLink).toHaveClass("text-on-surface-variant");
    });
  });

  describe("Layout classes", () => {
    it("sidebar is fixed positioned", () => {
      render(<Sidebar />);

      const aside = document.querySelector("aside");
      expect(aside).toHaveClass("fixed");
    });

    it("sidebar has w-64 width class", () => {
      render(<Sidebar />);

      const aside = document.querySelector("aside");
      expect(aside).toHaveClass("w-64");
    });
  });
});
