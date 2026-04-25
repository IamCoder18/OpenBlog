"use client";

import { useState } from "react";
import { FileText, LayoutGrid, List, User, ChevronRight, RefreshCw, ChevronDown } from "lucide-react";
import { stripMarkdown } from "@/lib/strip-markdown";

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

interface PostsResponse {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
}

interface LoadMorePostsProps {
  initialPosts: Post[];
}

function formatDate(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LoadMorePosts({ initialPosts }: LoadMorePostsProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const loadMore = async () => {
    if (loading) return;

    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/posts?limit=6&offset=${offset}`);
      if (res.ok) {
        const data = (await res.json()) as PostsResponse;
        setPosts(prev => [...prev, ...data.posts]);
        setOffset(prev => prev + 6);
        setHasMore(
          data.posts.length === 6 &&
            data.offset + data.posts.length < data.total
        );
      } else {
        setLoadError("Could not load more stories. Please try again.");
      }
    } catch {
      setLoadError(
        "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <FileText className="w-16 h-16 text-outline-variant mb-4" />
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">
          No posts yet
        </h2>
        <p className="text-on-surface-variant">
          Check back soon for new content
        </p>
      </div>
    );
  }

  const remainingPosts = posts.slice(1);

  return (
    <section className="mb-20">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
            Recent Stories
          </h2>
          <p className="text-on-surface-variant font-label text-sm mt-2">
            Latest updates from the curated collective
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-surface-container-low text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-surface-container-low text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        /* Bento Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Large Feature Card */}
          {remainingPosts[0] && (
            <article className="md:col-span-8 group relative overflow-hidden rounded-xl bg-surface-container-low hover:bg-surface-container transition-all duration-500">
              <a href={`/blog/${remainingPosts[0].slug}`} className="block">
                {remainingPosts[0].metadata?.coverImage && (
                  <div className="aspect-video overflow-hidden bg-surface-container">
                    <img
                      src={remainingPosts[0].metadata.coverImage}
                      alt={remainingPosts[0].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-8">
                  <div className="flex items-center space-x-4 mb-4">
                    {remainingPosts[0].metadata?.category && (
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-widest rounded-full">
                        {remainingPosts[0].metadata.category}
                      </span>
                    )}
                    <span className="text-on-surface-variant text-xs font-label">
                      {remainingPosts[0].metadata?.readTime
                        ? `${remainingPosts[0].metadata.readTime} Min Read`
                        : "5 Min Read"}
                    </span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold mb-4 group-hover:text-primary transition-colors text-on-surface">
                    {remainingPosts[0].title}
                  </h3>
                  <p className="text-on-surface-variant line-clamp-2 leading-relaxed mb-6">
                    {stripMarkdown(remainingPosts[0].bodyMarkdown, 150)}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
                        {remainingPosts[0].author.image ? (
                          <img
                            className="w-full h-full object-cover"
                            src={remainingPosts[0].author.image}
                            alt={remainingPosts[0].author.name || ""}
                          />
                        ) : (
                          <User className="w-5 h-5 text-on-surface-variant" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-on-surface">
                        {remainingPosts[0].author.name || "Anonymous"}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            </article>
          )}

          {/* Side Card 1 */}
          {remainingPosts[1] && (
            <a
              href={`/blog/${remainingPosts[1].slug}`}
              className="md:col-span-4 bg-surface-container-low rounded-xl p-8 flex flex-col justify-between hover:bg-surface-container transition-all duration-300 group"
            >
              <div>
                <h3 className="font-headline text-xl font-bold mb-4 text-on-surface group-hover:text-primary transition-colors">
                  {remainingPosts[1].title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6 line-clamp-3">
                  {stripMarkdown(remainingPosts[1].bodyMarkdown, 120)}
                </p>
              </div>
                <div className="flex items-center justify-between border-t border-outline-variant/10 pt-6">
                  <span className="text-xs text-on-surface-variant">
                    {formatDate(remainingPosts[1].publishedAt)}
                  </span>
                  <span className="text-primary text-xs font-bold uppercase tracking-widest flex items-center">
                    Read
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
            </a>
          )}

          {/* Side Card 2 */}
          {remainingPosts[2] && (
            <a
              href={`/blog/${remainingPosts[2].slug}`}
              className="md:col-span-4 bg-surface-container-low rounded-xl p-8 flex flex-col justify-between hover:bg-surface-container transition-all duration-300 group"
            >
              <div>
                <h3 className="font-headline text-xl font-bold mb-4 text-on-surface group-hover:text-primary transition-colors">
                  {remainingPosts[2].title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6 line-clamp-3">
                  {stripMarkdown(remainingPosts[2].bodyMarkdown, 120)}
                </p>
              </div>
                <div className="flex items-center justify-between border-t border-outline-variant/10 pt-6">
                  <span className="text-xs text-on-surface-variant">
                    {formatDate(remainingPosts[2].publishedAt)}
                  </span>
                  <span className="text-primary text-xs font-bold uppercase tracking-widest flex items-center">
                    Read
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
            </a>
          )}

          {/* Small Grid Items */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            {remainingPosts.slice(3).map(post => (
              <a
                key={post.id}
                href={`/blog/${post.slug}`}
                className="bg-surface-container-low rounded-xl overflow-hidden hover:bg-surface-container transition-all duration-300 group"
              >
                {post.metadata?.coverImage && (
                  <div className="h-40 bg-surface-container overflow-hidden">
                    <img
                      src={post.metadata.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h4 className="font-headline font-bold mb-2 text-on-surface group-hover:text-primary transition-colors">
                    {post.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                    {stripMarkdown(post.bodyMarkdown, 80)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : (
        /* List Layout */
        <div className="space-y-4">
          {remainingPosts.map(post => (
            <a
              key={post.id}
              href={`/blog/${post.slug}`}
              className="flex gap-6 p-4 bg-surface-container-low rounded-xl hover:bg-surface-container transition-all duration-300 group"
            >
              {post.metadata?.coverImage && (
                <div className="w-32 h-20 flex-shrink-0 bg-surface-container rounded-lg overflow-hidden">
                  <img
                    src={post.metadata.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-1">
                  {post.metadata?.category && (
                    <span className="text-primary text-[10px] uppercase tracking-widest font-bold font-label">
                      {post.metadata.category}
                    </span>
                  )}
                  <span className="text-xs text-on-surface-variant font-label">
                    {formatDate(post.publishedAt)}
                  </span>
                </div>
                <h3 className="font-headline text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                  {post.title}
                </h3>
                <p className="text-sm text-on-surface-variant line-clamp-1 mt-1">
                  {stripMarkdown(post.bodyMarkdown, 120)}
                </p>
              </div>
              <div className="flex items-center flex-shrink-0">
                <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="mt-20 flex flex-col items-center">
          {loadError ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-error">{loadError}</p>
              <button
                onClick={loadMore}
                className="px-6 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-sm text-on-surface font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <button
              onClick={loadMore}
              disabled={loading}
              className="group flex flex-col items-center space-y-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-12 h-12 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : (
                <>
                  <span className="text-sm font-label text-on-surface-variant uppercase tracking-widest group-hover:text-primary transition-colors">
                    Load more stories
                  </span>
                  <div className="w-12 h-12 rounded-full border border-outline-variant/20 flex items-center justify-center group-hover:border-primary transition-colors">
                    <ChevronDown className="w-5 h-5 text-on-surface-variant group-hover:text-primary animate-bounce" />
                  </div>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
