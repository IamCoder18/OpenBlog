import { render, screen, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "../mocks/browser";
import { handlers } from "../mocks/handlers";
import RelatedPostsClient from "../../components/RelatedPostsClient";

const mockRelatedPosts = [
  {
    id: "post-1",
    title: "First Related Post",
    slug: "first-related-post",
    bodyMarkdown:
      "This is the content of the first related post. It has some interesting information about React and testing.",
    publishedAt: "2024-01-15T10:00:00Z",
    author: {
      id: "author-1",
      name: "John Doe",
      image: "https://example.com/avatar.jpg",
    },
    metadata: {
      category: "Technology",
      readTime: 5,
    },
  },
  {
    id: "post-2",
    title: "Second Related Post",
    slug: "second-related-post",
    bodyMarkdown:
      "Another great post about web development and Next.js best practices.",
    publishedAt: "2024-01-20T10:00:00Z",
    author: {
      id: "author-2",
      name: "Jane Smith",
      image: "https://example.com/avatar2.jpg",
    },
    metadata: {
      category: "Development",
      readTime: 8,
    },
  },
  {
    id: "post-3",
    title: "Third Related Post",
    slug: "third-related-post",
    bodyMarkdown: "A short post about TypeScript and JavaScript tips.",
    publishedAt: "2024-01-25T10:00:00Z",
    author: {
      id: "author-3",
      name: null,
      image: null,
    },
    metadata: {
      category: "JavaScript",
      readTime: 3,
    },
  },
];

let server: ReturnType<typeof setupServer>;

beforeAll(async () => {
  server = await setupServer();
  server.use(...handlers);
  server.listen();
});

afterAll(() => {
  server.close();
});

describe("RelatedPostsClient", () => {
  let consoleErrorSpy: vi.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(message => {
      if (
        typeof message === "string" &&
        message.includes("was not wrapped in act")
      ) {
        return;
      }
      console.log(message);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    server.resetHandlers();
  });

  describe("Loading state", () => {
    it("renders skeleton cards while loading", async () => {
      let resolveFetch: () => void;
      const fetchPromise = new Promise<void>(resolve => {
        resolveFetch = resolve;
      });

      server.use(
        http.get("/api/posts/:slug/related", async () => {
          await fetchPromise;
          return HttpResponse.json(mockRelatedPosts);
        })
      );

      render(<RelatedPostsClient slug="test-slug" />);

      expect(screen.getByText("Related Stories")).toBeInTheDocument();

      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);

      resolveFetch!();
    });

    it("renders loading state with correct heading", () => {
      server.use(
        http.get("/api/posts/:slug/related", async () => {
          await new Promise(() => {});
        })
      );

      render(<RelatedPostsClient slug="test-slug" />);

      expect(screen.getByText("Related Stories")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("renders nothing when no related posts are returned", async () => {
      server.use(
        http.get("/api/posts/:slug/related", () => {
          return HttpResponse.json([]);
        })
      );

      const { container } = render(<RelatedPostsClient slug="test-slug" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("does not render section when posts array is empty", async () => {
      server.use(
        http.get("/api/posts/:slug/related", () => {
          return HttpResponse.json([]);
        })
      );

      const { container } = render(<RelatedPostsClient slug="test-slug" />);

      await waitFor(() => {
        expect(screen.queryByText("Related Stories")).not.toBeInTheDocument();
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe("Rendering related posts", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/posts/:slug/related", () => {
          return HttpResponse.json(mockRelatedPosts);
        })
      );
    });

    it("renders related posts when available", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      expect(await screen.findByText("First Related Post")).toBeInTheDocument();
      expect(
        await screen.findByText("Second Related Post")
      ).toBeInTheDocument();
      expect(await screen.findByText("Third Related Post")).toBeInTheDocument();
    });

    it("displays correct category for each post", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      expect(await screen.findByText("Technology")).toBeInTheDocument();
      expect(await screen.findByText("Development")).toBeInTheDocument();
      expect(await screen.findByText("JavaScript")).toBeInTheDocument();
    });

    it("displays correct author name", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      expect(await screen.findByText("John Doe")).toBeInTheDocument();
      expect(await screen.findByText("Jane Smith")).toBeInTheDocument();
    });

    it("displays 'Anonymous' when author name is null", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      expect(await screen.findByText("Anonymous")).toBeInTheDocument();
    });

    it("displays post excerpt from bodyMarkdown", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      expect(
        await screen.findByText(
          /This is the content of the first related post/i
        )
      ).toBeInTheDocument();
    });

    it("limits display to 3 posts maximum", async () => {
      const manyPosts = [
        ...mockRelatedPosts,
        {
          id: "post-4",
          title: "Fourth Post",
          slug: "fourth-post",
          bodyMarkdown: "Extra post",
          publishedAt: "2024-01-30T10:00:00Z",
          author: { id: "author-4", name: "Author 4", image: null },
          metadata: { category: "Extra", readTime: 2 },
        },
      ];

      server.use(
        http.get("/api/posts/:slug/related", () => {
          return HttpResponse.json(manyPosts);
        })
      );

      render(<RelatedPostsClient slug="test-slug" />);

      expect(await screen.findByText("First Related Post")).toBeInTheDocument();
      expect(
        await screen.findByText("Second Related Post")
      ).toBeInTheDocument();
      expect(await screen.findByText("Third Related Post")).toBeInTheDocument();
      expect(screen.queryByText("Fourth Post")).not.toBeInTheDocument();
    });

    it("truncates long excerpts with ellipsis", async () => {
      const longContentPost = [
        {
          id: "post-long",
          title: "Post With Long Content",
          slug: "post-long-content",
          bodyMarkdown: "A".repeat(200),
          publishedAt: "2024-01-15T10:00:00Z",
          author: { id: "author-1", name: "Test Author", image: null },
          metadata: { category: "Test", readTime: 5 },
        },
      ];

      server.use(
        http.get("/api/posts/:slug/related", () => {
          return HttpResponse.json(longContentPost);
        })
      );

      render(<RelatedPostsClient slug="test-slug" />);

      expect(await screen.findByText(/^A{100}$/)).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/posts/:slug/related", () => {
          return HttpResponse.json(mockRelatedPosts);
        })
      );
    });

    it("navigates to correct URL when post is clicked", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      const firstPostLink = await screen.findByRole("link", {
        name: /First Related Post/i,
      });
      expect(firstPostLink).toHaveAttribute("href", "/blog/first-related-post");
    });

    it("renders all posts as links", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      const links = await screen.findAllByRole("link");
      expect(links.length).toBe(3);
    });

    it("each post link has correct href based on slug", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      const links = await screen.findAllByRole("link");
      expect(links[0]).toHaveAttribute("href", "/blog/first-related-post");
      expect(links[1]).toHaveAttribute("href", "/blog/second-related-post");
      expect(links[2]).toHaveAttribute("href", "/blog/third-related-post");
    });
  });

  describe("API interaction", () => {
    it("fetches related posts with correct slug", async () => {
      server.use(
        http.get("/api/posts/:slug/related", ({ params }) => {
          expect(params.slug).toBe("my-test-slug");
          return HttpResponse.json(mockRelatedPosts);
        })
      );

      render(<RelatedPostsClient slug="my-test-slug" />);

      await waitFor(() => {
        expect(screen.getByText("First Related Post")).toBeInTheDocument();
      });
    });

    it("handles fetch error gracefully", async () => {
      server.use(
        http.get("/api/posts/:slug/related", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(<RelatedPostsClient slug="test-slug" />);

      await waitFor(() => {
        expect(screen.getByText("Related Stories")).toBeInTheDocument();
      });
      expect(
        screen.getByText("Related stories could not be loaded right now.")
      ).toBeInTheDocument();
    });

    it("handles non-ok response gracefully", async () => {
      server.use(
        http.get("/api/posts/:slug/related", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(<RelatedPostsClient slug="test-slug" />);

      await waitFor(() => {
        expect(screen.getByText("Related Stories")).toBeInTheDocument();
      });
      expect(
        screen.getByText("Related stories could not be loaded right now.")
      ).toBeInTheDocument();
    });

    it("only fetches once on mount", async () => {
      let fetchCount = 0;
      server.use(
        http.get("/api/posts/:slug/related", () => {
          fetchCount++;
          return HttpResponse.json(mockRelatedPosts);
        })
      );

      const { rerender } = render(<RelatedPostsClient slug="test-slug" />);
      rerender(<RelatedPostsClient slug="test-slug" />);

      await waitFor(() => {
        expect(fetchCount).toBe(1);
      });
    });

    it("fetches again when slug changes", async () => {
      let fetchCount = 0;
      server.use(
        http.get("/api/posts/:slug/related", ({ params }) => {
          fetchCount++;
          return HttpResponse.json(mockRelatedPosts);
        })
      );

      const { rerender } = render(<RelatedPostsClient slug="initial-slug" />);

      await waitFor(() => {
        expect(fetchCount).toBe(1);
      });

      rerender(<RelatedPostsClient slug="new-slug" />);

      await waitFor(() => {
        expect(fetchCount).toBe(2);
      });
    });
  });

  describe("Styling and structure", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/posts/:slug/related", () => {
          return HttpResponse.json(mockRelatedPosts);
        })
      );
    });

    it("renders section with correct heading", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      const heading = await screen.findByRole("heading", {
        name: "Related Stories",
      });
      expect(heading).toBeInTheDocument();
    });

    it("renders posts in a grid layout", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      const gridContainer = await screen.findByText("First Related Post");
      expect(gridContainer).toBeInTheDocument();
      expect(document.querySelector(".grid")).toBeInTheDocument();
    });

    it("renders Read text with chevron icon", async () => {
      render(<RelatedPostsClient slug="test-slug" />);

      const readElements = await screen.findAllByText("Read");
      expect(readElements.length).toBe(3);
    });
  });
});
