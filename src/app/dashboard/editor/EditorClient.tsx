"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { useToast } from "@/components/ToastContext";
import {
  LogOut,
  ChevronDown,
  FileEdit,
  Send,
  Clock,
  Bold,
  Italic,
  List,
  Image,
  Link,
  Code,
  Settings,
  Eye,
  X,
  RefreshCw,
  ChevronUp,
  ChevronRight,
} from "lucide-react";

function EditorContent({ blogName = "OpenBlog" }: { blogName?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const editSlug = searchParams.get("slug");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [seoDescription, setSeoDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showSlugEditor, setShowSlugEditor] = useState(false);
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef("");

  useEffect(() => {
    if (editSlug) {
      fetch(`/api/posts/${editSlug}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to load post");
          return res.json();
        })
        .then(data => {
          setTitle(data.title || "");
          setBody(data.bodyMarkdown || "");
          setSlug(data.slug || "");
          setVisibility(data.visibility || "PUBLIC");
          if (data.metadata) {
            setTags(data.metadata.tags || []);
            setSeoDescription(data.metadata.seoDescription || "");
            setCoverImage(data.metadata.coverImage || "");
          }
          lastSavedContent.current = JSON.stringify({
            title: data.title || "",
            body: data.bodyMarkdown || "",
            slug: data.slug || "",
            visibility: data.visibility || "PUBLIC",
            tags: data.metadata?.tags || [],
            seoDescription: data.metadata?.seoDescription || "",
            coverImage: data.metadata?.coverImage || "",
          });
        })
        .catch(() => {
          toast.addToast(
            "error",
            "Could not load the post. It may have been removed."
          );
          router.push("/dashboard/stories");
        });
    }
  }, [editSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!editSlug) {
        setSlug(
          value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        );
      }
    },
    [editSlug]
  );

  useEffect(() => {
    const words = body.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [body]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!editSlug) return;
    if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);

    autoSaveTimer.current = setInterval(() => {
      const currentContent = JSON.stringify({
        title,
        body,
        slug,
        visibility,
        tags,
        seoDescription,
        coverImage,
      });
      if (currentContent === lastSavedContent.current) return;
      if (!title.trim() || !body.trim()) return;

      void handleSave(undefined, true);
    }, 30000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    body,
    slug,
    visibility,
    tags,
    seoDescription,
    coverImage,
    editSlug,
  ]);

  // Preview rendering
  useEffect(() => {
    if (!showPreview || !body.trim()) {
      setPreviewHtml("");
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    setPreviewHtml("");
    const timer = setTimeout(() => {
      fetch("/api/render-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: body }),
      })
        .then(res => {
          if (!res.ok) throw new Error("Preview render failed");
          return res.json();
        })
        .then(data => {
          if (data.html) {
            setPreviewHtml(DOMPurify.sanitize(data.html));
          }
        })
        .catch(() => {})
        .finally(() => {
          setPreviewLoading(false);
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [showPreview, body]); // eslint-disable-line react-hooks/exhaustive-deps
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = useCallback(
    async (publishStatus?: string, isAutoSave = false) => {
      if (!isAutoSave) setSaving(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          title,
          slug,
          bodyMarkdown: body,
          visibility: publishStatus || visibility,
          seoDescription,
          tags,
          coverImage,
        };

        const method = editSlug ? "PUT" : "POST";
        const url = editSlug ? `/api/posts/${editSlug}` : "/api/posts";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setSaved(true);
          lastSavedContent.current = JSON.stringify({
            title,
            body,
            slug,
            visibility,
            tags,
            seoDescription,
            coverImage,
          });
          setTimeout(() => setSaved(false), 3000);
          const isPublic = (publishStatus || visibility) === "PUBLIC";
          if (!editSlug) {
            const data = await res.json();
            if (isPublic) {
              router.push(`/blog/${data.slug}`);
            } else {
              router.push(`/dashboard/editor?slug=${data.slug}`);
            }
          } else if (isPublic) {
            router.push(`/blog/${slug}`);
          }
        } else {
          const data = await res.json().catch(() => null);
          const message = data?.error || `Save failed (${res.status})`;
          setError(message);
          toast.addToast("error", message);
        }
      } catch {
        const message =
          "Couldn't reach the server. Check your connection and try again.";
        if (!isAutoSave) setError(message);
        toast.addToast("error", message);
      } finally {
        if (!isAutoSave) {
          setSaving(false);
          setShowPublishMenu(false);
        }
      }
    },
    [
      title,
      body,
      slug,
      visibility,
      tags,
      seoDescription,
      coverImage,
      editSlug,
      router,
      toast,
    ]
  );

  const handleSchedule = async () => {
    if (!scheduleDate) return;
    await handleSave("PRIVATE");
    setShowSchedulePicker(false);
    setScheduleDate("");
  };

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.substring(start, end);
    const replacement = prefix + selected + suffix;

    setBody(body.substring(0, start) + replacement + body.substring(end));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <nav className="theme-nav fixed top-0 w-full z-50 backdrop-blur-xl transition-all duration-300">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto font-headline tracking-tight antialiased text-sm font-medium">
          <div className="flex items-center gap-8">
            <a
              href="/"
              className="text-xl font-bold tracking-tighter text-on-surface"
            >
              {blogName}
            </a>
            <div className="hidden md:flex items-center space-x-6">
              <a href="/" className="theme-nav-link transition-colors">
                Feed
              </a>
              <a href="/explore" className="theme-nav-link transition-colors">
                Explore
              </a>
              <a href="/dashboard" className="theme-nav-link transition-colors">
                Dashboard
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/sign-out", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                    credentials: "include",
                  });
                  if (!res.ok) {
                    document.cookie =
                      "better-auth.session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    document.cookie =
                      "better-auth.session_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  }
                } catch {
                  document.cookie =
                    "better-auth.session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  document.cookie =
                    "better-auth.session_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                }
                window.location.href = "/";
              }}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm theme-nav-link transition-colors rounded-lg hover:bg-surface-container/70"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-24 min-h-screen flex">
        <div className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 mb-32 animate-fade-in-up">
          <header className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-primary font-medium tracking-widest uppercase text-[10px] mb-2 font-label">
                Drafting Suite
              </p>
              <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tighter text-on-surface">
                {editSlug ? "Edit Story" : "New Story"}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium text-on-surface bg-surface-container-highest border border-outline-variant/15 rounded-lg hover:bg-surface-container-high transition-all"
              >
                {showPreview ? "Edit" : "Preview"}
              </button>
              <div className="relative">
                  <button
                    onClick={() => setShowPublishMenu(!showPublishMenu)}
                    className="editorial-gradient px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold text-on-primary rounded-lg shadow-lg shadow-primary-container/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span className="hidden sm:inline">Publishing options</span>
                    <span className="sm:hidden">Publish</span>
                    <ChevronDown className="w-5 h-5" />
                  </button>

                {showPublishMenu && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-56 bg-surface-container rounded-xl border border-outline-variant/10 shadow-xl z-50 overflow-hidden animate-scale-in">
                      <button
                        onClick={() => handleSave("DRAFT")}
                        className="w-full px-4 py-3 text-left text-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3"
                      >
                        <FileEdit className="w-5 h-5 text-on-surface-variant" />
                        Save as Draft
                      </button>
                    <button
                      onClick={() => handleSave("PUBLIC")}
                      className="w-full px-4 py-3 text-left text-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3"
                    >
                      <Send className="w-5 h-5 text-primary" />
                      Publish Now
                    </button>
                    <div className="border-t border-outline-variant/10">
                      <button
                        onClick={() =>
                          setShowSchedulePicker(!showSchedulePicker)
                        }
                        className="w-full px-4 py-3 text-left text-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3"
                      >
                        <Clock className="w-5 h-5 text-tertiary" />
                        Schedule for Later
                      </button>
                      {showSchedulePicker && (
                        <div className="px-4 pb-3">
                          <input
                            type="datetime-local"
                            value={scheduleDate}
                            onChange={e => setScheduleDate(e.target.value)}
                            className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none mb-2"
                          />
                          <button
                            onClick={handleSchedule}
                            disabled={!scheduleDate}
                            className="w-full editorial-gradient text-on-primary px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                          >
                            Confirm Schedule
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {showPreview ? (
            <div className="prose prose-invert prose-lg max-w-none prose-headings:font-headline prose-headings:font-semibold prose-headings:tracking-tight prose-p:font-body prose-p:text-on-surface-variant prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-on-surface prose-code:text-primary prose-code:bg-surface-container prose-code:px-2 prose-code:py-0.5 prose-code:rounded animate-fade-in">
              <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-on-surface mb-8">
                {title || "Untitled Story"}
              </h1>
              {previewLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-surface-container rounded w-full"></div>
                  <div className="h-4 bg-surface-container rounded w-5/6"></div>
                  <div className="h-4 bg-surface-container rounded w-4/5"></div>
                  <div className="h-4 bg-surface-container rounded w-full"></div>
                  <div className="h-4 bg-surface-container rounded w-3/4"></div>
                  <div className="h-4 bg-surface-container rounded w-5/6"></div>
                </div>
              ) : previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div className="whitespace-pre-wrap text-on-surface-variant">
                  {body || "Start writing to see a preview..."}
                </div>
              )}
            </div>
          ) : (
            <section className="space-y-8">
              <div className="group">
                <label className="block text-xs font-medium text-outline mb-4 ml-1 font-label">
                  Story Title
                </label>
                <input
                  className="w-full bg-transparent border-none focus:ring-0 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-headline font-bold text-on-surface placeholder:text-surface-variant tracking-tight p-0"
                  placeholder="Enter a captivating title..."
                  type="text"
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                />
                <div className="h-[2px] w-full bg-outline-variant/20 mt-4 group-focus-within:bg-primary transition-all duration-500" />
              </div>

              <div className="flex items-center gap-1 p-1 bg-surface-container-low/50 backdrop-blur-md rounded-xl sticky top-16 sm:top-24 z-30 border border-outline-variant/10 overflow-x-auto">
                <button
                  onClick={() => insertMarkdown("**", "**")}
                  className="p-1.5 sm:p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors flex-shrink-0"
                  title="Bold"
                >
                  <Bold className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={() => insertMarkdown("*", "*")}
                  className="p-1.5 sm:p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors flex-shrink-0"
                  title="Italic"
                >
                  <Italic className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={() => insertMarkdown("\n- ")}
                  className="p-1.5 sm:p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors flex-shrink-0"
                  title="List"
                >
                  <List className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div className="w-px h-6 bg-outline-variant/20 mx-1 flex-shrink-0" />
                <button
                  onClick={() => insertMarkdown("![alt](", ")")}
                  className="p-1.5 sm:p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors flex-shrink-0"
                  title="Image"
                >
                  <Image className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={() => insertMarkdown("[", "](url)")}
                  className="p-1.5 sm:p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors flex-shrink-0"
                  title="Link"
                >
                  <Link className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={() => insertMarkdown("`", "`")}
                  className="p-1.5 sm:p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors flex-shrink-0"
                  title="Code"
                >
                  <Code className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div className="flex-grow" />
                <a
                  href="https://www.markdownguide.org/cheat-sheet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 sm:px-3 text-xs font-medium text-primary hover:bg-primary/5 py-1.5 sm:py-2 rounded-lg transition-colors font-label flex-shrink-0 hidden sm:block"
                >
                  Markdown guide
                </a>
              </div>

              <div className="min-h-[600px] text-lg leading-relaxed text-on-surface-variant font-body">
                <textarea
                  className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[600px] p-0 placeholder:text-surface-variant"
                  placeholder="Begin your narrative..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
              </div>
            </section>
          )}
        </div>

        <aside className="hidden xl:flex flex-col w-80 bg-surface-container-lowest h-[calc(100vh-64px)] fixed right-0 top-16 z-40 p-8 space-y-8 border-l border-outline-variant/5 animate-slide-in-right">
          <div>
            <h3 className="font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Post Settings
            </h3>
            <div className="space-y-6">
              <div>
                <button
                  onClick={() => setShowSlugEditor(!showSlugEditor)}
                  className="flex items-center gap-1 text-[10px] text-outline hover:text-on-surface-variant transition-colors font-label"
                >
                  <Link className="w-3 h-3" />
                  <span>{slug || "auto-generated"}</span>
                  {showSlugEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showSlugEditor && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="my-post-slug"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Topic Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-surface-container-high text-xs rounded-full border border-outline-variant/10 text-primary flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      className="bg-transparent border-none focus:ring-0 text-xs w-24 text-on-surface placeholder:text-outline"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                    }}
                    />
                    <button
                      onClick={addTag}
                      className="p-1 text-outline hover:text-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs text-on-surface font-medium border border-outline-variant/5 focus:border-primary focus:ring-0 outline-none appearance-none cursor-pointer"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="DRAFT">Draft</option>
                  <option value="UNLISTED">Unlisted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  SEO Description
                </label>
                <textarea
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2 text-xs text-on-surface border border-outline-variant/5 focus:border-primary focus:ring-0 outline-none resize-none h-20 transition-colors"
                  placeholder="Brief description for search engines..."
                  value={seoDescription}
                  onChange={e => setSeoDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Cover Image
                </label>
                <input
                  className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-colors"
                  placeholder="Image URL for feed & SEO..."
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                />
                {coverImage && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-outline-variant/10 aspect-video bg-surface-container flex items-center justify-center">
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto p-4 rounded-xl bg-surface-container-low border border-outline-variant/5">
            <p className="text-[10px] font-bold text-outline uppercase mb-2 font-label">
              Search Preview
            </p>
            <div className="space-y-1">
              <div className="text-sm text-primary font-medium truncate">
                {title || "Your post title"}
              </div>
              <div className="text-xs text-on-surface-variant line-clamp-2">
                {seoDescription ||
                  "Add an SEO description to improve search visibility..."}
              </div>
              <div className="text-[10px] text-outline">
                openblog.com/blog/{slug || "your-slug"}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant/5 text-[10px] text-outline flex items-center justify-between font-label">
            <div className="flex items-center gap-1">
              {saving ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : saved ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  <span>All changes saved</span>
                </>
              ) : error ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                  <span className="text-error">Unsaved changes</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                  <span>{wordCount > 0 ? "Ready" : "Start writing"}</span>
                </>
              )}
            </div>
            <span>{wordCount} Words</span>
          </div>
        </aside>
      </main>

      <div className="md:hidden fixed bottom-6 right-6 flex flex-col gap-3 safe-area-bottom z-40">
        <button
          onClick={() => setShowMobileSettings(true)}
          className="w-12 h-12 rounded-full bg-surface-container-highest shadow-xl border border-outline-variant/20 flex items-center justify-center text-primary"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-12 h-12 rounded-full bg-surface-container-highest shadow-xl border border-outline-variant/20 flex items-center justify-center text-primary"
        >
          <Eye className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleSave()}
          className="w-14 h-14 rounded-full editorial-gradient shadow-xl shadow-primary-container/30 flex items-center justify-center text-on-primary"
        >
          <Send className="w-6 h-6" />
        </button>
      </div>

      {showMobileSettings && (
        <div className="xl:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileSettings(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-surface-container-lowest p-6 space-y-8 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Post Settings
              </h3>
              <button
                onClick={() => setShowMobileSettings(false)}
                className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <button
                  onClick={() => setShowSlugEditor(!showSlugEditor)}
                  className="flex items-center gap-1 text-[10px] text-outline hover:text-on-surface-variant transition-colors font-label"
                >
                  <Link className="w-3 h-3" />
                  <span>{slug || "auto-generated"}</span>
                  {showSlugEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showSlugEditor && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="my-post-slug"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Topic Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-surface-container-high text-xs rounded-full border border-outline-variant/10 text-primary flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      className="bg-transparent border-none focus:ring-0 text-xs w-24 text-on-surface placeholder:text-outline"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                    }}
                    />
                    <button
                      onClick={addTag}
                      className="p-1 text-outline hover:text-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs text-on-surface font-medium border border-outline-variant/5 focus:border-primary focus:ring-0 outline-none appearance-none cursor-pointer"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="DRAFT">Draft</option>
                  <option value="UNLISTED">Unlisted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  SEO Description
                </label>
                <textarea
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2 text-xs text-on-surface border border-outline-variant/5 focus:border-primary focus:ring-0 outline-none resize-none h-20 transition-colors"
                  placeholder="Brief description for search engines..."
                  value={seoDescription}
                  onChange={e => setSeoDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Cover Image
                </label>
                <input
                  className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-colors"
                  placeholder="Image URL for feed & SEO..."
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                />
                {coverImage && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-outline-variant/10 aspect-video bg-surface-container flex items-center justify-center">
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/5">
              <p className="text-[10px] font-bold text-outline uppercase mb-2 font-label">
                Search Preview
              </p>
              <div className="space-y-1">
                <div className="text-sm text-primary font-medium truncate">
                  {title || "Your post title"}
                </div>
                <div className="text-xs text-on-surface-variant line-clamp-2">
                  {seoDescription ||
                    "Add an SEO description to improve search visibility..."}
                </div>
                <div className="text-[10px] text-outline">
                  openblog.com/blog/{slug || "your-slug"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Topic Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-surface-container-high text-xs rounded-full border border-outline-variant/10 text-primary flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      className="bg-transparent border-none focus:ring-0 text-xs w-24 text-on-surface placeholder:text-outline"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                    }}
                    />
                    <button
                      onClick={addTag}
                      className="p-1 text-outline hover:text-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
                {showSlugEditor && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="my-post-slug"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Topic Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-surface-container-high text-xs rounded-full border border-outline-variant/10 text-primary flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      className="bg-transparent border-none focus:ring-0 text-xs w-24 text-on-surface placeholder:text-outline"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                    }}
                    />
                    <button
                      onClick={addTag}
                      className="p-1 text-outline hover:text-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
                {showSlugEditor && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="my-post-slug"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Topic Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-surface-container-high text-xs rounded-full border border-outline-variant/10 text-primary flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      className="bg-transparent border-none focus:ring-0 text-xs w-24 text-on-surface placeholder:text-outline"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <button
                      onClick={addTag}
                      className="p-1 text-outline hover:text-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs text-on-surface font-medium border border-outline-variant/5 focus:border-primary focus:ring-0 outline-none appearance-none cursor-pointer"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="DRAFT">Draft</option>
                  <option value="UNLISTED">Unlisted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  SEO Description
                </label>
                <textarea
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2 text-xs text-on-surface border border-outline-variant/5 focus:border-primary focus:ring-0 outline-none resize-none h-20 transition-colors"
                  placeholder="Brief description for search engines..."
                  value={seoDescription}
                  onChange={e => setSeoDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                  Cover Image
                </label>
                <input
                  className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-colors"
                  placeholder="Image URL for feed & SEO..."
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                />
                {coverImage && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-outline-variant/10 aspect-video bg-surface-container flex items-center justify-center">
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/5">
              <p className="text-[10px] font-bold text-outline uppercase mb-2 font-label">
                Search Preview
              </p>
              <div className="space-y-1">
                <div className="text-sm text-primary font-medium truncate">
                  {title || "Your post title"}
                </div>
                <div className="text-xs text-on-surface-variant line-clamp-2">
                  {seoDescription ||
                    "Add an SEO description to improve search visibility..."}
                </div>
                <div className="text-[10px] text-outline">
                  openblog.com/blog/{slug || "your-slug"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorClient({ blogName }: { blogName?: string } = {}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        </div>
      }
    >
      <EditorContent blogName={blogName} />
    </Suspense>
  );
}
