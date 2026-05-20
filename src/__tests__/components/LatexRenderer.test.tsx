import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LatexRenderer from "@/components/LatexRenderer";

vi.mock("isomorphic-dompurify", () => ({
  default: {
    sanitize: vi.fn(html => html),
  },
}));

vi.mock("katex", () => ({
  default: {
    render: vi.fn(),
  },
}));

import DOMPurify from "isomorphic-dompurify";

describe("LatexRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sanitized HTML", () => {
    (DOMPurify.sanitize as ReturnType<typeof vi.fn>).mockReturnValue(
      "<p>Hello World</p>"
    );

    render(<LatexRenderer html="<p>Hello World</p>" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("calls DOMPurify.sanitize with correct options", () => {
    const html = "<p>Test</p>";
    render(<LatexRenderer html={html} />);

    expect(DOMPurify.sanitize).toHaveBeenCalledWith(
      html,
      expect.objectContaining({
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
      })
    );
  });

  it("loads KaTeX stylesheet", () => {
    const appendChildSpy = vi.spyOn(document.head, "appendChild");

    render(<LatexRenderer html="<p>Test</p>" />);

    expect(appendChildSpy).toHaveBeenCalled();
    const link = appendChildSpy.mock.calls[0][0] as HTMLLinkElement;
    expect(link.rel).toBe("stylesheet");
    expect(link.href).toContain("katex");
  });

  it("renders math elements with data-tex attribute", () => {
    const html = '<span class="katex-math" data-tex="x^2"></span>';
    (DOMPurify.sanitize as ReturnType<typeof vi.fn>).mockReturnValue(html);

    render(<LatexRenderer html={html} />);
    const mathElement = document.querySelector("[data-tex]");
    expect(mathElement).toBeInTheDocument();
    expect(mathElement?.getAttribute("data-tex")).toBe("x^2");
  });

  it("handles empty HTML", () => {
    render(<LatexRenderer html="" />);
    const container = document.querySelector("div");
    expect(container).toBeInTheDocument();
  });

  it("does not crash when container ref is null", () => {
    (DOMPurify.sanitize as ReturnType<typeof vi.fn>).mockReturnValue("");

    expect(() => render(<LatexRenderer html="" />)).not.toThrow();
  });
});
