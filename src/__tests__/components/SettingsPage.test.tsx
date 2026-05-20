import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";
import { ToastProvider } from "../../components/ToastContext";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-1", role: "ADMIN" }),
  requireAdmin: vi.fn(),
  requireAuthOrAbove: vi.fn(),
  getSession: vi
    .fn()
    .mockResolvedValue({ user: { id: "user-1", role: "ADMIN" } }),
}));

vi.mock("@/lib/config", () => ({
  config: {
    get BLOG_NAME() {
      return "OpenBlog";
    },
    get BASE_URL() {
      return "http://localhost:3000";
    },
    get PORT() {
      return 3000;
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "user-1",
          name: "Admin",
          email: "admin@test.com",
          createdAt: new Date().toISOString(),
          profile: { role: "ADMIN" },
          _count: { posts: 5, apiKeys: 2 },
        },
      ]),
    },
    apiKey: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "key-1",
          name: "Test Key",
          key: "ob_abc123",
          createdAt: new Date().toISOString(),
          expiresAt: null,
        },
      ]),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../components/Navbar", () => ({
  default: () => (
    <nav className="fixed top-0 w-full z-50 bg-zinc-950/70 backdrop-blur-xl animate-fade-in-down">
      <a href="/">OpenBlog</a>
    </nav>
  ),
}));

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

import SettingsPage from "../../app/dashboard/settings/page";

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockClear();
  vi.clearAllMocks();
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe("SettingsPage", () => {
  describe("Renders core elements", () => {
    it("renders Settings heading", async () => {
      const ui = await SettingsPage({ searchParams: Promise.resolve({}) });
      render(<ToastProvider>{ui}</ToastProvider>);
      expect(
        screen.getByRole("heading", { name: "Settings" })
      ).toBeInTheDocument();
    });

    it("renders API Keys section", async () => {
      const ui = await SettingsPage({ searchParams: Promise.resolve({}) });
      render(<ToastProvider>{ui}</ToastProvider>);
      expect(screen.getByText("API Keys")).toBeInTheDocument();
    });
  });

  describe("SEO & Discovery", () => {
    it("renders SEO & Discovery section", async () => {
      const ui = await SettingsPage({ searchParams: Promise.resolve({}) });
      render(<ToastProvider>{ui}</ToastProvider>);
      expect(screen.getByText("SEO & Discovery")).toBeInTheDocument();
    });

    it("renders sitemap link to /sitemap.xml", async () => {
      const ui = await SettingsPage({ searchParams: Promise.resolve({}) });
      render(<ToastProvider>{ui}</ToastProvider>);
      const sitemapLink = screen.getByText("Sitemap");
      expect(sitemapLink).toBeInTheDocument();
      expect(sitemapLink.closest("a")).toHaveAttribute("href", "/sitemap.xml");
    });

    it("renders RSS feed link to /feed.xml", async () => {
      const ui = await SettingsPage({ searchParams: Promise.resolve({}) });
      render(<ToastProvider>{ui}</ToastProvider>);
      const rssLink = screen.getByText("RSS Feed");
      expect(rssLink).toBeInTheDocument();
      expect(rssLink.closest("a")).toHaveAttribute("href", "/feed.xml");
    });
  });
});
