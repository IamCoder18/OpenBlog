import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LatexRenderer from "@/components/LatexRenderer";

describe("published HTML sanitization", () => {
  it("removes executable and embedded content while retaining safe markup", () => {
    const { container } = render(
      <LatexRenderer
        html={
          '<h2>Safe</h2><img src="x" onerror="alert(1)"><iframe src="https://evil.example"></iframe><form><input></form><p style="display:none">Text</p>'
        }
      />
    );
    expect(container.querySelector("h2")).toHaveTextContent("Safe");
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toHaveAttribute("onerror");
    expect(container.querySelector("p")).not.toHaveAttribute("style");
  });
});
