export function stripMarkdown(text: string, maxLength = 150): string {
  if (!text) return "";

  return (
    text
      // Remove code blocks first (before other processing)
      .replace(/```[\s\S]*?```/g, "")
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
      // Remove links but keep text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic
      .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
      // Remove strikethrough
      .replace(/~~(.*?)~~/g, "$1")
      // Remove inline code
      .replace(/`([^`]*)`/g, "$1")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "")
      // Remove unordered list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      // Remove ordered list markers
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Collapse newlines and whitespace
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength)
  );
}
