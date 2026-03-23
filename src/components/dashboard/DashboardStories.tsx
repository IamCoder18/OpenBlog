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
  metadata: {
    tags?: string[];
    seoDescription?: string | null;
    coverImage?: string | null;
  } | null;
}

type Filter = "all" | "PUBLIC" | "DRAFT" | "PRIVATE";

function getStatusBadge(visibility: string) {
  if (visibility === "DRAFT")
    return {
      label: "Draft",
      bg: "bg-on-surface-variant/10",
      text: "text-on-surface-variant",
    };
  if (visibility === "PRIVATE")
    return { label: "Private", bg: "bg-primary/10", text: "text-primary" };
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PAGE_SIZE = 10;

export default function DashboardStories({
  scope,
}: {
  scope: "personal" | "site";
}) {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    slug: string;
    title: string;
  } | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
      });
      if (filter !== "all") params.set("visibility", filter);
      if (scope === "personal") params.set("authorId", "me");
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setTotal(data.total);
      } else {
        toast.addToast("error", "Could not load stories.");
      }
    } catch {
      toast.addToast("error", "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, [page, filter, scope, search]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const filterTabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "PUBLIC", label: "Published" },
    { key: "DRAFT", label: "Drafts" },
    { key: "PRIVATE", label: "Private" },
  ];

  return (
    <>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
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

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-1 mb-6">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
              filter === tab.key
                ? "bg-primary/15 text-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-on-surface-variant font-label">
          {search ? `${total} results` : `${total} total`}
        </span>
      </div>

      {/* Post list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-container-highest animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-2.5 w-14 rounded bg-surface-container-highest animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-surface-container-highest animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-surface-container-highest animate-pulse" />
              </div>
              <div className="flex gap-1">
                <div className="w-8 h-8 rounded-lg bg-surface-container-highest animate-pulse" />
                <div className="w-8 h-8 rounded-lg bg-surface-container-highest animate-pulse" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-container-low rounded-2xl">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">
              article
            </span>
            <h3 className="font-headline text-lg font-bold text-on-surface mb-2">
              {search ? "No results found" : "No stories found"}
            </h3>
            <p className="text-on-surface-variant text-sm mb-6">
              {search
                ? `No stories matching "${search}".`
                : filter === "all"
                  ? "Create your first story to get started."
                  : `No ${filter.toLowerCase()} stories.`}
            </p>
            <Link
              href="/dashboard/editor"
              className="editorial-gradient text-on-primary px-5 py-2.5 rounded-lg font-semibold inline-flex items-center gap-2 text-sm"
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
                className={`group bg-surface-container-low hover:bg-surface-container transition-all duration-300 rounded-2xl ${
                  deleting === post.slug ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnail placeholder */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
                    {post.metadata?.coverImage ? (
                      <img
                        src={post.metadata.coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-xl text-outline-variant">
                        article
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}
                      >
                        {status.label}
                      </span>
                      {post.metadata?.tags?.[0] && (
                        <span className="text-[10px] text-on-surface-variant font-label">
                          {post.metadata.tags[0]}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-headline font-bold text-on-surface truncate">
                      {post.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {timeAgo(post.createdAt)}
                      {scope === "site" &&
                        post.author.name &&
                        ` by ${post.author.name}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
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
                        <div className="absolute right-0 top-full mt-1 w-44 bg-surface-container rounded-xl overflow-hidden z-50 animate-scale-in shadow-xl shadow-black/20">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="w-full px-4 py-2.5 text-left text-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <span className="material-symbols-outlined text-lg text-on-surface-variant">
                              visibility
                            </span>
                            View
                          </Link>
                          <Link
                            href={`/dashboard/editor?slug=${post.slug}`}
                            className="w-full px-4 py-2.5 text-left text-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <span className="material-symbols-outlined text-lg text-on-surface-variant">
                              edit
                            </span>
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(post.slug, post.title)}
                            className="w-full px-4 py-2.5 text-left text-sm text-error hover:bg-red-500/10 transition-colors flex items-center gap-3"
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
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant font-label">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">
                chevron_left
              </span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum =
                Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              if (pageNum >= totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-bold text-xs transition-colors ${
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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">
                chevron_right
              </span>
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
    </>
  );
}
