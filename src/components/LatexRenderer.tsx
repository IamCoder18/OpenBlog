"use client";

import DOMPurify from "isomorphic-dompurify";

interface LatexRendererProps {
  html: string;
}

export default function LatexRenderer({ html }: LatexRendererProps) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    FORBID_TAGS: ["iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
