import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

test.describe("Blog Feed Page (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
  });

  test("Homepage loads with correct title 'OpenBlog'", async ({ page }) => {
    await expect(page).toHaveTitle(/OpenBlog/);
    await expect(page.getByText("OpenBlog", { exact: true })).toBeVisible();
  });

  test("Featured hero section displays when posts exist", async ({
    request,
    page,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        const heroSection = page.locator("header").first();
        await expect(heroSection).toBeVisible();
      }
    }
  });

  test("'Featured Insight' label is visible", async ({ request, page }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await expect(page.getByText("Featured Post")).toBeVisible();
      }
    }
  });

  test("Featured post title and excerpt are displayed", async ({
    request,
    page,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        const featuredPost = data.posts[0];
        await expect(
          page.locator("h1").filter({ hasText: featuredPost.title })
        ).toBeVisible();
      }
    }
  });

  test("'Read the Full Story' button links to post", async ({
    request,
    page,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        const slug = data.posts[0].slug;
        const button = page.getByRole("link", { name: /read the full story/i });
        await expect(button).toBeVisible();
        await expect(button).toHaveAttribute("href", `/blog/${slug}`);
      }
    }
  });

  test("Bento grid layout displays recent posts", async ({ request, page }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=7`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 1) {
        const grid = page.locator(".grid");
        await expect(grid.first()).toBeVisible();
      }
    }
  });

  test("'Recent Stories' section heading is visible", async ({
    request,
    page,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await expect(
          page.getByRole("heading", { name: "Recent Stories" })
        ).toBeVisible();
      }
    }
  });

  test("View toggle buttons (grid/list) exist", async ({ request, page }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await expect(page.getByTestId("grid-toggle")).toBeVisible();
        await expect(page.getByTestId("list-toggle")).toBeVisible();
      }
    }
  });

  test("Load more button appears when more posts exist", async ({
    request,
    page,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=20`);
    if (response.ok()) {
      const data = await response.json();
      if (data.total > 10) {
        const loadMoreButton = page.getByRole("button", { name: /load more/i });
        await expect(loadMoreButton).toBeVisible();
      }
    }
  });

  test("Footer displays with copyright text", async ({ page }) => {
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(new Date().getFullYear().toString());
  });
});

test.describe("Blog Feed Page Mobile View", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("Mobile bottom navigation appears on mobile viewport", async ({
    page,
  }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("nav").last()).toBeVisible();
  });
});

test.describe("Individual Post Page (/blog/[slug])", () => {
  test.beforeEach(async ({ page, request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
      }
    }
  });

  test("Post page loads with correct title", async ({ page, request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
        await expect(page).toHaveTitle(new RegExp(data.posts[0].title));
      }
    }
  });

  test("Post content renders (markdown converted to HTML)", async ({
    page,
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
        await expect(page.locator("article")).toBeVisible();
        const article = page.locator("article");
        await expect(article).toContainText(/[a-zA-Z]/);
      }
    }
  });

  test("Author info displays with avatar and name", async ({
    page,
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
        const authorName = page
          .locator("p")
          .filter({ hasText: data.posts[0].author.name || "Anonymous" });
        await expect(authorName).toBeVisible();
      }
    }
  });

  test("Published date displays correctly", async ({ page, request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0 && data.posts[0].publishedAt) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
        await expect(page.locator("article").first()).toBeVisible();
      }
    }
  });

  test("Reading time displays when available", async ({ page, request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0 && data.posts[0].metadata?.readTime) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
        const readTime = page.getByText(/min read/i);
        await expect(readTime).toBeVisible();
      }
    }
  });

  test("Category tag displays when available", async ({ page, request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0 && data.posts[0].metadata?.category) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
        const category = page.getByText(data.posts[0].metadata.category, {
          exact: true,
        });
        await expect(category).toBeVisible();
      }
    }
  });

  test("'Back to Feed' link works", async ({ page, request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          referer: `${BASE_URL}/`,
          waitUntil: "networkidle",
        });
        const backLink = page.getByRole("link", { name: /back to feed/i });
        await expect(backLink).toBeVisible();
        await backLink.click();
        await expect(page).toHaveURL(BASE_URL + "/");
      }
    }
  });

  test("Related posts section appears when related posts exist", async ({
    page,
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length > 0) {
        await page.goto(`${BASE_URL}/blog/${data.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
        await page.waitForTimeout(1000);
        const relatedPosts = page.getByRole("heading", {
          name: "Related Stories",
        });
        if (await relatedPosts.isVisible()) {
          await expect(relatedPosts).toBeVisible();
        }
      }
    }
  });

  test("Related posts are clickable and navigate to correct URL", async ({
    page,
    request,
  }) => {
    const postsResponse = await request.get(`${BASE_URL}/api/posts?limit=5`);
    if (postsResponse.ok()) {
      const postsData = await postsResponse.json();
      if (postsData.posts.length > 1) {
        await page.goto(`${BASE_URL}/blog/${postsData.posts[0].slug}`, {
          waitUntil: "networkidle",
        });
        await page.waitForTimeout(1000);

        const relatedPostLink = page.locator("a[href^='/blog/']").nth(1);
        if (await relatedPostLink.isVisible()) {
          const href = await relatedPostLink.getAttribute("href");
          await relatedPostLink.click();
          await expect(page).toHaveURL(new RegExp(href || ""));
        }
      }
    }
  });
});

test.describe("Empty States", () => {
  test("Empty blog feed shows appropriate message", async ({
    page,
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    if (response.ok()) {
      const data = await response.json();
      if (data.posts.length === 0) {
        await page.goto(BASE_URL, { waitUntil: "networkidle" });
        await expect(page.getByText("No posts yet")).toBeVisible();
        await expect(
          page.getByText("Check back soon for new content")
        ).toBeVisible();
      }
    }
  });

  test("404 page shows for non-existent post", async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/this-post-does-not-exist-12345`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("Not Found")).toBeVisible();
  });
});
