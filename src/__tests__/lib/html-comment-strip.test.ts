import { describe, it, expect, vi, beforeEach } from "vitest";

// Import the actual function
import { renderMarkdown } from "@/lib/markdown";

describe("HTML Comment Stripping in renderMarkdown", () => {
  it("strips HTML comments from markdown", async () => {
    const markdown = "# Title <!-- This is a comment --> and text";
    const result = await renderMarkdown(markdown);
    expect(result.html).not.toContain("<!--");
    expect(result.html).not.toContain("This is a comment");
    expect(result.html).toContain("Title");
    expect(result.html).toContain("and text");
  });

  it("strips multiple HTML comments", async () => {
    const markdown =
      "<!-- comment 1 --> # Title <!-- comment 2 -->\nSome text <!-- comment 3 -->";
    const result = await renderMarkdown(markdown);
    expect(result.html).not.toContain("<!--");
    expect(result.html).toContain("Title");
    expect(result.html).toContain("Some text");
  });

  it("prevents HTML comment injection with script", async () => {
    const markdown = "# Test <!-- <script>alert('xss')</script> --> content";
    const result = await renderMarkdown(markdown);
    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain("alert");
    expect(result.html).toContain("content");
  });

  it("handles markdown with code blocks containing comments", async () => {
    const markdown = "```html\n<!-- comment inside code -->\n```\n# Real title";
    const result = await renderMarkdown(markdown);
    // Code blocks should be preserved (they're not HTML comments in the output)
    expect(result.html).toContain("Real title");
  });
});
