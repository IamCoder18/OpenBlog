"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  FileEdit,
  FileText,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  X,
  Pin,
  Sparkles,
} from "lucide-react";
import DeleteModal from "@/components/admin/DeleteModal";
import { useToast } from "@/components/ToastContext";

type Filter = "all" | "PUBLIC" | "DRAFT" | "PRIVATE" | "UNLISTED";
interface Post {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
  visibility: Filter;
  isPinned: boolean;
  isFeatured: boolean;
  author: { name: string | null };
  metadata: { coverImage?: string | null; tags?: string[] } | null;
}
const PAGE_SIZE = 10;
const labels: Record<Filter, string> = {
  all: "All",
  PUBLIC: "Published",
  DRAFT: "Draft",
  PRIVATE: "Private",
  UNLISTED: "Unlisted",
};

export default function DashboardStories({
  scope,
}: {
  scope: "personal" | "site";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const url = useSearchParams();
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Filter>(
    (url.get("visibility") as Filter) || "all"
  );
  const [query, setQuery] = useState(url.get("q") ?? "");
  const [page, setPage] = useState(Math.max(1, Number(url.get("page")) || 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    slug: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const menuButton = useRef<HTMLButtonElement | null>(null);

  const fetchPosts = useCallback(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (filter !== "all") params.set("visibility", filter);
      if (scope === "personal") params.set("authorId", "me");
      if (query.trim()) params.set("search", query.trim());
      const route = new URLSearchParams();
      if (scope === "site") route.set("mode", "admin");
      if (query.trim()) route.set("q", query.trim());
      if (filter !== "all") route.set("visibility", filter);
      if (page > 1) route.set("page", String(page));
      router.replace(`${pathname}${route.size ? `?${route}` : ""}`, {
        scroll: false,
      });
      try {
        const response = await fetch(`/api/posts?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setPosts(data.posts);
        setTotal(data.total);
      } catch (cause) {
        if ((cause as DOMException).name !== "AbortError")
          setError("Stories couldn’t be loaded. Try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filter, page, pathname, query, router, scope]);
  useEffect(fetchPosts, [fetchPosts]);
  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(deleteTarget.slug)}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Delete failed");
      setPosts(current =>
        current.filter(post => post.slug !== deleteTarget.slug)
      );
      setTotal(value => Math.max(0, value - 1));
      setDeleteTarget(null);
      toast.addToast("success", "Story deleted.");
      router.refresh();
    } catch (cause) {
      setDeleteError((cause as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function togglePriority(post: Post, field: "isPinned" | "isFeatured") {
    const next = !post[field];
    setMenu(null);
    setPosts(current =>
      current.map(item =>
        item.id === post.id ? { ...item, [field]: next } : item
      )
    );
    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(post.slug)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: next }),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Update failed");
      toast.addToast(
        "success",
        field === "isPinned"
          ? next
            ? "Story pinned."
            : "Story unpinned."
          : next
            ? "Story featured."
            : "Story no longer featured."
      );
      router.refresh();
    } catch (cause) {
      setPosts(current =>
        current.map(item =>
          item.id === post.id ? { ...item, [field]: !next } : item
        )
      );
      toast.addToast("error", (cause as Error).message);
    }
  }

  const hasFilters = !!query || filter !== "all";
  return (
    <section aria-label="Story library" aria-busy={loading}>
      <form
        role="search"
        onSubmit={event => event.preventDefault()}
        className="relative mb-5"
      >
        <Search className="absolute left-3 top-3.5 w-5 h-5" />
        <label htmlFor="story-search" className="sr-only">
          Search your stories
        </label>
        <input
          id="story-search"
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setPage(1);
          }}
          className="input-field w-full pl-11 pr-12 min-h-12"
          placeholder="Search title, body, or author…"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear story search"
            onClick={() => {
              setQuery("");
              setPage(1);
            }}
            className="absolute right-1 top-0.5 min-w-11 min-h-11"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </form>
      <div
        role="group"
        aria-label="Filter by visibility"
        className="flex flex-wrap gap-2 mb-6"
      >
        {(Object.keys(labels) as Filter[]).map(value => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className="btn-secondary py-2 px-4 aria-pressed:bg-primary/15 aria-pressed:text-primary"
          >
            {labels[value]}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-on-surface-variant">
          {total} total
        </span>
      </div>
      {error && (
        <div
          role="alert"
          className="theme-danger-soft theme-danger-text rounded-xl p-4 mb-5"
        >
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}
      {loading && !posts.length ? (
        <div role="status" className="py-16 text-center">
          Loading stories…
        </div>
      ) : !posts.length ? (
        <div className="text-center py-20 bg-surface-container-low rounded-2xl">
          <FileText className="w-12 h-12 mx-auto text-outline mb-4" />
          <h2 className="text-xl font-bold">
            {hasFilters ? "No matching stories" : "Your library is empty"}
          </h2>
          <p className="mt-2 text-on-surface-variant">
            {hasFilters
              ? "Clear the filters to see the full library."
              : "Create a draft when you’re ready to write."}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
                setPage(1);
              }}
              className="btn-secondary mt-5"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/dashboard/editor"
              className="btn-primary inline-flex gap-2 mt-5"
            >
              <Plus className="w-4 h-4" />
              New story
            </Link>
          )}
        </div>
      ) : (
        <div className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
          {posts.map(post => (
            <article
              key={post.id}
              className="bg-surface-container-low rounded-xl p-4 flex gap-4 items-center"
            >
              <div className="w-14 h-14 rounded-lg bg-surface-container grid place-items-center overflow-hidden">
                {post.metadata?.coverImage ? (
                  <img
                    src={post.metadata.coverImage}
                    alt=""
                    width="56"
                    height="56"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-semibold bg-surface-container-high rounded-md px-2 py-1">
                    {labels[post.visibility]}
                  </span>
                  {post.isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      <Sparkles className="size-3" /> Featured
                    </span>
                  )}
                  {post.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-1 text-xs font-semibold">
                      <Pin className="size-3" /> Pinned
                    </span>
                  )}
                  {scope === "site" && (
                    <span className="text-xs text-on-surface-variant">
                      {post.author.name || "Anonymous"}
                    </span>
                  )}
                </div>
                <h3 className="font-bold mt-2 truncate">
                  <Link
                    href={`/dashboard/editor?slug=${post.slug}`}
                    className="hover:text-primary"
                  >
                    {post.title}
                  </Link>
                </h3>
                <time
                  dateTime={post.createdAt}
                  className="text-xs text-on-surface-variant"
                >
                  Updated{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                  }).format(new Date(post.createdAt))}
                </time>
              </div>
              <div className="relative">
                <button
                  ref={menu === post.id ? menuButton : undefined}
                  type="button"
                  onClick={() => setMenu(menu === post.id ? null : post.id)}
                  aria-label={`Actions for ${post.title}`}
                  aria-haspopup="menu"
                  aria-expanded={menu === post.id}
                  className="min-w-11 min-h-11 grid place-items-center rounded-lg hover:bg-surface-container"
                >
                  <MoreVertical />
                </button>
                {menu === post.id && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-30 w-48 bg-surface-container rounded-xl shadow-xl p-1"
                  >
                    {post.visibility === "PUBLIC" && (
                      <Link
                        role="menuitem"
                        href={`/blog/${post.slug}`}
                        className="min-h-11 px-3 flex items-center gap-2 rounded-lg hover:bg-surface-container-high"
                      >
                        <Eye className="w-4 h-4" />
                        View public story
                      </Link>
                    )}
                    <Link
                      role="menuitem"
                      href={`/dashboard/editor?slug=${post.slug}`}
                      className="min-h-11 px-3 flex items-center gap-2 rounded-lg hover:bg-surface-container-high"
                    >
                      <FileEdit className="w-4 h-4" />
                      Edit or preview
                    </Link>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => void togglePriority(post, "isFeatured")}
                      className="w-full min-h-11 px-3 flex items-center gap-2 rounded-lg hover:bg-surface-container-high"
                    >
                      <Sparkles className="w-4 h-4" />
                      {post.isFeatured ? "Remove feature" : "Feature story"}
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => void togglePriority(post, "isPinned")}
                      className="w-full min-h-11 px-3 flex items-center gap-2 rounded-lg hover:bg-surface-container-high"
                    >
                      <Pin className="w-4 h-4" />
                      {post.isPinned ? "Unpin story" : "Pin story"}
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setMenu(null);
                        setDeleteTarget({ slug: post.slug, title: post.title });
                      }}
                      className="w-full min-h-11 px-3 flex items-center gap-2 rounded-lg theme-danger-text hover:theme-danger-soft"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {Math.ceil(total / PAGE_SIZE) > 1 && (
        <nav
          aria-label="Story pages"
          className="flex justify-center gap-3 mt-8"
        >
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(value => value - 1)}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="self-center">
            Page {page} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            type="button"
            disabled={page >= Math.ceil(total / PAGE_SIZE)}
            onClick={() => setPage(value => value + 1)}
            className="btn-secondary"
          >
            Next
          </button>
        </nav>
      )}
      {deleteTarget && (
        <DeleteModal
          title={deleteTarget.title}
          pending={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
