"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastContext";
import { useDebouncedCallback } from "@/lib/hooks";
import DeleteModal from "@/components/admin/DeleteModal";

interface Post {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  publishedAt: string | null;
  createdAt: string;
  visibility: string;
  author: { id: string; name: string | null; image: string | null };
  metadata: { tags?: string[]; seoDescription?: string | null } | null;
}

type Filter = "all" | "PUBLIC" | "DRAFT" | "PRIVATE";

function getStatusBadge(visibility: string) {
  if (visibility === "DRAFT") {
    return {
      label: "Draft",
      bg: "bg-on-surface-variant/10",
      text: "text-on-surface-variant",
    };
  }
  if (visibility === "PRIVATE") {
    return { label: "Private", bg: "bg-primary/10", text: "text-primary" };
  }
  return {
    label: "Published",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  };
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PAGE_SIZE = 10;

export default function StoriesList({
  initialTotal,
}: {
  initialTotal: number;
}) {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(initialTotal);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    slug: string;
    title: string;
  } | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
      });
      if (filter !== "all") params.set("visibility", filter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setTotal(data.total);
      } else {
        const message = "Could not load stories. Please try again.";
        setLoadError(message);
        toast.addToast("error", message);
      }
    } catch {
      const message = "Couldn't reach the server. Check your connection.";
      setLoadError(message);
      toast.addToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu-container]")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter);
    setPage(0);
  };

  const handleSearchChange = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, 300);

  const handleDelete = (slug: string, title: string) => {
    setOpenMenuId(null);
    setDeleteTarget({ slug, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.slug);
    try {
      const res = await fetch(`/api/posts/${deleteTarget.slug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.addToast("success", "Post deleted.");
        setTotal(prev => Math.max(0, prev - 1));
        setPosts(prev => prev.filter(p => p.slug !== deleteTarget.slug));
      } else {
        const data = await res.json().catch(() => null);
        toast.addToast("error", data?.error || "Could not delete post.");
      }
    } catch {
      toast.addToast("error", "Couldn't reach the server.");
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  return (
    <section className="px-10 pb-20 max-w-7xl mx-auto">
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search stories..."
            defaultValue={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-primary outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(0);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-container-high rounded transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-lg">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          {(["all", "PUBLIC", "DRAFT", "PRIVATE"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`pb-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "text-on-surface border-b-2 border-primary font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f === "all"
                ? "All Posts"
                : f === "PUBLIC"
                  ? "Published"
                  : f === "DRAFT"
                    ? "Drafts"
                    : "Private"}
            </button>
          ))}
        </div>
      </div>

      {/* Post List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              sync
            </span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-6xl text-error mb-4">
              cloud_off
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
              Couldn&apos;t load stories
            </h3>
            <p className="text-on-surface-variant text-sm mb-6">{loadError}</p>
            <button
              onClick={fetchPosts}
              className="editorial-gradient text-on-primary px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              article
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
              No stories found
            </h3>
            <p className="text-on-surface-variant text-sm mb-6">
              Create your first story to get started.
            </p>
            <Link
              href="/dashboard/editor"
              className="editorial-gradient text-on-primary px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              New Post
            </Link>
          </div>
        ) : (
          posts.map(post => {
            const status = getStatusBadge(post.visibility);
            return (
              <div
                key={post.id}
                className={`group bg-surface-container-low hover:bg-surface-container transition-all duration-300 p-4 rounded-2xl flex items-center gap-6 ${deleting === post.slug ? "opacity-50" : ""}`}
              >
                <div className="w-32 h-20 rounded-lg overflow-hidden bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-outline-variant">
                    article
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-label">
                      {post.metadata?.tags?.[0] || "General"}
                    </span>
                  </div>
                  <h3 className="text-lg font-headline font-bold text-on-surface truncate">
                    {post.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Last updated {timeAgo(post.createdAt)}
                    {post.author.name && ` by ${post.author.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-12 px-6">
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/editor?slug=${post.slug}`}
                      className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                    </Link>
                    <div className="relative" data-menu-container>
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === post.id ? null : post.id)
                        }
                        className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          more_vert
                        </span>
                      </button>
                      {openMenuId === post.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-surface-container rounded-xl border border-outline-variant/10 shadow-xl z-50 overflow-hidden animate-scale-in">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="w-full px-4 py-3 text-left text-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <span className="material-symbols-outlined text-lg text-on-surface-variant">
                              visibility
                            </span>
                            View post
                          </Link>
                          <Link
                            href={`/dashboard/editor?slug=${post.slug}`}
                            className="w-full px-4 py-3 text-left text-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <span className="material-symbols-outlined text-lg text-on-surface-variant">
                              edit
                            </span>
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(post.slug, post.title)}
                            className="w-full px-4 py-3 text-left text-sm text-error hover:bg-red-500/10 transition-colors flex items-center gap-3"
                          >
                            <span className="material-symbols-outlined text-lg">
                              delete
                            </span>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-between border-t border-outline-variant/15 pt-8">
          <p className="text-xs text-on-surface-variant font-label">
            Showing {page * PAGE_SIZE + 1} to{" "}
            {Math.min((page + 1) * PAGE_SIZE, total)} of {total} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum =
                Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              if (pageNum >= totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-bold text-xs transition-colors ${
                    page === pageNum
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      )}
      {deleteTarget && (
        <DeleteModal
          title={deleteTarget.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
