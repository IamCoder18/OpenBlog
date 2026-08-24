"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Bold,
  Code,
  Eye,
  FileEdit,
  Heading2,
  Italic,
  LinkIcon,
  List,
  Quote,
  RefreshCw,
  Send,
  Settings,
  Pin,
  Sparkles,
} from "lucide-react";
import LatexRenderer from "@/components/LatexRenderer";
import { useToast } from "@/components/ToastContext";

type Visibility = "PUBLIC" | "PRIVATE" | "UNLISTED" | "DRAFT";
interface EditorState {
  title: string;
  body: string;
  slug: string;
  visibility: Visibility;
  tags: string[];
  seoDescription: string;
  coverImage: string;
  coverImageAlt: string;
  scheduledAt: string;
  isPinned: boolean;
  isFeatured: boolean;
}
const emptyState: EditorState = {
  title: "",
  body: "",
  slug: "",
  visibility: "DRAFT",
  tags: [],
  seoDescription: "",
  coverImage: "",
  coverImageAlt: "",
  scheduledAt: "",
  isPinned: false,
  isFeatured: false,
};

function snapshot(state: EditorState) {
  return JSON.stringify(state);
}
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function EditorContent({ canonicalOrigin }: { canonicalOrigin: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const requestedSlug = params.get("slug");
  const [state, setState] = useState<EditorState>(emptyState);
  const [loaded, setLoaded] = useState(!requestedSlug);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Draft not yet saved");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [mobileSettings, setMobileSettings] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [currentSlug, setCurrentSlug] = useState(requestedSlug);
  const [originalSlug, setOriginalSlug] = useState(requestedSlug ?? "");
  const [lastSaved, setLastSaved] = useState(snapshot(emptyState));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveLock = useRef<Promise<void> | null>(null);
  const isDirty = loaded && snapshot(state) !== lastSaved;

  useEffect(() => {
    if (!requestedSlug) {
      const recovered = localStorage.getItem("openblog-new-draft");
      if (recovered) {
        try {
          const next = {
            ...emptyState,
            ...(JSON.parse(recovered) as Partial<EditorState>),
          };
          setState(next);
          setSaveMessage("Recovered from this browser");
        } catch {
          localStorage.removeItem("openblog-new-draft");
        }
      }
      setLoaded(true);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/posts/${encodeURIComponent(requestedSlug)}`, {
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok)
          throw new Error(
            response.status === 403 || response.status === 404
              ? "This story is unavailable or you do not have access."
              : "The story could not be loaded."
          );
        const post = await response.json();
        const next: EditorState = {
          title: post.title ?? "",
          body: post.bodyMarkdown ?? "",
          slug: post.slug ?? "",
          visibility: post.visibility ?? "DRAFT",
          tags: post.metadata?.tags ?? [],
          seoDescription: post.metadata?.seoDescription ?? "",
          coverImage: post.metadata?.coverImage ?? "",
          coverImageAlt: post.metadata?.coverImageAlt ?? "",
          scheduledAt: post.scheduledAt
            ? new Date(post.scheduledAt).toISOString().slice(0, 16)
            : "",
          isPinned: post.isPinned === true,
          isFeatured: post.isFeatured === true,
        };
        setState(next);
        setLastSaved(snapshot(next));
        setCurrentSlug(post.slug);
        setOriginalSlug(post.slug);
        setSaveMessage("All changes saved");
      })
      .catch(cause => {
        if ((cause as DOMException).name !== "AbortError")
          setError((cause as Error).message);
      })
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, [requestedSlug]);

  useEffect(() => {
    if (!loaded || currentSlug) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem("openblog-new-draft", snapshot(state));
      setSaveMessage("Saved in this browser");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [currentSlug, loaded, state]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(() => {
    if (
      !currentSlug ||
      !isDirty ||
      saving ||
      !state.title.trim() ||
      !state.body.trim()
    )
      return;
    const timer = window.setTimeout(() => void save(undefined, true), 30_000);
    return () => window.clearTimeout(timer);
    // save is intentionally represented by its scalar dependencies through state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlug, isDirty, saving, state]);

  useEffect(() => {
    if (!preview || !state.body.trim()) {
      setPreviewHtml("");
      setPreviewError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreviewError("");
      try {
        const response = await fetch("/api/render-markdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: state.body }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        setPreviewHtml((await response.json()).html ?? "");
      } catch (cause) {
        if ((cause as DOMException).name !== "AbortError")
          setPreviewError(
            "Preview could not be rendered. Your source is safe and remains editable."
          );
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [preview, state.body]);

  const update = useCallback(
    <K extends keyof EditorState>(key: K, value: EditorState[K]) =>
      setState(current => ({ ...current, [key]: value })),
    []
  );
  const wordCount = useMemo(
    () => (state.body.trim() ? state.body.trim().split(/\s+/).length : 0),
    [state.body]
  );

  async function performSave(
    overrides?: Partial<EditorState>,
    automatic = false
  ) {
    const next = { ...state, ...overrides };
    if (!next.title.trim() || !next.body.trim() || !next.slug.trim()) {
      if (!automatic)
        setError("Add a title, story body, and valid URL slug before saving.");
      return;
    }
    if (
      next.slug !== originalSlug &&
      currentSlug &&
      state.visibility === "PUBLIC" &&
      !window.confirm(
        "Changing a published URL creates a permanent redirect from the old address. Continue?"
      )
    )
      return;
    setSaving(true);
    setError("");
    setSaveMessage("Saving…");
    try {
      const payload = {
        title: next.title,
        slug: next.slug,
        bodyMarkdown: next.body,
        visibility: next.visibility,
        tags: next.tags,
        seoDescription: next.seoDescription,
        coverImage: next.coverImage || null,
        coverImageAlt: next.coverImageAlt || null,
        scheduledAt: next.scheduledAt
          ? new Date(next.scheduledAt).toISOString()
          : null,
        isPinned: next.isPinned,
        isFeatured: next.isFeatured,
      };
      const response = await fetch(
        currentSlug
          ? `/api/posts/${encodeURIComponent(currentSlug)}`
          : "/api/posts",
        {
          method: currentSlug ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error || `Save failed (${response.status})`);
      const authoritative: EditorState = {
        ...next,
        slug: data.slug,
        visibility: data.visibility,
        scheduledAt: data.scheduledAt
          ? new Date(data.scheduledAt).toISOString().slice(0, 16)
          : "",
        tags: data.metadata?.tags ?? next.tags,
        seoDescription: data.metadata?.seoDescription ?? next.seoDescription,
        coverImage: data.metadata?.coverImage ?? "",
        coverImageAlt: data.metadata?.coverImageAlt ?? "",
        isPinned: data.isPinned === true,
        isFeatured: data.isFeatured === true,
      };
      setState(authoritative);
      setCurrentSlug(data.slug);
      setOriginalSlug(data.slug);
      setLastSaved(snapshot(authoritative));
      setSaveMessage(
        data.scheduledAt
          ? `Scheduled for ${new Date(data.scheduledAt).toLocaleString()}`
          : "All changes saved"
      );
      localStorage.removeItem("openblog-new-draft");
      if (!currentSlug)
        router.replace(
          `/dashboard/editor?slug=${encodeURIComponent(data.slug)}`
        );
      if (!automatic)
        toast.addToast(
          "success",
          data.scheduledAt
            ? "Story scheduled."
            : authoritative.visibility === "PUBLIC"
              ? "Story published."
              : "Draft saved."
        );
      if (
        authoritative.visibility === "PUBLIC" &&
        overrides?.visibility === "PUBLIC"
      )
        router.push(`/blog/${data.slug}`);
    } catch (cause) {
      const message =
        (cause as Error).message ||
        "Could not save. Check your connection and try again.";
      setError(message);
      setSaveMessage("Save failed — changes remain here");
      if (!automatic) toast.addToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  function save(overrides?: Partial<EditorState>, automatic = false) {
    if (saveLock.current) return saveLock.current;
    const operation = performSave(overrides, automatic).finally(() => {
      saveLock.current = null;
    });
    saveLock.current = operation;
    return operation;
  }

  function navigateAway(href: string) {
    if (
      !isDirty ||
      window.confirm(
        "You have unsaved changes. Leave this editor and discard them?"
      )
    )
      router.push(href);
  }
  function insert(prefix: string, suffix = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const selected = state.body.slice(start, end);
    update(
      "body",
      `${state.body.slice(0, start)}${prefix}${selected}${suffix}${state.body.slice(end)}`
    );
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    });
  }
  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (
      tag &&
      tag.length <= 40 &&
      state.tags.length < 10 &&
      !state.tags.includes(tag)
    )
      update("tags", [...state.tags, tag]);
    setTagInput("");
  }

  if (!loaded)
    return (
      <div role="status" className="min-h-[60vh] grid place-items-center">
        <RefreshCw className="animate-spin" />
        <span className="sr-only">Loading editor</span>
      </div>
    );
  if (error && requestedSlug && !currentSlug)
    return (
      <main id="main-content" className="p-8 pt-24">
        <div role="alert" className="max-w-xl theme-danger-soft rounded-xl p-6">
          <h1 className="text-2xl font-bold">Story unavailable</h1>
          <p className="mt-2">{error}</p>
          <Link
            href="/dashboard/stories"
            className="btn-secondary inline-flex mt-5"
          >
            Back to stories
          </Link>
        </div>
      </main>
    );

  const settings = (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="story-slug"
          className="block text-sm font-semibold mb-2"
        >
          URL slug
        </label>
        <input
          id="story-slug"
          value={state.slug}
          onChange={event => update("slug", slugify(event.target.value))}
          className="input-field w-full"
        />
        <p className="text-xs text-on-surface-variant mt-2">
          Changing a published URL keeps a permanent redirect.
        </p>
      </div>
      <div>
        <label
          htmlFor="story-visibility"
          className="block text-sm font-semibold mb-2"
        >
          Visibility
        </label>
        <select
          id="story-visibility"
          value={state.visibility}
          onChange={event =>
            update("visibility", event.target.value as Visibility)
          }
          className="input-field w-full min-h-11"
        >
          <option value="DRAFT">Draft — only you and admins</option>
          <option value="PRIVATE">Private — only you and admins</option>
          <option value="UNLISTED">Unlisted — anyone with the link</option>
          <option value="PUBLIC">Public — listed everywhere</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="schedule-at"
          className="block text-sm font-semibold mb-2"
        >
          Schedule publication
        </label>
        <input
          id="schedule-at"
          type="datetime-local"
          min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
          value={state.scheduledAt}
          onChange={event => update("scheduledAt", event.target.value)}
          className="input-field w-full"
        />
        <p className="text-xs text-on-surface-variant mt-2">
          Times use your current timezone. The server stores UTC.
        </p>
      </div>
      <fieldset>
        <legend className="block text-sm font-semibold mb-2">
          Homepage priority
        </legend>
        <div className="grid gap-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors has-checked:border-primary has-checked:bg-primary/5">
            <input
              type="checkbox"
              checked={state.isFeatured}
              onChange={event => update("isFeatured", event.target.checked)}
              className="mt-0.5 size-5 accent-primary"
            />
            <span>
              <span className="flex items-center gap-2 font-bold">
                <Sparkles className="size-4 text-primary" /> Featured
              </span>
              <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                Adds a badge and a 14-day ranking boost on the homepage.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors has-checked:border-primary has-checked:bg-primary/5">
            <input
              type="checkbox"
              checked={state.isPinned}
              onChange={event => update("isPinned", event.target.checked)}
              className="mt-0.5 size-5 accent-primary"
            />
            <span>
              <span className="flex items-center gap-2 font-bold">
                <Pin className="size-4 text-primary" /> Pinned
              </span>
              <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                Keeps this story ahead of regular articles in public listings.
              </span>
            </span>
          </label>
        </div>
      </fieldset>
      <div>
        <label
          htmlFor="story-tags"
          className="block text-sm font-semibold mb-2"
        >
          Topics
        </label>
        <div className="flex gap-2">
          <input
            id="story-tags"
            value={tagInput}
            onChange={event => setTagInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
            className="input-field min-w-0 flex-1"
            placeholder="Add a topic"
          />
          <button type="button" className="btn-secondary px-3" onClick={addTag}>
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {state.tags.map(tag => (
            <span
              key={tag}
              className="bg-surface-container-high rounded-full pl-3 inline-flex items-center"
            >
              {tag}
              <button
                type="button"
                onClick={() =>
                  update(
                    "tags",
                    state.tags.filter(value => value !== tag)
                  )
                }
                aria-label={`Remove ${tag}`}
                className="min-w-11 min-h-11"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <p className="text-xs text-on-surface-variant mt-2">
          Up to 10 lowercase topics.
        </p>
      </div>
      <div>
        <label
          htmlFor="seo-description"
          className="block text-sm font-semibold mb-2"
        >
          Search description
        </label>
        <textarea
          id="seo-description"
          maxLength={320}
          value={state.seoDescription}
          onChange={event => update("seoDescription", event.target.value)}
          className="input-field w-full min-h-24"
        />
        <p className="text-xs text-on-surface-variant mt-1">
          {state.seoDescription.length}/320 · Aim for 120–160 characters.
        </p>
      </div>
      <div>
        <label
          htmlFor="cover-image"
          className="block text-sm font-semibold mb-2"
        >
          Cover image URL
        </label>
        <input
          id="cover-image"
          type="url"
          value={state.coverImage}
          onChange={event => update("coverImage", event.target.value)}
          className="input-field w-full"
        />
        <label
          htmlFor="cover-alt"
          className="block text-sm font-semibold mt-3 mb-2"
        >
          Cover image description
        </label>
        <input
          id="cover-alt"
          value={state.coverImageAlt}
          onChange={event => update("coverImageAlt", event.target.value)}
          className="input-field w-full"
          placeholder="Describe meaningful visual content"
        />
      </div>
      <div className="bg-surface-container rounded-xl p-4">
        <p className="text-xs font-semibold">Search preview</p>
        <p className="text-primary mt-2 truncate">
          {state.title || "Your story title"}
        </p>
        <p className="text-sm text-on-surface-variant line-clamp-2">
          {state.seoDescription ||
            "Add a concise description for search and sharing."}
        </p>
        <p className="text-xs text-on-surface-variant mt-2 truncate">
          {canonicalOrigin}/blog/{state.slug || "story-slug"}
        </p>
      </div>
    </div>
  );

  return (
    <main
      id="main-content"
      className="pt-20 lg:pt-8 px-4 sm:px-6 lg:px-10 pb-28"
    >
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigateAway("/dashboard/stories")}
              className="min-h-11 text-sm font-semibold text-on-surface-variant hover:text-primary"
            >
              ← Back to stories
            </button>
            <h1 className="text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
              {currentSlug ? "Refine your story" : "Start a new story"}
            </h1>
            <p role="status" className="text-sm text-on-surface-variant mt-1">
              {saveMessage} · {wordCount} words
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPreview(value => !value)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {preview ? "Edit" : "Preview"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void save({ visibility: "DRAFT", scheduledAt: "" })
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <FileEdit className="w-4 h-4" />
              Save draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                state.scheduledAt
                  ? void save({ visibility: "PRIVATE" })
                  : setConfirmPublish(true)
              }
              className="btn-primary inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {state.scheduledAt ? "Schedule" : "Review & publish"}
            </button>
          </div>
        </header>
        {error && (
          <div
            role="alert"
            className="theme-danger-soft theme-danger-text rounded-xl p-4 mb-6"
          >
            {error}
          </div>
        )}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section
            aria-label="Story editor"
            className="min-h-[70vh] rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-8"
          >
            {preview ? (
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold mb-8">
                  {state.title || "Untitled story"}
                </h1>
                {previewError && (
                  <p role="alert" className="theme-danger-text mb-5">
                    {previewError}
                  </p>
                )}
                <article className="prose prose-lg max-w-none">
                  <LatexRenderer html={previewHtml} />
                </article>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="story-title"
                    className="block text-sm font-semibold mb-2"
                  >
                    Story title
                  </label>
                  <input
                    id="story-title"
                    value={state.title}
                    onChange={event => {
                      update("title", event.target.value);
                      if (!currentSlug)
                        update("slug", slugify(event.target.value));
                    }}
                    className="w-full bg-transparent text-3xl sm:text-5xl font-bold outline-none min-h-16"
                    placeholder="A clear, compelling title"
                  />
                </div>
                <div
                  role="toolbar"
                  aria-label="Markdown formatting"
                  className="sticky top-16 z-20 flex gap-1 overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest/90 p-2 shadow-sm backdrop-blur-xl lg:top-4"
                >
                  {[
                    [Bold, "Bold", "**", "**"],
                    [Italic, "Italic", "*", "*"],
                    [Heading2, "Heading", "## ", ""],
                    [Quote, "Quote", "> ", ""],
                    [List, "List", "- ", ""],
                    [LinkIcon, "Link", "[", "](https://)"],
                    [Code, "Code", "`", "`"],
                  ].map(([Icon, label, prefix, suffix]) => {
                    const ToolIcon = Icon as typeof Bold;
                    return (
                      <button
                        key={label as string}
                        type="button"
                        onClick={() =>
                          insert(prefix as string, suffix as string)
                        }
                        aria-label={`Format as ${String(label)}`}
                        className="min-w-11 min-h-11 grid place-items-center rounded-lg hover:bg-surface-container-high"
                      >
                        <ToolIcon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label htmlFor="story-body" className="sr-only">
                    Story body in Markdown
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="story-body"
                    value={state.body}
                    onChange={event => update("body", event.target.value)}
                    className="w-full min-h-[60vh] bg-transparent resize-y text-lg leading-8 outline-none"
                    placeholder="Begin writing in Markdown…"
                  />
                </div>
              </div>
            )}
          </section>
          <aside
            aria-label="Story settings"
            className="hidden self-start overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm xl:sticky xl:top-6 xl:flex xl:max-h-[calc(100dvh-3rem)] xl:flex-col"
          >
            <h2 className="flex shrink-0 items-center gap-2 border-b border-outline-variant px-6 py-5 text-lg font-bold">
              <Settings className="w-5 h-5" />
              Story settings
            </h2>
            <div className="overflow-y-auto px-6 py-5">{settings}</div>
          </aside>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setMobileSettings(true)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex items-center gap-2 shadow-xl btn-secondary xl:!hidden"
      >
        <Settings className="w-5 h-5" />
        Settings
      </button>
      {mobileSettings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-settings-title"
          className="xl:hidden fixed inset-0 z-50 bg-black/60"
          onKeyDown={event =>
            event.key === "Escape" && setMobileSettings(false)
          }
        >
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-surface p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 id="mobile-settings-title" className="text-xl font-bold">
                Story settings
              </h2>
              <button
                type="button"
                onClick={() => setMobileSettings(false)}
                aria-label="Close story settings"
                className="min-w-11 min-h-11"
              >
                ×
              </button>
            </div>
            {settings}
          </div>
        </div>
      )}
      {confirmPublish && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-title"
          className="fixed inset-0 z-50 bg-black/60 grid place-items-center px-5"
        >
          <div className="w-full max-w-md bg-surface-container rounded-2xl p-6">
            <h2 id="publish-title" className="text-2xl font-bold">
              Publish this story?
            </h2>
            <p className="mt-3 text-on-surface-variant">
              It will become public immediately and appear in feeds, search,
              RSS, and the sitemap.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmPublish(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setConfirmPublish(false);
                  void save({ visibility: "PUBLIC", scheduledAt: "" });
                }}
              >
                Publish now
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function EditorClient({
  canonicalOrigin,
}: {
  canonicalOrigin: string;
}) {
  return (
    <Suspense
      fallback={
        <div role="status" className="min-h-[60vh] grid place-items-center">
          <RefreshCw className="animate-spin" />
          <span className="sr-only">Loading editor</span>
        </div>
      }
    >
      <EditorContent canonicalOrigin={canonicalOrigin} />
    </Suspense>
  );
}
