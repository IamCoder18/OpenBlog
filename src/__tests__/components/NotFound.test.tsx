import { render, screen } from "@testing-library/react";
import NotFound from "../../app/not-found";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../components/Navbar", () => ({
  default: () => (
    <nav className="fixed top-0 w-full z-50 bg-zinc-950/70 backdrop-blur-xl animate-fade-in-down">
      <a href="/">OpenBlog</a>
    </nav>
  ),
}));

let consoleSpy: vi.SpyInstance;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe("Root NotFound", () => {
  describe("Rendering", () => {
    it("renders 404 text", () => {
      render(<NotFound />);
      expect(screen.getByText("404")).toBeInTheDocument();
    });

    it("renders 'page does not exist' message", () => {
      render(<NotFound />);
      expect(
        screen.getByText(
          "The page you are looking for does not exist or has been moved."
        )
      ).toBeInTheDocument();
    });

    it("renders 'Back to Home' link to /", () => {
      render(<NotFound />);
      const link = screen.getByText("Back to Home");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });

    it("renders search_off icon", () => {
      render(<NotFound />);
      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });
});

describe("BlogNotFound", () => {
  let BlogNotFound: React.ComponentType;

  beforeEach(async () => {
    BlogNotFound = (await import("../../app/blog/[slug]/not-found")).default;
  });

  describe("Rendering", () => {
    it("renders 'Post not found' heading", () => {
      render(<BlogNotFound />);
      expect(screen.getByText("Post not found")).toBeInTheDocument();
    });

    it("renders 'story may have been removed' message", () => {
      render(<BlogNotFound />);
      expect(
        screen.getByText(
          "This story may have been removed or the link is incorrect."
        )
      ).toBeInTheDocument();
    });

    it("renders 'Back to Feed' link to /", () => {
      render(<BlogNotFound />);
      const link = screen.getByText("Back to Feed");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });

    it("renders Navbar component", () => {
      render(<BlogNotFound />);
      const logo = screen.getByText("OpenBlog");
      expect(logo).toBeInTheDocument();
    });

    it("renders Footer component", () => {
      render(<BlogNotFound />);
      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
    });

    it("renders article icon", () => {
      render(<BlogNotFound />);
      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });
});
