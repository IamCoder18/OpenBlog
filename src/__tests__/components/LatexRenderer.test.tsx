import { render, screen, waitFor } from "@testing-library/react";
import LatexRenderer from "../../components/LatexRenderer";
import DOMPurify from "isomorphic-dompurify";
import katex from "katex";

describe("LatexRenderer", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  describe("Renders sanitized HTML content", () => {
    it("renders HTML content in the container", () => {
      const html = "<p>Hello World</p>";
      render(<LatexRenderer html={html} />);

      const container = screen.getByText("Hello World");
      expect(container).toBeInTheDocument();
    });

    it("renders HTML with multiple elements", () => {
      const html = "<h1>Title</h1><p>Paragraph</p><ul><li>Item</li></ul>";
      render(<LatexRenderer html={html} />);

      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Item")).toBeInTheDocument();
    });

    it("uses DOMPurify to sanitize the HTML", () => {
      const html = "<p>Test</p>";
      const sanitized = DOMPurify.sanitize(html, {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
      });
      expect(sanitized).toBe("<p>Test</p>");
    });
  });

  describe("Sanitizes dangerous HTML", () => {
    it("removes script tags from HTML", () => {
      const html = '<p>Test</p><script>alert("dangerous")</script>';
      const sanitized = DOMPurify.sanitize(html);

      expect(sanitized).not.toContain("<script");
      expect(sanitized).not.toContain("alert");

      render(<LatexRenderer html={html} />);
      expect(screen.queryByText('alert("dangerous")')).not.toBeInTheDocument();
    });

    it("removes onclick handlers from HTML", () => {
      const html = '<button onclick="alert(1)">Click me</button>';
      const sanitized = DOMPurify.sanitize(html);

      expect(sanitized).not.toContain("onclick");

      render(<LatexRenderer html={html} />);
      const button = screen.getByText("Click me");
      expect(button).not.toHaveAttribute("onclick");
    });

    it("removes dangerous event handlers", () => {
      const html = '<div onmouseover="alert(1)">Hover me</div>';
      const sanitized = DOMPurify.sanitize(html);

      expect(sanitized).not.toContain("onmouseover");

      render(<LatexRenderer html={html} />);
      const div = screen.getByText("Hover me");
      expect(div).not.toHaveAttribute("onmouseover");
    });

    it("allows safe HTML tags through", () => {
      const html = "<p>Safe content</p><a href='https://example.com'>Link</a>";
      const sanitized = DOMPurify.sanitize(html);

      expect(sanitized).toContain("<p>Safe content</p>");
      expect(sanitized).toContain("<a href=");

      render(<LatexRenderer html={html} />);
      expect(screen.getByText("Safe content")).toBeInTheDocument();
      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "https://example.com");
    });
  });

  describe("Loads KaTeX CSS from CDN", () => {
    it("creates link element for KaTeX CSS", async () => {
      render(<LatexRenderer html="<p>Test</p>" />);

      await waitFor(() => {
        const link = document.querySelector('link[rel="stylesheet"]');
        expect(link).toHaveAttribute(
          "href",
          "https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css"
        );
      });
    });

    it("adds KaTeX CSS to document head", async () => {
      render(<LatexRenderer html="<p>Test</p>" />);

      await waitFor(() => {
        const links = document.head.querySelectorAll('link[rel="stylesheet"]');
        const katexLink = Array.from(links).find(
          link =>
            link.href ===
            "https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css"
        );
        expect(katexLink).toBeInTheDocument();
      });
    });

    it("only loads KaTeX CSS once even with multiple renders", async () => {
      const { rerender } = render(<LatexRenderer html="<p>Test 1</p>" />);
      rerender(<LatexRenderer html="<p>Test 2</p>" />);

      await waitFor(() => {
        const links = document.head.querySelectorAll(
          'link[href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css"]'
        );
        expect(links.length).toBe(1);
      });
    });
  });

  describe("Renders .katex-math elements with proper data attributes", () => {
    it("finds and renders elements with katex-math class", async () => {
      const html = '<span class="katex-math" data-tex="\\frac{a}{b}"></span>';

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl?.innerHTML).toContain("katex");
      });
    });

    it("reads data-tex attribute for LaTeX content", async () => {
      const html = '<span class="katex-math" data-tex="E=mc^2"></span>';

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl).toBeInTheDocument();
      });
    });

    it("handles multiple katex-math elements", async () => {
      const html = `
        <span class="katex-math" data-tex="\\alpha"></span>
        <span class="katex-math" data-tex="\\beta"></span>
        <span class="katex-math" data-tex="\\gamma"></span>
      `;

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEls = document.querySelectorAll(".katex-math");
        expect(katexEls.length).toBe(3);
      });
    });

    it("skips elements without data-tex attribute", async () => {
      const html = '<span class="katex-math"></span>';

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl?.innerHTML).toBe("");
      });
    });

    it("handles elements without katex-math class", async () => {
      const html = "<p>No math here</p>";

      render(<LatexRenderer html={html} />);

      expect(screen.getByText("No math here")).toBeInTheDocument();
    });
  });

  describe("Handles display mode vs inline mode", () => {
    it("uses display mode when data-display is true", async () => {
      const html =
        '<span class="katex-math" data-tex="\\frac{a}{b}" data-display="true"></span>';

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl?.innerHTML).toContain("katex");
      });
    });

    it("uses inline mode when data-display is false", async () => {
      const html =
        '<span class="katex-math" data-tex="\\frac{a}{b}" data-display="false"></span>';

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl?.innerHTML).toContain("katex");
      });
    });

    it("defaults to inline mode when data-display is not set", async () => {
      const html = '<span class="katex-math" data-tex="\\frac{a}{b}"></span>';

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl?.innerHTML).toContain("katex");
      });
    });

    it("renders display mode math correctly", async () => {
      const html =
        '<div class="katex-math" data-tex="\\int_0^1 x^2 dx" data-display="true"></div>';

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl?.innerHTML).toContain("katex");
      });
    });
  });

  describe("Gracefully handles KaTeX load failures", () => {
    it("renders invalid KaTeX with error styling when throwOnError is false", async () => {
      const html = '<span class="katex-math" data-tex="invalidtex"></span>';
      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl?.innerHTML).toContain("katex");
      });
    });

    it("continues rendering other math elements when one fails", async () => {
      const html = `
        <span class="katex-math" data-tex="\\alpha"></span>
        <span class="katex-math" data-tex="\\beta"></span>
      `;
      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEls = document.querySelectorAll(".katex-math");
        expect(katexEls.length).toBe(2);
      });
    });

    it("renders content even when KaTeX fails to load", () => {
      const html = "<p>Fallback content</p>";
      render(<LatexRenderer html={html} />);

      expect(screen.getByText("Fallback content")).toBeInTheDocument();
    });

    it("handles empty katex-math elements gracefully", async () => {
      const html = '<span class="katex-math"></span>';

      render(<LatexRenderer html={html} />);

      await waitFor(() => {
        const katexEl = document.querySelector(".katex-math");
        expect(katexEl?.innerHTML).toBe("");
      });
    });
  });

  describe("Component structure", () => {
    it("renders a div container with ref", () => {
      const html = "<p>Test</p>";
      const { container } = render(<LatexRenderer html={html} />);

      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });

    it("sets dangerouslySetInnerHTML with sanitized content", () => {
      const html = "<p>Test</p>";
      const { container } = render(<LatexRenderer html={html} />);

      const div = container.firstChild as HTMLElement;
      expect(div.innerHTML).toBe("<p>Test</p>");
    });

    it("handles empty HTML string", () => {
      const { container } = render(<LatexRenderer html="" />);

      const div = container.firstChild as HTMLElement;
      expect(div.innerHTML).toBe("");
    });

    it("handles HTML with only whitespace", () => {
      const { container } = render(<LatexRenderer html="   " />);

      const div = container.firstChild as HTMLElement;
      expect(div.innerHTML).toBe("   ");
    });
  });
});
