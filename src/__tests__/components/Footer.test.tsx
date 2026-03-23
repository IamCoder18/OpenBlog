import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/config", () => ({
  config: {
    get BLOG_NAME() {
      return "OpenBlog";
    },
  },
}));

import Footer from "../../components/Footer";

describe("Footer", () => {
  describe("Copyright", () => {
    it("renders copyright text with config blog name", () => {
      render(<Footer />);

      expect(screen.getByText(/OpenBlog/)).toBeInTheDocument();
    });

    it("renders custom blog name when provided", () => {
      render(<Footer blogName="MyBlog" />);

      expect(screen.getByText(/MyBlog/)).toBeInTheDocument();
    });

    it("renders current year in copyright", () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(new RegExp(`${currentYear}`))
      ).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("has bg-zinc-950 class", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("bg-zinc-950");
    });

    it("applies custom className", () => {
      render(<Footer className="custom-class" />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("custom-class");
    });
  });
});
