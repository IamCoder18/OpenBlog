import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "../mocks/browser";
import { handlers } from "../mocks/handlers";
import LoadMorePosts from "../../components/LoadMorePosts";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Metadata {
  readTime?: number;
  category?: string;
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

const mockPosts: Post[] = [
  {
    id: "post-0",
    title: "Hidden First Post",
    slug: "hidden-first-post",
    bodyMarkdown: "This post is hidden from the grid.",
    bodyHtml: "<p>Hidden post.</p>",
    publishedAt: "2024-01-10T10:00:00Z",
    author: {
      id: "author-0",
      name: "Hidden Author",
      image: null,
    },
    metadata: {
      category: "Hidden",
      readTime: 1,
    },
  },
  {
    id: "post-1",
    title: "Featured Post Title",
    slug: "featured-post",
    bodyMarkdown:
      "This is the content of the featured post. It has some interesting information about React and testing.",
    bodyHtml: "<p>This is the content of the featured post.</p>",
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
    title: "Side Card Post Two",
    slug: "side-card-post-two",
    bodyMarkdown:
      "Another great post about web development and Next.js best practices.",
    bodyHtml: "<p>Another great post.</p>",
    publishedAt: "2024-01-20T10:00:00Z",
    author: {
      id: "author-2",
      name: "Jane Smith",
      image: null,
    },
    metadata: {
      category: "Development",
      readTime: 8,
    },
  },
  {
    id: "post-3",
    title: "Side Card Post Three",
    slug: "side-card-post-three",
    bodyMarkdown: "A short post about TypeScript and JavaScript tips.",
    bodyHtml: "<p>A short post.</p>",
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
  {
    id: "post-4",
    title: "Grid Post Four",
    slug: "grid-post-four",
    bodyMarkdown: "Post number four with some great content.",
    bodyHtml: "<p>Post number four.</p>",
    publishedAt: "2024-01-26T10:00:00Z",
    author: {
      id: "author-1",
      name: "John Doe",
      image: "https://example.com/avatar.jpg",
    },
    metadata: {
      category: "Tech",
      readTime: 4,
    },
  },
  {
    id: "post-5",
    title: "Grid Post Five",
    slug: "grid-post-five",
    bodyMarkdown: "Fifth post content here.",
    bodyHtml: "<p>Fifth post.</p>",
    publishedAt: "2024-01-27T10:00:00Z",
    author: {
      id: "author-2",
      name: "Jane Smith",
      image: null,
    },
    metadata: {
      category: "Code",
      readTime: 6,
    },
  },
];

const morePosts: Post[] = [
  {
    id: "post-6",
    title: "Loaded Post Six",
    slug: "loaded-post-six",
    bodyMarkdown: "Sixth post content after load more.",
    bodyHtml: "<p>Sixth post.</p>",
    publishedAt: "2024-02-01T10:00:00Z",
    author: {
      id: "author-1",
      name: "John Doe",
      image: "https://example.com/avatar.jpg",
    },
    metadata: {
      category: "AI",
      readTime: 10,
    },
  },
  {
    id: "post-7",
    title: "Loaded Post Seven",
    slug: "loaded-post-seven",
    bodyMarkdown: "Seventh post content here.",
    bodyHtml: "<p>Seventh post.</p>",
    publishedAt: "2024-02-02T10:00:00Z",
    author: {
      id: "author-2",
      name: "Jane Smith",
      image: null,
    },
    metadata: {
      category: "Cloud",
      readTime: 5,
    },
  },
  {
    id: "post-8",
    title: "Loaded Post Eight",
    slug: "loaded-post-eight",
    bodyMarkdown: "Eighth post content here.",
    bodyHtml: "<p>Eighth post.</p>",
    publishedAt: "2024-02-03T10:00:00Z",
    author: {
      id: "author-3",
      name: "Alex Johnson",
      image: null,
    },
    metadata: {
      category: "DevOps",
      readTime: 9,
    },
  },
  {
    id: "post-9",
    title: "Loaded Post Nine",
    slug: "loaded-post-nine",
    bodyMarkdown: "Ninth post content here.",
    bodyHtml: "<p>Ninth post.</p>",
    publishedAt: "2024-02-04T10:00:00Z",
    author: {
      id: "author-1",
      name: "John Doe",
      image: "https://example.com/avatar.jpg",
    },
    metadata: {
      category: "Security",
      readTime: 12,
    },
  },
  {
    id: "post-10",
    title: "Loaded Post Ten",
    slug: "loaded-post-ten",
    bodyMarkdown: "Tenth post content here.",
    bodyHtml: "<p>Tenth post.</p>",
    publishedAt: "2024-02-05T10:00:00Z",
    author: {
      id: "author-2",
      name: "Jane Smith",
      image: null,
    },
    metadata: {
      category: "Database",
      readTime: 8,
    },
  },
  {
    id: "post-11",
    title: "Loaded Post Eleven",
    slug: "loaded-post-eleven",
    bodyMarkdown: "Eleventh post content here.",
    bodyHtml: "<p>Eleventh post.</p>",
    publishedAt: "2024-02-06T10:00:00Z",
    author: {
      id: "author-3",
      name: null,
      image: null,
    },
    metadata: {
      category: "API",
      readTime: 6,
    },
  },
];

const evenMorePosts: Post[] = [
  {
    id: "post-12",
    title: "Loaded Post Twelve",
    slug: "loaded-post-twelve",
    bodyMarkdown: "Twelfth post content here.",
    bodyHtml: "<p>Twelfth post.</p>",
    publishedAt: "2024-02-07T10:00:00Z",
    author: {
      id: "author-1",
      name: "John Doe",
      image: "https://example.com/avatar.jpg",
    },
    metadata: {
      category: "ML",
      readTime: 11,
    },
  },
  {
    id: "post-13",
    title: "Loaded Post Thirteen",
    slug: "loaded-post-thirteen",
    bodyMarkdown: "Thirteenth post content here.",
    bodyHtml: "<p>Thirteenth post.</p>",
    publishedAt: "2024-02-08T10:00:00Z",
    author: {
      id: "author-2",
      name: "Jane Smith",
      image: null,
    },
    metadata: {
      category: "Web",
      readTime: 7,
    },
  },
  {
    id: "post-14",
    title: "Loaded Post Fourteen",
    slug: "loaded-post-fourteen",
    bodyMarkdown: "Fourteenth post content here.",
    bodyHtml: "<p>Fourteenth post.</p>",
    publishedAt: "2024-02-09T10:00:00Z",
    author: {
      id: "author-3",
      name: "Alex Johnson",
      image: null,
    },
    metadata: {
      category: "Mobile",
      readTime: 4,
    },
  },
  {
    id: "post-15",
    title: "Loaded Post Fifteen",
    slug: "loaded-post-fifteen",
    bodyMarkdown: "Fifteenth post content here.",
    bodyHtml: "<p>Fifteenth post.</p>",
    publishedAt: "2024-02-10T10:00:00Z",
    author: {
      id: "author-1",
      name: "John Doe",
      image: "https://example.com/avatar.jpg",
    },
    metadata: {
      category: "Cloud",
      readTime: 6,
    },
  },
  {
    id: "post-16",
    title: "Loaded Post Sixteen",
    slug: "loaded-post-sixteen",
    bodyMarkdown: "Sixteenth post content here.",
    bodyHtml: "<p>Sixteenth post.</p>",
    publishedAt: "2024-02-11T10:00:00Z",
    author: {
      id: "author-2",
      name: "Jane Smith",
      image: null,
    },
    metadata: {
      category: "Data",
      readTime: 9,
    },
  },
  {
    id: "post-17",
    title: "Loaded Post Seventeen",
    slug: "loaded-post-seventeen",
    bodyMarkdown: "Seventeenth post content here.",
    bodyHtml: "<p>Seventeenth post.</p>",
    publishedAt: "2024-02-12T10:00:00Z",
    author: {
      id: "author-3",
      name: null,
      image: null,
    },
    metadata: {
      category: "Backend",
      readTime: 5,
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

describe("LoadMorePosts", () => {
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
  });

  describe("Empty state", () => {
    it("renders empty state when no posts", () => {
      render(<LoadMorePosts initialPosts={[]} />);

      expect(screen.getByText("No posts yet")).toBeInTheDocument();
      expect(
        screen.getByText("Check back soon for new content")
      ).toBeInTheDocument();
    });

    it("renders article icon in empty state", () => {
      render(<LoadMorePosts initialPosts={[]} />);

      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("does not render 'Recent Stories' heading when no posts", () => {
      render(<LoadMorePosts initialPosts={[]} />);

      expect(screen.queryByText("Recent Stories")).not.toBeInTheDocument();
    });
  });

  describe("Rendering initial posts in bento grid layout", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );
    });

    it("renders 'Recent Stories' heading when posts exist", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      expect(screen.getByText("Recent Stories")).toBeInTheDocument();
    });

    it("renders posts in a grid layout", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      const gridContainer = document.querySelector(".grid");
      expect(gridContainer).toBeInTheDocument();
    });

    it("renders the second post (index 1) as main featured post since first is sliced off", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      expect(screen.getByText("Featured Post Title")).toBeInTheDocument();
    });

    it("renders category badge for featured post", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      expect(screen.getByText("Technology")).toBeInTheDocument();
    });

    it("renders author name for featured post", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders 'Anonymous' when author name is null in side card", () => {
      const postsWithNullAuthor: Post[] = [
        {
          id: "post-0",
          title: "Hidden Post",
          slug: "hidden-post",
          bodyMarkdown: "Hidden content",
          bodyHtml: "<p>Hidden</p>",
          publishedAt: null,
          author: { id: "author-1", name: "Visible Author", image: null },
          metadata: null,
        },
        {
          id: "post-1",
          title: "Featured Post",
          slug: "featured-post",
          bodyMarkdown: "Featured content",
          bodyHtml: "<p>Featured</p>",
          publishedAt: null,
          author: { id: "author-2", name: null, image: null },
          metadata: { category: "Test", readTime: 5 },
        },
      ];
      render(<LoadMorePosts initialPosts={postsWithNullAuthor} />);

      expect(screen.getByText("Anonymous")).toBeInTheDocument();
    });

    it("renders read time for posts", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      expect(screen.getByText("5 Min Read")).toBeInTheDocument();
    });

    it("renders grid view and list view buttons", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      const buttons = document.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Bento grid layout distribution", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );
    });

    it("renders first post with col-span-8", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      const mainArticle = document.querySelector("article.md\\:col-span-8");
      expect(mainArticle).toBeInTheDocument();
    });

    it("renders side cards with col-span-4", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      const sideLinks = document.querySelectorAll("a.md\\:col-span-4");
      expect(sideLinks.length).toBeGreaterThanOrEqual(2);
    });

    it("renders remaining posts in smaller grid", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      const smallerGrid = document.querySelector(".sm\\:grid-cols-2");
      expect(smallerGrid).toBeInTheDocument();
    });

    it("renders side card titles for second and third posts", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      expect(screen.getByText("Side Card Post Two")).toBeInTheDocument();
      expect(screen.getByText("Side Card Post Three")).toBeInTheDocument();
    });
  });

  describe("Load more functionality", () => {
    it("clicking 'Load more' fetches more posts", async () => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Loaded Post Six")).toBeInTheDocument();
      });
    });

    it("clicking 'Load more' appends new posts to existing ones", async () => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Loaded Post Six")).toBeInTheDocument();
      });
    });

    it("updates offset after loading more posts", async () => {
      server.use(
        http.get("/api/posts", ({ request }) => {
          const url = new URL(request.url);
          const offset = url.searchParams.get("offset");
          if (offset === "10") {
            return HttpResponse.json({
              posts: morePosts,
              total: 18,
              limit: 6,
              offset: 10,
            });
          }
          return HttpResponse.json({
            posts: evenMorePosts,
            total: 18,
            limit: 6,
            offset: 16,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Loaded Post Six")).toBeInTheDocument();
      });

      const secondLoadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(secondLoadMoreButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Loaded Post Twelve")).toBeInTheDocument();
      });
    });
  });

  describe("Loading state", () => {
    it("shows spinner while fetching", async () => {
      let resolveFetch: () => void;
      const fetchPromise = new Promise<void>(resolve => {
        resolveFetch = resolve;
      });

      server.use(
        http.get("/api/posts", async () => {
          await fetchPromise;
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
      expect(spinner?.textContent).toBe("sync");

      resolveFetch!();
    });

    it("'Load more' button is disabled during loading", async () => {
      let resolveFetch: () => void;
      const fetchPromise = new Promise<void>(resolve => {
        resolveFetch = resolve;
      });

      server.use(
        http.get("/api/posts", async () => {
          await fetchPromise;
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen
        .getByText("Load more stories")
        .closest("button");

      await act(async () => {
        fireEvent.click(loadMoreButton!);
      });

      expect(loadMoreButton).toBeDisabled();

      resolveFetch!();
    });

    it("does not fetch again while already loading", async () => {
      let resolveFetch: () => void;
      const fetchPromise = new Promise<void>(resolve => {
        resolveFetch = resolve;
      });

      let fetchCount = 0;
      server.use(
        http.get("/api/posts", async () => {
          fetchCount++;
          await fetchPromise;
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen
        .getByText("Load more stories")
        .closest("button");

      await act(async () => {
        fireEvent.click(loadMoreButton!);
      });

      await act(async () => {
        fireEvent.click(loadMoreButton!);
      });

      expect(fetchCount).toBe(1);

      resolveFetch!();
    });

    it("hides 'Load more' button text while loading", async () => {
      let resolveFetch: () => void;
      const fetchPromise = new Promise<void>(resolve => {
        resolveFetch = resolve;
      });

      server.use(
        http.get("/api/posts", async () => {
          await fetchPromise;
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      expect(screen.queryByText("Load more stories")).not.toBeInTheDocument();

      resolveFetch!();
    });
  });

  describe("hasMore functionality", () => {
    it("'Load more' button is hidden when hasMore is false", async () => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: [],
            total: 10,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(screen.queryByText("Load more stories")).not.toBeInTheDocument();
      });
    });

    it("hides load more when all posts are loaded and total equals offset + posts.length", async () => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: morePosts.slice(0, 4),
            total: 10,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(screen.queryByText("Load more stories")).not.toBeInTheDocument();
      });
    });

    it("shows load more when there are more posts to load", async () => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: morePosts,
            total: 20,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Load more stories")).toBeInTheDocument();
      });
    });
  });

  describe("Post links", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );
    });

    it("renders links to individual posts", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
    });

    it("post links have correct href based on slug", () => {
      render(<LoadMorePosts initialPosts={mockPosts} />);

      const readLink = screen.getAllByText("Read")[0];
      expect(readLink.closest("a")).toHaveAttribute(
        "href",
        "/blog/side-card-post-two"
      );
    });
  });

  describe("Error handling", () => {
    it("handles fetch error gracefully without crashing", async () => {
      server.use(
        http.get("/api/posts", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      expect(
        screen.getByText("Could not load more stories. Please try again.")
      ).toBeInTheDocument();
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    it("handles non-ok response gracefully", async () => {
      server.use(
        http.get("/api/posts", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      expect(
        screen.getByText("Could not load more stories. Please try again.")
      ).toBeInTheDocument();
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });
  });

  describe("Initial offset", () => {
    it("starts with offset of 10", async () => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({
            posts: morePosts,
            total: 18,
            limit: 6,
            offset: 10,
          });
        })
      );

      render(<LoadMorePosts initialPosts={mockPosts} />);

      const loadMoreButton = screen.getByText("Load more stories");

      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Loaded Post Six")).toBeInTheDocument();
      });
    });
  });
});
