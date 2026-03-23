"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "@/lib/hooks";

interface Post {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  publishedAt: string | null;
  author: Author;
  metadata: Metadata | null;
}

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Metadata {
  readTime?: number;
  category?: string;
  coverImage?: string;
  tags?: string[];
}

interface PostsResponse {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 10;

export default function ExploreClient({
  initialPosts,
  initialTotal,
}: {
  initialPosts: Post[];
  initialTotal: number;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/posts?${params}`);
      if (res.ok) {
        const data: PostsResponse = await res.json();
        setPosts(data.posts);
        setTotal(data.total);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleSearchChange = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, 300);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div className="max-w-xl mx-auto mb-16">
        <div className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-3 border border-outline-variant/10">
          <span className="material-symbols-outlined text-on-surface-variant ml-2">
            search
          </span>
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 outline-none"
            placeholder="Search stories, topics, authors..."
            type="text"
            defaultValue={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(0);
              }}
              className="p-1 hover:bg-surface-container-high rounded transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-on-surface-variant">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-headline text-2xl font-bold text-on-surface">
            {search ? `Search results` : "All stories"}
          </h2>
          {total > 0 && (
            <span className="text-xs text-on-surface-variant font-label">
              {total} {total === 1 ? "story" : "stories"} found
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-low rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-surface-container-highest" />
                <div className="p-6 space-y-3">
                  <div className="h-3 w-16 rounded bg-surface-container-highest" />
                  <div className="h-5 w-3/4 rounded bg-surface-container-highest" />
                  <div className="h-4 w-full rounded bg-surface-container-highest" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              search_off
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
              {search ? "No stories found" : "Nothing to explore yet"}
            </h3>
            <p className="text-on-surface-variant text-sm">
              {search
                ? `No results for "${search}". Try different keywords.`
                : "Check back soon for new stories."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <a
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-surface-container-low rounded-xl overflow-hidden hover:bg-surface-container transition-all duration-300"
              >
                {post.metadata?.coverImage && (
                  <div className="aspect-video bg-surface-container overflow-hidden">
                    <img
                      src={post.metadata.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  {post.metadata?.category && (
                    <span className="inline-block px-3 py-1 bg-violet-500/10 text-violet-400 text-[10px] uppercase font-bold tracking-widest rounded-full mb-3">
                      {post.metadata.category}
                    </span>
                  )}
                  <h3 className="font-headline text-lg font-bold mb-2 text-on-surface group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-2 mb-4">
                    {post.bodyMarkdown?.slice(0, 120)}...
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">
                        person
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant">
                      {post.author.name || "Anonymous"}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-3">
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
      </section>
    </>
  );
}
