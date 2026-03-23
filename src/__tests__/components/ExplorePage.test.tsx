import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExplorePage from "../../app/explore/page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../components/Navbar", () => ({
  default: ({ activeLink }: { activeLink?: string }) => (
    <nav>
      <a href="/">OpenBlog</a>
      <a href="/">Feed</a>
      <a
        href="/explore"
        className={
          activeLink === "explore" ? "text-violet-300" : "text-zinc-400"
        }
      >
        Explore
      </a>
      <a href="/dashboard">Dashboard</a>
    </nav>
  ),
}));

vi.mock("../../components/QueryToast", () => ({
  default: () => null,
}));

vi.mock("../../components/Footer", () => ({
  default: () => <footer>Footer</footer>,
}));

vi.mock("../../components/MobileBottomNav", () => ({
  default: () => <nav>MobileNav</nav>,
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({ user: null }),
}));

vi.mock("../../app/explore/ExploreClient", () => ({
  default: ({
    initialPosts,
    initialTotal,
  }: {
    initialPosts: any[];
    initialTotal: number;
  }) => (
    <div data-testid="explore-client">
      <input
        data-testid="search-input"
        placeholder="Search stories, topics, authors..."
      />
      {initialPosts.length === 0 ? (
        <div data-testid="empty-state">Nothing to explore yet</div>
      ) : (
        <>
          <h2 data-testid="stories-heading">All stories</h2>
          {initialPosts.map(post => (
            <a
              key={post.id}
              href={`/blog/${post.slug}`}
              data-testid="post-link"
            >
              {post.title}
            </a>
          ))}
          {initialTotal > 10 && (
            <div data-testid="pagination">Showing 1–10 of {initialTotal}</div>
          )}
        </>
      )}
    </div>
  ),
}));

const mockPost = {
  id: "1",
  title: "Test Post",
  slug: "test-post",
  bodyMarkdown: "Test content",
  bodyHtml: "<p>Test</p>",
  publishedAt: new Date().toISOString(),
  author: { id: "a1", name: "Author", image: null },
  metadata: { category: "Tech", readTime: 5 },
};

const mockFetch = (posts: any[], total = posts.length) =>
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          posts,
          total,
          limit: 10,
          offset: 0,
        }),
    })
  ) as any;

let consoleSpy: vi.SpyInstance;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe("ExplorePage", () => {
  describe("Header rendering", () => {
    it("renders 'Discover' label", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByText("Discover")).toBeInTheDocument();
    });

    it("renders 'Explore stories' heading", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByText("Explore stories")).toBeInTheDocument();
    });
  });

  describe("ExploreClient integration", () => {
    it("renders ExploreClient component", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByTestId("explore-client")).toBeInTheDocument();
    });

    it("renders search input in ExploreClient", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("renders posts when data is available", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByText("Test Post")).toBeInTheDocument();
    });

    it("renders 'All stories' heading", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByTestId("stories-heading")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows 'Nothing to explore' when no posts", async () => {
      global.fetch = mockFetch([], 0);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  describe("Layout components", () => {
    it("renders Navbar with explore active", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      const exploreLinks = screen.getAllByText("Explore");
      const activeLink = exploreLinks.find(link =>
        link.classList.contains("text-violet-300")
      );
      expect(activeLink).toBeInTheDocument();
    });

    it("renders MobileBottomNav", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByText("MobileNav")).toBeInTheDocument();
    });

    it("renders Footer", async () => {
      global.fetch = mockFetch([mockPost]);
      const jsx = await ExplorePage();
      render(jsx);
      expect(screen.getByText("Footer")).toBeInTheDocument();
    });
  });
});
