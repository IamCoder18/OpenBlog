import { describe, it, expect } from "vitest";
import { stripMarkdown } from "@/lib/strip-markdown";

describe("stripMarkdown", () => {
  it("strips markdown syntax", () => {
    const result = stripMarkdown("# Hello **World**");
    expect(result).not.toContain("#");
    expect(result).not.toContain("**");
  });

  it("removes images", () => {
    const result = stripMarkdown("![alt](image.png) text");
    expect(result).toBe("text");
  });

  it("keeps link text but removes URL", () => {
    const result = stripMarkdown("[link text](https://example.com)");
    expect(result).toContain("link text");
    expect(result).not.toContain("https://");
  });

  it("removes code blocks", () => {
    const input = "before\n```js\nconst x = 1;\n```\nafter";
    const result = stripMarkdown(input);
    expect(result).not.toContain("const x = 1");
  });

  it("limits to maxLength", () => {
    const longText = "a".repeat(200);
    const result = stripMarkdown(longText, 50);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("handles empty string", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("removes HTML tags", () => {
    const result = stripMarkdown("<div>Hello</div> <p>World</p>");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});
