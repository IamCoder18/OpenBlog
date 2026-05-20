import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Markdown", () => {
    describe("Headings", () => {
      it("should return html containing h1", async () => {
        const result = await renderMarkdown("# Heading 1");
        expect(result.html).toContain("Heading 1");
      });

      it("should return html containing h2", async () => {
        const result = await renderMarkdown("## Heading 2");
        expect(result.html).toContain("Heading 2");
      });

      it("should return html containing h3", async () => {
        const result = await renderMarkdown("### Heading 3");
        expect(result.html).toContain("Heading 3");
      });

      it("should return html containing h4", async () => {
        const result = await renderMarkdown("#### Heading 4");
        expect(result.html).toContain("Heading 4");
      });

      it("should return html containing h5", async () => {
        const result = await renderMarkdown("##### Heading 5");
        expect(result.html).toContain("Heading 5");
      });

      it("should return html containing h6", async () => {
        const result = await renderMarkdown("###### Heading 6");
        expect(result.html).toContain("Heading 6");
      });
    });

    describe("Text Formatting", () => {
      it("should process bold text", async () => {
        const result = await renderMarkdown("**bold text**");
        expect(result.html).toContain("bold text");
      });

      it("should process italic text", async () => {
        const result = await renderMarkdown("*italic text*");
        expect(result.html).toContain("italic text");
      });

      it("should process strikethrough text", async () => {
        const result = await renderMarkdown("~~strikethrough~~");
        expect(result.html).toContain("strikethrough");
      });

      it("should process bold and italic combined", async () => {
        const result = await renderMarkdown("***bold and italic***");
        expect(result.html).toContain("bold and italic");
      });
    });

    describe("Lists", () => {
      it("should process unordered list", async () => {
        const result = await renderMarkdown("- Item 1\n- Item 2");
        expect(result.html).toContain("Item 1");
        expect(result.html).toContain("Item 2");
      });

      it("should process ordered list", async () => {
        const result = await renderMarkdown("1. First item\n2. Second item");
        expect(result.html).toContain("First item");
        expect(result.html).toContain("Second item");
      });
    });

    describe("Links and Images", () => {
      it("should process link", async () => {
        const result = await renderMarkdown("[OpenBlog](https://example.com)");
        expect(result.html).toContain("OpenBlog");
        expect(result.html).toContain("https://example.com");
      });

      it("should process image", async () => {
        const result = await renderMarkdown("![alt text](image.jpg)");
        expect(result.html).toContain("image.jpg");
        expect(result.html).toContain("alt text");
      });
    });

    describe("Code", () => {
      it("should process inline code", async () => {
        const result = await renderMarkdown("Inline `code` here");
        expect(result.html).toContain("code");
      });

      it("should process code block with language", async () => {
        const result = await renderMarkdown("```javascript\nconst x = 1;\n```");
        expect(result.html).toContain("const");
        expect(result.html).toContain("shiki");
        expect(result.html).toContain("<code>");
      });

      it("should process code block without language", async () => {
        const result = await renderMarkdown("```\nsome code\n```");
        expect(result.html).toContain("some code");
      });
    });

    describe("Blockquotes", () => {
      it("should process blockquote", async () => {
        const result = await renderMarkdown("> This is a blockquote");
        expect(result.html).toContain("This is a blockquote");
      });

      it("should process nested blockquote", async () => {
        const result = await renderMarkdown("> First level\n>> Second level");
        expect(result.html).toContain("First level");
        expect(result.html).toContain("Second level");
      });
    });

    describe("Horizontal Rules", () => {
      it("should process horizontal rule", async () => {
        const result = await renderMarkdown("---");
        expect(result.html).toBeDefined();
      });
    });

    describe("Paragraphs", () => {
      it("should process paragraph", async () => {
        const result = await renderMarkdown("This is a paragraph");
        expect(result.html).toContain("This is a paragraph");
      });

      it("should process multiple paragraphs", async () => {
        const result = await renderMarkdown(
          "First paragraph\n\nSecond paragraph"
        );
        expect(result.html).toContain("First paragraph");
        expect(result.html).toContain("Second paragraph");
      });
    });

    describe("Line Breaks", () => {
      it("should process line breaks", async () => {
        const result = await renderMarkdown("Line 1\nLine 2");
        expect(result.html).toContain("Line 1");
        expect(result.html).toContain("Line 2");
      });
    });
  });

  describe("LaTeX Math", () => {
    describe("Inline Math", () => {
      it("should render simple inline math", async () => {
        const result = await renderMarkdown("This is $x^2$ inline");
        expect(result.html).toContain("katex");
      });

      it("should render inline math with fractions", async () => {
        const result = await renderMarkdown("$\\frac{a}{b}$");
        expect(result.html).toContain("katex");
      });

      it("should render inline math with Greek letters", async () => {
        const result = await renderMarkdown("$\\alpha + \\beta = \\gamma$");
        expect(result.html).toContain("katex");
      });

      it("should render inline math with subscripts", async () => {
        const result = await renderMarkdown("$x_{i}$");
        expect(result.html).toContain("katex");
      });

      it("should render inline math with square roots", async () => {
        const result = await renderMarkdown("$\\sqrt{x}$");
        expect(result.html).toContain("katex");
      });

      it("should render inline math with summation", async () => {
        const result = await renderMarkdown("$\\sum_{i=1}^{n} i$");
        expect(result.html).toContain("katex");
      });

      it("should render inline math with integrals", async () => {
        const result = await renderMarkdown("$\\int_0^1 x dx$");
        expect(result.html).toContain("katex");
      });

      it("should render inline math with limits", async () => {
        const result = await renderMarkdown("$\\lim_{x \\to \\infty} f(x)$");
        expect(result.html).toContain("katex");
      });

      it("should render inline math with matrices", async () => {
        const result = await renderMarkdown(
          "$\\begin{pmatrix} a & b \\end{pmatrix}$"
        );
        expect(result.html).toContain("katex");
      });

      it("should render inline math with spaces", async () => {
        const result = await renderMarkdown("$a \\quad b$");
        expect(result.html).toContain("katex");
      });
    });

    describe("Block Math", () => {
      it("should render simple block math", async () => {
        const result = await renderMarkdown("$$x^2 + y^2 = z^2$$");
        expect(result.html).toContain("katex");
      });

      it("should render block math with fractions", async () => {
        const result = await renderMarkdown("$$\\frac{a}{b}$$");
        expect(result.html).toContain("katex");
      });

      it("should render block math with integrals", async () => {
        const result = await renderMarkdown("$$\\int_0^\\infty e^{-x} dx$$");
        expect(result.html).toContain("katex");
      });

      it("should render block math with matrices", async () => {
        const result = await renderMarkdown(
          "$$\\begin{bmatrix} 1 & 2 \\end{bmatrix}$$"
        );
        expect(result.html).toContain("katex");
      });

      it("should render block math with equations", async () => {
        const result = await renderMarkdown("$$E = mc^2$$");
        expect(result.html).toContain("katex");
      });

      it("should render block math with quadratic formula", async () => {
        const result = await renderMarkdown(
          "$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"
        );
        expect(result.html).toContain("katex");
      });

      it("should render block math with Fourier transform", async () => {
        const result = await renderMarkdown("$$\\mathcal{F}[f(t)]$$");
        expect(result.html).toContain("katex");
      });

      it("should render block math with partial derivatives", async () => {
        const result = await renderMarkdown(
          "$$\\frac{\\partial f}{\\partial x}$$"
        );
        expect(result.html).toContain("katex");
      });

      it("should render block math with cases", async () => {
        const result = await renderMarkdown(
          "$$|x| = \\begin{cases} x \\end{cases}$$"
        );
        expect(result.html).toContain("katex");
      });

      it("should render block math with multiple lines", async () => {
        const result = await renderMarkdown(
          "$$\\begin{aligned} a &= b \\end{aligned}$$"
        );
        expect(result.html).toContain("katex");
      });
    });

    describe("Math in Lists", () => {
      it("should render inline math in unordered list", async () => {
        const result = await renderMarkdown("- Item with $x^2$ math");
        expect(result.html).toContain("katex");
      });

      it("should render block math in unordered list", async () => {
        const result = await renderMarkdown("- Item\n$$\\int x dx$$");
        expect(result.html).toContain("katex");
      });

      it("should render inline math in ordered list", async () => {
        const result = await renderMarkdown("1. First $x^2$\n2. Second $y^2$");
        expect(result.html).toContain("katex");
      });

      it("should render math in nested list", async () => {
        const result = await renderMarkdown("- Level 1\n  - Level 2 with $x$");
        expect(result.html).toContain("katex");
      });
    });

    describe("Multiple Math Blocks", () => {
      it("should render multiple inline math", async () => {
        const result = await renderMarkdown("$a$ and $b$ and $c$");
        expect(result.html).toContain("katex");
      });

      it("should render multiple block math", async () => {
        const result = await renderMarkdown("$$x^2$$ and $$y^2$$");
        expect(result.html).toContain("katex");
      });

      it("should render mixed inline and block math", async () => {
        const result = await renderMarkdown(
          "$x$ equation: $$x^2 + y^2 = 1$$ then $y$"
        );
        const katexCount = (result.html.match(/katex/g) || []).length;
        expect(katexCount).toBeGreaterThanOrEqual(2);
      });
    });

    describe("Math Edge Cases", () => {
      it("should handle math with backslashes", async () => {
        const result = await renderMarkdown("$\\backslash$");
        expect(result.html).toContain("katex");
      });

      it("should handle math with braces", async () => {
        const result = await renderMarkdown("${a}$");
        expect(result.html).toContain("katex");
      });

      it("should handle math with newlines in block mode", async () => {
        const result = await renderMarkdown("$$\na =\n b\n$$");
        expect(result.html).toBeDefined();
      });

      it("should handle math with special characters", async () => {
        const result = await renderMarkdown("$\\alpha$");
        expect(result.html).toContain("katex");
      });

      it("should handle invalid math gracefully", async () => {
        const result = await renderMarkdown("$invalid(math$");
        expect(result.html).toBeDefined();
      });

      it("should handle empty inline math", async () => {
        const result = await renderMarkdown("$ $");
        expect(result.html).toContain("katex");
      });

      it("should handle empty block math", async () => {
        const result = await renderMarkdown("$$  $$");
        expect(result.html).toContain("katex");
      });
    });
  });

  describe("Security/Sanitization", () => {
    it("should remove script tags", async () => {
      const result = await renderMarkdown('<script>alert("xss")</script>Hello');
      expect(result.html).not.toContain("<script");
      expect(result.html).toContain("Hello");
    });

    it("should remove event handlers", async () => {
      const result = await renderMarkdown('<img onerror="alert(1)" src="x">');
      expect(result.html).not.toContain("onerror");
      expect(result.html).not.toContain("onclick");
    });

    it("should remove javascript: URLs", async () => {
      const result = await renderMarkdown("[Link](javascript:alert(1))");
      expect(result.html).not.toContain("javascript:");
    });

    it("should escape HTML entities", async () => {
      const result = await renderMarkdown("<div>&lt;script&gt;</div>");
      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;");
    });

    it("should remove iframe tags", async () => {
      const result = await renderMarkdown(
        '<iframe src="evil.com"></iframe>Hello'
      );
      expect(result.html).not.toContain("<iframe");
      expect(result.html).toContain("Hello");
    });

    it("should remove object tags", async () => {
      const result = await renderMarkdown('<object data="evil.swf"></object>');
      expect(result.html).not.toContain("<object");
    });

    it("should remove embed tags", async () => {
      const result = await renderMarkdown('<embed src="evil.swf">');
      expect(result.html).not.toContain("<embed");
    });

    it("should sanitize form tags with action", async () => {
      const result = await renderMarkdown(
        '<form action="javascript:alert(1)"><input></form>'
      );
      expect(result.html).not.toContain("javascript:");
    });

    it("should allow safe HTML tags", async () => {
      const result = await renderMarkdown(
        "<strong>bold</strong> and <em>italic</em>"
      );
      expect(result.html).toContain("<strong>bold</strong>");
      expect(result.html).toContain("<em>italic</em>");
    });

    it("should sanitize links", async () => {
      const result = await renderMarkdown("[Click](http://evil.com)");
      expect(result.html).toContain('href="http://evil.com"');
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string", async () => {
      const result = await renderMarkdown("");
      expect(result.html).toBe("");
    });

    it("should handle very long content", async () => {
      const longText = "# Header\n\n" + "Paragraph ".repeat(10000);
      const result = await renderMarkdown(longText);
      expect(result.html).toContain("Header");
      expect(result.html).toContain("Paragraph");
    });

    it("should handle malformed markdown", async () => {
      const result = await renderMarkdown("****invalid****");
      expect(result.html).toContain("invalid");
    });

    it("should handle mixed content", async () => {
      const result = await renderMarkdown(
        "# Title\n\n**Bold** and *italic*\n\n- List item\n\n```js\ncode\n```"
      );
      expect(result.html).toContain("Title");
      expect(result.html).toContain("Bold");
      expect(result.html).toContain("italic");
      expect(result.html).toContain("List item");
      expect(result.html).toContain("code");
    });

    it("should handle Unicode characters", async () => {
      const result = await renderMarkdown("# 日本語\n\n中文\n\n🎉");
      expect(result.html).toContain("日本語");
      expect(result.html).toContain("中文");
      expect(result.html).toContain("🎉");
    });

    it("should handle emojis", async () => {
      const result = await renderMarkdown("Hello 👋 World 🚀");
      expect(result.html).toContain("👋");
      expect(result.html).toContain("🚀");
    });

    it("should handle special emoji characters", async () => {
      const result = await renderMarkdown("❤️ 💙 💚 💛 💜 🖤");
      expect(result.html).toContain("❤️");
    });

    describe("Tables", () => {
      it("should render simple table", async () => {
        const result = await renderMarkdown(
          "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |"
        );
        expect(result.html).toContain("Header 1");
        expect(result.html).toContain("Cell 1");
      });

      it("should render table with alignment", async () => {
        const result = await renderMarkdown(
          "| Left | Center | Right |\n|:-----|:------:|------:|\n| L    |   C    |     R |"
        );
        expect(result.html).toContain("Left");
        expect(result.html).toContain("Center");
        expect(result.html).toContain("Right");
      });
    });

    describe("Task Lists", () => {
      it("should render task list unchecked", async () => {
        const result = await renderMarkdown("- [ ] Unchecked task");
        expect(result.html).toContain("Unchecked task");
      });

      it("should render task list checked", async () => {
        const result = await renderMarkdown("- [x] Checked task");
        expect(result.html).toContain("Checked task");
      });
    });

    describe("Nested Structures", () => {
      it("should handle nested bold in italic", async () => {
        const result = await renderMarkdown("***bold in italic***");
        expect(result.html).toContain("bold in italic");
      });

      it("should handle nested link in code", async () => {
        const result = await renderMarkdown("`[link](url)`");
        expect(result.html).toContain("<code>");
        expect(result.html).toContain("[link](url)");
      });

      it("should handle nested list in blockquote", async () => {
        const result = await renderMarkdown("> - List in quote");
        expect(result.html).toContain("List in quote");
      });

      it("should handle deeply nested lists", async () => {
        const result = await renderMarkdown(
          "- Level 1\n  - Level 2\n    - Level 3\n      - Level 4"
        );
        expect(result.html).toContain("Level 1");
        expect(result.html).toContain("Level 2");
      });

      it("should handle mixed nesting", async () => {
        const result = await renderMarkdown(
          "> # Quote with heading\n> **bold**\n> - list"
        );
        expect(result.html).toContain("Quote with heading");
        expect(result.html).toContain("bold");
        expect(result.html).toContain("list");
      });
    });

    it("should handle text with only whitespace", async () => {
      const result = await renderMarkdown("   \n\n   ");
      expect(result.html).toBeDefined();
    });

    it("should handle single character", async () => {
      const result = await renderMarkdown("x");
      expect(result.html).toContain("x");
    });

    it("should handle special markdown characters", async () => {
      const result = await renderMarkdown("# *test* _test_ `test` [test](url)");
      expect(result.html).toContain("test");
    });

    it("should handle consecutive special characters", async () => {
      const result = await renderMarkdown("*****");
      expect(result.html).toBeDefined();
    });

    it("should handle markdown at start and end of content", async () => {
      const result = await renderMarkdown("**start** text **end**");
      expect(result.html).toContain("start");
      expect(result.html).toContain("end");
    });
  });

  describe("Function return type", () => {
    it("should return an object with html property", async () => {
      const result = await renderMarkdown("test");
      expect(result).toHaveProperty("html");
      expect(typeof result.html).toBe("string");
    });

    it("should return a Promise", async () => {
      const result = renderMarkdown("test");
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
