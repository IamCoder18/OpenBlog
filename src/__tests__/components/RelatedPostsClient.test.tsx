import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RelatedPostsClient from "@/components/RelatedPostsClient";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { handlers } from "../mocks/handlers";

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen();
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  server.resetHandlers();
});

describe("RelatedPostsClient", () => {
  it("renders loading state initially", () => {
    // Override handler to never resolve
    server.use(
      http.get("/api/posts/:slug/related", () => {
        return new Promise(() => {}); // Never resolves
      })
    );

    render(<RelatedPostsClient slug="test-post" />);

    expect(screen.getByText("Related Stories")).toBeInTheDocument();
    // Check for loading skeletons (they have animate-pulse class)
    const loadingDiv = document.querySelector(".animate-pulse");
    expect(loadingDiv).toBeInTheDocument();
  });

  it("renders related posts on success", async () => {
    const mockPosts = [
      {
        id: "1",
        title: "Related Post 1",
        slug: "related-post-1",
        bodyMarkdown: "Some content",
        publishedAt: new Date().toISOString(),
        author: { id: "a1", name: "Author 1", image: null },
        metadata: { category: "Tech", readTime: 5, coverImage: null },
      },
    ];

    server.use(
      http.get("/api/posts/:slug/related", () => {
        return HttpResponse.json(mockPosts);
      })
    );

    render(<RelatedPostsClient slug="test-post" />);

    expect(await screen.findByText("Related Post 1")).toBeInTheDocument();
  });

  it("renders error state on fetch failure", async () => {
    server.use(
      http.get("/api/posts/:slug/related", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<RelatedPostsClient slug="test-post" />);

    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
    expect(
      screen.getByText(/Related stories could not be loaded/)
    ).toBeInTheDocument();
  });

  it("renders error state on network error", async () => {
    server.use(
      http.get("/api/posts/:slug/related", () => {
        return HttpResponse.error();
      })
    );

    render(<RelatedPostsClient slug="test-post" />);

    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
  });

  it("returns null when no related posts", async () => {
    server.use(
      http.get("/api/posts/:slug/related", () => {
        return HttpResponse.json([]);
      })
    );

    const { container } = render(<RelatedPostsClient slug="test-post" />);

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(container.firstChild).toBeNull();
  });

  it("fetches from correct API endpoint", async () => {
    let fetchedSlug = "";
    server.use(
      http.get("/api/posts/:slug/related", ({ params }) => {
        fetchedSlug = params.slug as string;
        return HttpResponse.json([]);
      })
    );

    render(<RelatedPostsClient slug="my-post" />);

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(fetchedSlug).toBe("my-post");
  });

  it("limits to 3 posts", async () => {
    const mockPosts = [
      {
        id: "1",
        title: "Post 1",
        slug: "p1",
        bodyMarkdown: "a",
        publishedAt: null,
        author: { id: "a", name: "A", image: null },
        metadata: null,
      },
      {
        id: "2",
        title: "Post 2",
        slug: "p2",
        bodyMarkdown: "b",
        publishedAt: null,
        author: { id: "b", name: "B", image: null },
        metadata: null,
      },
      {
        id: "3",
        title: "Post 3",
        slug: "p3",
        bodyMarkdown: "c",
        publishedAt: null,
        author: { id: "c", name: "C", image: null },
        metadata: null,
      },
      {
        id: "4",
        title: "Post 4",
        slug: "p4",
        bodyMarkdown: "d",
        publishedAt: null,
        author: { id: "d", name: "D", image: null },
        metadata: null,
      },
    ];

    server.use(
      http.get("/api/posts/:slug/related", () => {
        return HttpResponse.json(mockPosts);
      })
    );

    render(<RelatedPostsClient slug="test" />);

    expect(await screen.findByText("Post 1")).toBeInTheDocument();
    expect(screen.queryByText("Post 4")).not.toBeInTheDocument();
  });
});
