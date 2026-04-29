import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ToastProvider } from "../../components/ToastContext";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/config", () => ({
  config: {
    get BLOG_NAME() {
      return "OpenBlog";
    },
  },
}));

vi.mock("@/lib/session", () => ({
  requireAdmin: vi.fn(),
  requireAuthOrAbove: vi.fn(),
  requireAuth: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ user: { id: "1", role: "ADMIN" } }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    post: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    pageView: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../../components/Navbar", () => ({
  default: ({ activeLink }: { activeLink?: string }) => (
    <nav className="fixed top-0 w-full z-50 bg-zinc-950/70 backdrop-blur-xl animate-fade-in-down">
      <a href="/">OpenBlog</a>
      <a href="/">Feed</a>
      <a href="/explore">Explore</a>
      <a
        href="/dashboard"
        className={
          activeLink === "dashboard"
            ? "text-violet-300 border-b-2 border-violet-500"
            : "text-zinc-400"
        }
      >
        Dashboard
      </a>
      <button>Logout</button>
    </nav>
  ),
}));

import { requireAdmin, requireAuthOrAbove, requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db";
import DashboardPage from "../../app/dashboard/page";
import StoriesPage from "../../app/dashboard/stories/page";

const mockPosts = [
  {
    id: "post-1",
    title: "First Test Post",
    slug: "first-test-post",
    publishedAt: new Date().toISOString(),
    author: { name: "Alice Author" },
    metadata: { tags: ["react"] },
  },
  {
    id: "post-2",
    title: "Second Test Post",
    slug: "second-test-post",
    publishedAt: new Date().toISOString(),
    author: { name: "Bob Writer" },
    metadata: { tags: ["nextjs"] },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: "user-1",
    role: "ADMIN",
  });
  (requireAuthOrAbove as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: "user-1",
    role: "ADMIN",
  });
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: "user-1",
    role: "USER",
  });
  (prisma.post.count as ReturnType<typeof vi.fn>).mockResolvedValue(10);
  (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockPosts
  );
  (prisma.pageView.count as ReturnType<typeof vi.fn>).mockResolvedValue(42);
  (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
    { date: "2026-03-20", views: 10 },
    { date: "2026-03-21", views: 15 },
  ]);
});

describe("Dashboard Page", () => {
  it("renders welcome heading", async () => {
    const ui = await DashboardPage({ searchParams: Promise.resolve({}) });
    render(<ToastProvider>{ui}</ToastProvider>);
    expect(
      screen.getByRole("heading", { name: /Welcome back/i })
    ).toBeInTheDocument();
  });

  it("renders KPI cards", async () => {
    const ui = await DashboardPage({ searchParams: Promise.resolve({}) });
    render(<ToastProvider>{ui}</ToastProvider>);
    expect(screen.getByText("Stories")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Drafts")).toBeInTheDocument();
  });

  it("renders 'Recent stories' section", async () => {
    const ui = await DashboardPage({ searchParams: Promise.resolve({}) });
    render(<ToastProvider>{ui}</ToastProvider>);
    expect(screen.getByText("Recent stories")).toBeInTheDocument();
    expect(screen.getByText("First Test Post")).toBeInTheDocument();
  });

  it("renders 'View all' link to /dashboard/stories", async () => {
    const ui = await DashboardPage({ searchParams: Promise.resolve({}) });
    render(<ToastProvider>{ui}</ToastProvider>);
    const link = screen.getByText("View all").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/stories");
  });
});

describe("Stories Page", () => {
  it("renders stories page header", async () => {
    const ui = await StoriesPage({ searchParams: Promise.resolve({}) });
    render(<ToastProvider>{ui}</ToastProvider>);
    expect(screen.getByText("Your Stories")).toBeInTheDocument();
  });
});
