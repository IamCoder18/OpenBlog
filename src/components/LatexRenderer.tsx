"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";

interface LatexRendererProps {
  html: string;
}

export default function LatexRenderer({ html }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document === "undefined" || !containerRef.current) return;

    const loadKaTeX = async () => {
      if (!containerRef.current) return;

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css";
      document.head.appendChild(link);

      try {
        const katex = await import("katex");

        const renderMathInElement = (element: Element) => {
          const mathElements = element.querySelectorAll(".katex-math");
          mathElements.forEach(el => {
            const texContent = el.getAttribute("data-tex");
            if (texContent) {
              try {
                katex.render(texContent, el as HTMLElement, {
                  throwOnError: false,
                  displayMode: el.getAttribute("data-display") === "true",
                });
              } catch {
                // KaTeX rendering error - fail silently in tests
              }
            }
          });
        };

        renderMathInElement(containerRef.current);
      } catch {
        // Failed to load KaTeX - fail silently in tests
      }
    };

    void loadKaTeX();
  }, []);

  const sanitizedHtml = DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
  });

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
