"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react";
import PublicStoryCard, {
  type PublicStory,
} from "@/components/PublicStoryCard";

interface PostsResponse {
  posts: PublicStory[];
  total: number;
}

const PAGE_SIZE = 10;

export default function ExploreClient({
  initialPosts,
  initialTotal,
}: {
  initialPosts: PublicStory[];
  initialTotal: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const initialQuery = urlParams.get("q") ?? "";
  const initialPage = Math.max(
    1,
    Number.parseInt(urlParams.get("page") ?? "1", 10) || 1
  );
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(
    initialQuery !== "" || initialPage !== 1
  );
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRun = useRef(true);

  const topics = Array.from(
    new Set(initialPosts.flatMap(post => post.metadata?.tags ?? []))
  ).slice(0, 7);

  const updateUrl = useCallback(
    (nextQuery: string, nextPage: number) => {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextPage > 1) params.set("page", String(nextPage));
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
        scroll: false,
      });
    },
    [pathname, router]
  );

  useEffect(() => {
    if (firstRun.current && !initialQuery && initialPage === 1) {
      firstRun.current = false;
      return;
    }
    firstRun.current = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        order: "all",
        visibility: "PUBLIC",
      });
      if (query.trim()) params.set("search", query.trim());
      try {
        const response = await fetch(`/api/posts?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Request failed");
        const data = (await response.json()) as PostsResponse;
        setPosts(data.posts);
        setTotal(data.total);
      } catch (cause) {
        if ((cause as DOMException).name !== "AbortError") {
          setError(
            "Stories couldn’t be loaded. Your previous results are still shown."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    updateUrl(query, page);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialPage, initialQuery, page, query, requestVersion, updateUrl]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  function goToPage(nextPage: number) {
    setPage(nextPage);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <>
      <form
        className="relative z-10 mx-auto -mt-16 mb-7 max-w-3xl px-4"
        role="search"
        onSubmit={event => event.preventDefault()}
      >
        <label htmlFor="explore-search" className="sr-only">
          Search stories
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-2 shadow-[0_18px_50px_rgba(28,32,51,0.12)]">
          <Search
            aria-hidden="true"
            className="ml-2 size-5 shrink-0 text-primary"
          />
          <input
            id="explore-search"
            className="min-h-12 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-on-surface-variant/70"
            placeholder="Search by title, topic, or keyword…"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              aria-label="Clear search"
              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      </form>

      {topics.length > 0 && !query && (
        <nav
          aria-label="Topics"
          className="mb-12 flex flex-wrap justify-center gap-2"
        >
          <span className="py-2 text-xs font-bold text-on-surface-variant">
            Topics:
          </span>
          {topics.map(topic => (
            <Link
              key={topic}
              href={`/topics/${encodeURIComponent(topic)}`}
              className="rounded-full bg-surface-container px-3.5 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {topic}
            </Link>
          ))}
        </nav>
      )}

      <section aria-busy={loading} aria-live="polite">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">{query ? "Search" : "Archive"}</span>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 text-3xl font-bold tracking-[-0.04em] outline-none"
            >
              {query ? `Results for “${query}”` : "Browse all stories"}
            </h2>
          </div>
          <span className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
            {total} {total === 1 ? "story" : "stories"}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 theme-danger-soft theme-danger-text"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setRequestVersion(value => value + 1)}
              className="font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div
            role="status"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant"
          >
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            Updating results…
          </div>
        )}

        {posts.length === 0 && !loading ? (
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest px-6 py-20 text-center">
            <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="size-6" />
            </span>
            <h3 className="text-xl font-bold">
              {query ? "No matching stories" : "Nothing to explore yet"}
            </h3>
            <p className="mt-2 text-on-surface-variant">
              {query
                ? "Try fewer words or a broader topic."
                : "Published articles will appear here."}
            </p>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="btn-secondary mt-5"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div
            className={`publication-card-grid publication-stagger grid grid-cols-1 gap-6 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-55" : "opacity-100"}`}
          >
            {posts.map((post, index) => (
              <PublicStoryCard key={post.id} post={post} index={index} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Search result pages"
            className="mt-12 flex items-center justify-center gap-3"
          >
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              aria-label="Previous page"
              className="btn-secondary min-w-11 px-3"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="rounded-full bg-surface-container px-4 py-2 text-sm font-semibold">
              {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => goToPage(page + 1)}
              aria-label="Next page"
              className="btn-secondary min-w-11 px-3"
            >
              <ChevronRight className="size-5" />
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
