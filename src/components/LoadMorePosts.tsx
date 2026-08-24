"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import PublicStoryCard, {
  type PublicStory,
} from "@/components/PublicStoryCard";

interface PostsResponse {
  posts: PublicStory[];
  total: number;
}

export default function LoadMorePosts({
  initialPosts,
  initialTotal = initialPosts.length,
}: {
  initialPosts: PublicStory[];
  initialTotal?: number;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasMore = posts.length < initialTotal;

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/posts?limit=12&offset=${posts.length}&order=home&visibility=PUBLIC`
      );
      if (!response.ok) throw new Error("Request failed");
      const data = (await response.json()) as PostsResponse;
      setPosts(current => [
        ...current,
        ...data.posts.filter(
          post => !current.some(existing => existing.id === post.id)
        ),
      ]);
    } catch {
      setError("More stories couldn’t be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const leading = posts.slice(0, 3);
  const pinned = posts.slice(3).filter(post => post.isPinned);
  const remaining = posts.slice(3).filter(post => !post.isPinned);

  return (
    <div className="space-y-[var(--section-gap)]">
      <section aria-labelledby="latest-stories">
        <div className="mb-7 flex items-end justify-between gap-4">
          <h2
            id="latest-stories"
            className="font-headline text-3xl font-bold tracking-[-0.04em] sm:text-4xl"
          >
            Latest stories
          </h2>
          <span className="text-sm text-on-surface-variant">
            {initialTotal} {initialTotal === 1 ? "story" : "stories"}
          </span>
        </div>
        <div className="publication-card-grid publication-stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {leading.map((post, index) => (
            <PublicStoryCard
              key={post.id}
              post={post}
              priority={index === 0}
              index={index}
            />
          ))}
        </div>
      </section>

      {pinned.length > 0 && (
        <section aria-labelledby="pinned-stories">
          <h2
            id="pinned-stories"
            className="mb-7 font-headline text-2xl font-bold tracking-tight"
          >
            Pinned stories
          </h2>
          <div className="publication-card-grid publication-stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pinned.map((post, index) => (
              <PublicStoryCard key={post.id} post={post} index={index + 3} />
            ))}
          </div>
        </section>
      )}

      {remaining.length > 0 && (
        <section aria-labelledby="more-stories">
          <h2
            id="more-stories"
            className="mb-7 font-headline text-2xl font-bold tracking-tight"
          >
            More stories
          </h2>
          <div className="publication-card-grid publication-stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {remaining.map((post, index) => (
              <PublicStoryCard
                key={post.id}
                post={post}
                index={index + leading.length + pinned.length}
              />
            ))}
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="text-center theme-danger-text">
          {error}
        </p>
      )}
      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="btn-secondary min-h-12 px-6"
          >
            {loading && <RefreshCw className="size-4 animate-spin" />}
            {loading ? "Loading…" : "Load more stories"}
          </button>
        </div>
      )}
    </div>
  );
}
