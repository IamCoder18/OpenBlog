import { marked } from "marked";
import katex from "katex";
import DOMPurify from "isomorphic-dompurify";
import { type Highlighter, createHighlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: [
        "javascript",
        "typescript",
        "python",
        "rust",
        "go",
        "java",
        "c",
        "cpp",
        "css",
        "html",
        "json",
        "yaml",
        "markdown",
        "bash",
        "shell",
        "sql",
        "docker",
        "xml",
      ],
    });
  }
  return highlighterPromise;
}

function renderLatex(text: string): string {
  let result = text;

  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `$$${math}$$`;
    }
  });

  result = result.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `$${math}$`;
    }
  });

  return result;
}

const renderer = new marked.Renderer();

renderer.text = ({ text }: { text: string }) => {
  return renderLatex(text);
};

renderer.code = ({
  text,
  lang,
}: {
  text: string;
  lang?: string;
  escaped?: boolean;
}) => {
  const language = lang || "text";
  try {
    const highlighter = (typeof window === "undefined"
      ? getHighlighter()
      : null) as unknown as Highlighter | null;
    if (highlighter && typeof highlighter.codeToHtml === "function") {
      const highlighted = highlighter.codeToHtml(text, {
        lang: language,
        theme: "github-dark",
      });
      return highlighted;
    }
  } catch {
    // Fallback to plain code block
  }
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<pre><code class="language-${language}">${escaped}</code></pre>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
});

export async function renderMarkdown(
  markdown: string
): Promise<{ html: string }> {
  const highlighter = await getHighlighter();

  const customRenderer = new marked.Renderer();

  customRenderer.text = ({ text }: { text: string }) => {
    return renderLatex(text);
  };

  customRenderer.code = ({
    text,
    lang,
  }: {
    text: string;
    lang?: string;
    escaped?: boolean;
  }) => {
    const language = lang && lang.trim() ? lang.trim() : "text";
    try {
      const validLangs = highlighter.getLoadedLanguages();
      const resolvedLang = validLangs.includes(language) ? language : "text";
      return highlighter.codeToHtml(text, {
        lang: resolvedLang,
        theme: "github-dark",
      });
    } catch {
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<pre><code class="language-${language}">${escaped}</code></pre>`;
    }
  };

  const parsed = (await marked.parse(markdown, {
    renderer: customRenderer,
    gfm: true,
    breaks: true,
  })) as string;

  // Strip HTML comments before sanitization to prevent comment injection
  const strippedComments = parsed.replace(/<!--[\s\S]*?-->/g, "");
  const sanitized = DOMPurify.sanitize(strippedComments, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["style", "tabindex"],
  });

  return { html: sanitized };
}
