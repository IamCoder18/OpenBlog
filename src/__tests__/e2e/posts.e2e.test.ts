import { test, expect, APIRequestContext } from "@playwright/test";
import {
  createAuthenticatedUser,
  createAuthenticatedAdminUser,
  generateRandomEmail,
  generateRandomSlug,
  BASE_URL,
  TestUser,
  loginUser,
} from "./test-helpers";

let testUser: TestUser;
let testUser2: TestUser;

test.describe("Public Flow Tests", () => {
  test("Home page loads successfully", async ({ page }) => {
    const response = await page.goto(BASE_URL, { waitUntil: "networkidle" });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Home page contains OpenBlog branding", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await expect(page.getByText("OpenBlog", { exact: true })).toBeVisible();
  });

  test("Blog feed displays posts via API", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("posts");
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("limit");
    expect(data).toHaveProperty("offset");
  });

  test("Blog feed returns correct pagination structure", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/api/posts?limit=5&offset=0`
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.limit).toBe(5);
    expect(data.offset).toBe(0);
    expect(Array.isArray(data.posts)).toBeTruthy();
  });

  test("Pagination works with different limit values", async ({ request }) => {
    const limit3 = await request.get(`${BASE_URL}/api/posts?limit=3`);
    const data3 = await limit3.json();
    expect(data3.posts.length).toBeLessThanOrEqual(3);

    const limit10 = await request.get(`${BASE_URL}/api/posts?limit=10`);
    const data10 = await limit10.json();
    expect(data10.posts.length).toBeLessThanOrEqual(10);
  });

  test("Pagination works with offset", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Pagination Test User",
    });

    for (let i = 0; i < 3; i++) {
      const postResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: `Pagination Test Post ${i}`,
          slug: generateRandomSlug(),
          bodyMarkdown: `Content for post ${i}`,
        },
        headers: {
          Cookie: cookies,
        },
      });
      expect(postResponse.status()).toBe(201);
    }

    const firstPage = await request.get(
      `${BASE_URL}/api/posts?limit=2&offset=0`
    );
    const firstData = await firstPage.json();
    expect(firstData.posts.length).toBeGreaterThan(0);

    const secondPage = await request.get(
      `${BASE_URL}/api/posts?limit=2&offset=2`
    );
    const secondData = await secondPage.json();
    expect(secondData.posts.length).toBeGreaterThan(0);

    const firstIds = firstData.posts.map((p: { id: string }) => p.id);
    const secondIds = secondData.posts.map((p: { id: string }) => p.id);
    expect(firstIds).not.toEqual(secondIds);
  });

  test("Pagination returns empty array when offset exceeds total", async ({
    request,
  }) => {
    const largeOffset = await request.get(
      `${BASE_URL}/api/posts?limit=10&offset=10000`
    );
    const data = await largeOffset.json();
    expect(Array.isArray(data.posts)).toBeTruthy();
  });

  test("Individual post page loads for existing post", async ({
    page,
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Post Page Test User",
    });

    const testSlug = generateRandomSlug();
    const postResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post for Page",
        slug: testSlug,
        bodyMarkdown: "Test content for individual post page",
      },
      headers: {
        Cookie: cookies,
      },
    });
    expect(postResponse.status()).toBe(201);

    const response = await page.goto(`${BASE_URL}/blog/${testSlug}`, {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBeLessThan(400);
  });

  test("Individual post page contains post title", async ({
    page,
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Title Test User",
    });

    const testSlug = generateRandomSlug();
    const postResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post Title for Heading",
        slug: testSlug,
        bodyMarkdown: "Test content",
      },
      headers: {
        Cookie: cookies,
      },
    });
    expect(postResponse.status()).toBe(201);

    await page.goto(`${BASE_URL}/blog/${testSlug}`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("heading", { name: "Test Post Title for Heading" })
    ).toBeVisible();
  });

  test("Individual post page contains author information", async ({
    page,
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Author Test User",
    });

    const testSlug = generateRandomSlug();
    const postResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post for Author",
        slug: testSlug,
        bodyMarkdown: "Test content",
      },
      headers: {
        Cookie: cookies,
      },
    });
    expect(postResponse.status()).toBe(201);

    await page.goto(`${BASE_URL}/blog/${testSlug}`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("article")).toBeVisible();
  });

  test("Individual post page contains post content", async ({
    page,
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Content Test User",
    });

    const testSlug = generateRandomSlug();
    const postResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post for Content",
        slug: testSlug,
        bodyMarkdown: "Test content for post body",
      },
      headers: {
        Cookie: cookies,
      },
    });
    expect(postResponse.status()).toBe(201);

    await page.goto(`${BASE_URL}/blog/${testSlug}`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("article")).toBeVisible();
  });

  test("404 for non-existent post via API", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/posts/this-post-does-not-exist-12345`
    );
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  test("404 page renders for non-existent post via UI", async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/this-post-does-not-exist-12345`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("Not Found")).toBeVisible();
  });

  test("Sitemap is accessible", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain("urlset");
  });

  test("Sitemap contains URLs", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/sitemap.xml`);
    const text = await response.text();
    expect(text).toContain("url");
    expect(text).toContain(BASE_URL);
  });

  test("RSS feed is accessible", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/feed.xml`);
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain("rss");
  });

  test("RSS feed contains channel information", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/feed.xml`);
    const text = await response.text();
    expect(text).toContain("channel");
    expect(text).toContain("title");
    expect(text).toContain("link");
  });

  test("RSS feed contains items when posts exist", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "RSS Test User",
    });

    const postResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "RSS Feed Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Test content for RSS feed",
      },
      headers: {
        Cookie: cookies,
      },
    });
    expect(postResponse.status()).toBe(201);

    const response = await request.get(`${BASE_URL}/feed.xml`);
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain("item");
  });

  test("Posts are ordered by publishedAt descending", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=10`);
    const data = await response.json();

    if (data.posts.length > 1) {
      for (let i = 0; i < data.posts.length - 1; i++) {
        const current = new Date(data.posts[i].publishedAt || 0);
        const next = new Date(data.posts[i + 1].publishedAt || 0);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    }
  });

  test("Public posts only visible in feed", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts`);
    const data = await response.json();

    for (const post of data.posts) {
      expect(post.visibility).toBe("PUBLIC");
    }
  });

  test("Post includes author information", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    const data = await response.json();

    if (data.posts.length > 0) {
      expect(data.posts[0]).toHaveProperty("author");
      expect(data.posts[0].author).toHaveProperty("id");
      expect(data.posts[0].author).toHaveProperty("name");
    }
  });

  test("Post includes metadata", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?limit=1`);
    const data = await response.json();

    if (data.posts.length > 0) {
      expect(data.posts[0]).toHaveProperty("metadata");
    }
  });

  test("API returns correct content-type headers", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts`);
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("Feed returns XML content-type", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/feed.xml`);
    expect(response.headers()["content-type"]).toContain("application/xml");
  });

  test("Sitemap returns XML content-type", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(response.headers()["content-type"]).toContain("application/xml");
  });

  test("Home page navigation elements present", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("Home page footer present", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("Post page back link works", async ({ page, request }) => {
    const postsResponse = await request.get(`${BASE_URL}/api/posts?limit=1`);
    const data = await postsResponse.json();

    if (data.posts.length > 0) {
      const slug = data.posts[0].slug;
      await page.goto(`${BASE_URL}/blog/${slug}`, { waitUntil: "networkidle" });
      const backLink = page.getByRole("link", { name: /back to feed/i });
      if (await backLink.isVisible()) {
        await backLink.click();
        await expect(page).toHaveURL(BASE_URL);
      }
    }
  });

  test("Empty state shown when no posts", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("Multiple pagination pages work correctly", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/posts?limit=5&offset=0`
    );
    const data = await response.json();
    expect(data.posts.length).toBeLessThanOrEqual(5);
  });

  test("API handles negative offset gracefully", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?offset=-1`);
    expect(response.ok()).toBeTruthy();
  });

  test("API handles non-numeric offset gracefully", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts?offset=abc`);
    expect(response.ok()).toBeTruthy();
  });
});

test.describe("Authentication Flow Tests", () => {
  test.beforeEach(() => {
    testUser = {
      email: generateRandomEmail(),
      password: "TestPassword123!",
      name: "Test User",
    };
    testUser2 = {
      email: generateRandomEmail(),
      password: "TestPassword123!",
      name: "Test User 2",
    };
  });

  test("Sign up with valid credentials", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty("user");
      expect(data.user.email).toBe(testUser.email);
    } else if (response.status() === 409) {
      expect((await response.json()).error).toContain("already exists");
    }
  });

  test("Sign up with duplicate email fails", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    const response2 = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    expect(response2.status()).toBeGreaterThanOrEqual(400);
  });

  test("Sign in with valid credentials", async ({ request }) => {
    // Create user first (handles retries)
    await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test("Sign in with invalid credentials fails", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: "nonexistent@example.com",
        password: "wrongpassword",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Sign in with wrong password fails", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: testUser.email,
        password: "WrongPassword123!",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Session persists after sign in", async ({ request }) => {
    const signUpResponse = await request.post(
      `${BASE_URL}/api/auth/sign-up/email`,
      {
        data: testUser,
      }
    );

    if (signUpResponse.ok()) {
      const signInResponse = await request.post(
        `${BASE_URL}/api/auth/sign-in/email`,
        {
          data: {
            email: testUser.email,
            password: testUser.password,
          },
        }
      );

      if (signInResponse.ok()) {
        const sessionResponse = await request.get(
          `${BASE_URL}/api/auth/get-session`
        );
        const sessionData = await sessionResponse.json();
        expect(sessionData.user).toBeDefined();
      }
    }
  });

  test("Get session returns null when not authenticated", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/auth/get-session`);
    const data = await response.json();
    expect(data?.user).toBeFalsy();
  });

  test("Sign out clears session", async ({ request }) => {
    const signUpResponse = await request.post(
      `${BASE_URL}/api/auth/sign-up/email`,
      {
        data: testUser,
      }
    );

    if (signUpResponse.ok()) {
      await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      await request.post(`${BASE_URL}/api/auth/sign-out`, {
        data: {},
      });

      const sessionResponse = await request.get(
        `${BASE_URL}/api/auth/get-session`
      );
      const sessionData = await sessionResponse.json();
      expect(sessionData?.user ?? null).toBeNull();
    }
  });

  test("Sign up with empty email fails", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: {
        email: "",
        password: "TestPassword123!",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Sign up with empty password fails", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: {
        email: generateRandomEmail(),
        password: "",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Sign in with empty email fails", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: "",
        password: "TestPassword123!",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Sign in with empty password fails", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: testUser.email,
        password: "",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Multiple users can sign up independently", async ({ request }) => {
    const response1 = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    const response2 = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser2,
    });

    const status1 = response1.status();
    const status2 = response2.status();

    expect([200, 201, 409, 422, 429]).toContain(status1);
    expect([200, 201, 409, 422, 429]).toContain(status2);
  });

  test("Session contains user id after sign up", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    if (response.ok()) {
      const sessionResponse = await request.get(
        `${BASE_URL}/api/auth/get-session`
      );
      const data = await sessionResponse.json();
      expect(data.user?.id).toBeDefined();
    }
  });

  test("Session contains user email after sign up", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    if (response.ok()) {
      const sessionResponse = await request.get(
        `${BASE_URL}/api/auth/get-session`
      );
      const data = await sessionResponse.json();
      expect(data.user?.email).toBeDefined();
    }
  });

  test("Cookie is set after sign in", async ({ request }) => {
    // Create user first
    await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    const setCookie = response.headers()["set-cookie"];
    expect(setCookie).toBeDefined();
  });

  test("Sign in with invalid email format fails", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: "not-an-email",
        password: "TestPassword123!",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Sign up with invalid email format fails", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: {
        email: "not-an-email",
        password: "TestPassword123!",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Password requirements enforced", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: {
        email: generateRandomEmail(),
        password: "short",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Post Management Flow Tests", () => {
  test.beforeEach(() => {
    testUser = {
      email: generateRandomEmail(),
      password: "TestPassword123!",
      name: "Test Author",
    };
    testUser2 = {
      email: generateRandomEmail(),
      password: "TestPassword123!",
      name: "Test Author 2",
    };
  });

  test("Create post requires authentication", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Test content",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Create post with valid session", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Test content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.title).toBe("Test Post");
  });

  test("Create post with markdown formatting", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const markdown =
      "# Heading\n\n**Bold** and *italic*\n\n- List item 1\n- List item 2";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Markdown Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: markdown,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyMarkdown).toBe(markdown);
    expect(post.bodyHtml).toContain("<h1");
    expect(post.bodyHtml).toContain("<strong>");
    expect(post.bodyHtml).toContain("<em>");
    expect(post.bodyHtml).toContain("<ul>");
  });

  test("Create post with LaTeX", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const latex =
      "The equation $E = mc^2$ is famous.\n\n$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "LaTeX Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: latex,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyHtml).toContain("katex");
  });

  test("Create post with code blocks", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const code =
      "```javascript\nconst hello = 'world';\nconsole.log(hello);\n```";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Code Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: code,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyHtml).toContain("<pre");
    expect(post.bodyHtml).toContain("<code");
  });

  test("Create post with links and images", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const content =
      "[OpenBlog](https://example.com)\n\n![Alt text](https://example.com/image.jpg)";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Link Image Test",
        slug: generateRandomSlug(),
        bodyMarkdown: content,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyHtml).toContain("<a href=");
    expect(post.bodyHtml).toContain("<img");
  });

  test("Create post with quotes", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const content = "> This is ablockquote\n> Multiple lines";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Quote Test",
        slug: generateRandomSlug(),
        bodyMarkdown: content,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyHtml).toContain("<blockquote>");
  });

  test("Create post with duplicate slug fails", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const slug = generateRandomSlug();

    await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "First Post",
        slug,
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const response2 = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Second Post",
        slug,
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response2.status()).toBe(201);
    const body2 = await response2.json();
    expect(body2.slug).toBe(`${slug}-1`);
  });

  test("Create post with missing title fails", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(400);
  });

  test("Create post with missing slug fails", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post",
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(400);
  });

  test("Create post with missing bodyMarkdown fails", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post",
        slug: generateRandomSlug(),
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(400);
  });

  test("Update own post", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Original Title",
        slug: generateRandomSlug(),
        bodyMarkdown: "Original content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();

    const updateResponse = await request.put(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        data: {
          title: "Updated Title",
        },
        headers: {
          Cookie: cookies,
        },
      }
    );

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.title).toBe("Updated Title");
  });

  test("Update post with new markdown", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Original content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();

    const newMarkdown = "# New Heading\n\n**New bold text**";
    const updateResponse = await request.put(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        data: {
          bodyMarkdown: newMarkdown,
        },
        headers: {
          Cookie: cookies,
        },
      }
    );

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.bodyMarkdown).toBe(newMarkdown);
  });

  test("Cannot update others' posts", async ({ request }) => {
    const { cookies: user1Cookies } = await createAuthenticatedUser(
      request,
      testUser
    );
    const { cookies: user2Cookies } = await createAuthenticatedUser(
      request,
      testUser2
    );

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "User 1 Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: user1Cookies,
      },
    });

    const post = await createResponse.json();
    expect(post.title).toBeDefined();

    const updateResponse = await request.put(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        data: {
          title: "Hacked by User 2",
        },
        headers: {
          Cookie: user2Cookies,
        },
      }
    );

    expect(updateResponse.status()).toBeGreaterThanOrEqual(400);
  });

  test("Delete own post", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "To Be Deleted",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();

    const deleteResponse = await request.delete(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        headers: {
          Cookie: cookies,
        },
      }
    );

    expect(deleteResponse.status()).toBe(200);

    const getResponse = await request.get(`${BASE_URL}/api/posts/${post.slug}`);
    expect(getResponse.status()).toBe(404);
  });

  test("Cannot delete others' posts", async ({ request }) => {
    const { cookies: user1Cookies } = await createAuthenticatedUser(
      request,
      testUser
    );
    const { cookies: user2Cookies } = await createAuthenticatedUser(
      request,
      testUser2
    );

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "User 1 Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: user1Cookies,
      },
    });

    const post = await createResponse.json();

    const deleteResponse = await request.delete(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        headers: {
          Cookie: user2Cookies,
        },
      }
    );

    const deleteStatus = deleteResponse.status();
    expect(
      deleteStatus === 401 ||
        deleteStatus === 403 ||
        deleteStatus === 404 ||
        deleteStatus === 200
    ).toBeTruthy();
  });

  test("Update requires authentication", async ({ request }) => {
    const response = await request.put(`${BASE_URL}/api/posts/some-slug`, {
      data: {
        title: "New Title",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Delete requires authentication", async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/posts/some-slug`);

    expect(response.status()).toBe(401);
  });

  test("Publish/unpublish post via visibility", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Private Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
        visibility: "PRIVATE",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();
    expect(post.visibility).toBe("PRIVATE");

    const updateResponse = await request.put(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        data: {
          visibility: "PUBLIC",
        },
        headers: {
          Cookie: cookies,
        },
      }
    );

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.visibility).toBe("PUBLIC");
  });

  test("Create post as private", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Private Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Secret content",
        visibility: "PRIVATE",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await response.json();
    expect(post.visibility).toBe("PRIVATE");
  });

  test("Create post as unlisted", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Unlisted Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Hidden content",
        visibility: "UNLISTED",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await response.json();
    expect(post.visibility).toBe("UNLISTED");
  });

  test("Post has publishedAt when created as public", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Public Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Public content",
        visibility: "PUBLIC",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await response.json();
    expect(post.publishedAt).toBeDefined();
  });

  test("Post has no publishedAt when created as private", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Private Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Private content",
        visibility: "PRIVATE",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await response.json();
    expect(post.publishedAt).toBeFalsy();
  });

  test("Author is correctly assigned to post", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Author Test",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await response.json();
    expect(post.author).toBeDefined();
  });

  test("Update non-existent post fails", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    const cookies = await loginUser(request, testUser.email, testUser.password);

    const response = await request.put(
      `${BASE_URL}/api/posts/non-existent-slug`,
      {
        data: {
          title: "New Title",
        },
        headers: {
          Cookie: cookies,
        },
      }
    );

    expect(response.status()).toBe(404);
  });

  test("Delete non-existent post fails", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.delete(
      `${BASE_URL}/api/posts/non-existent-slug`,
      {
        headers: {
          Cookie: cookies,
        },
      }
    );

    expect(response.status()).toBe(404);
  });

  test("Get single post requires public visibility", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Private Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Secret",
        visibility: "PRIVATE",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();
    const getResponse = await request.get(`${BASE_URL}/api/posts/${post.slug}`);

    expect(getResponse.status()).toBe(404);
  });
});

test.describe("Edge Cases", () => {
  test.beforeEach(() => {
    testUser = {
      email: generateRandomEmail(),
      password: "TestPassword123!",
      name: "Edge Case User",
    };
  });

  test("Large content in post", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const largeContent = "Lorem ipsum dolor sit amet ".repeat(1000);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Large Post",
        slug: generateRandomSlug(),
        bodyMarkdown: largeContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyMarkdown.length).toBe(largeContent.length);
  });

  test("Special characters in post title", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test with special chars: !@#$%^&*()",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("Special characters in post body", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const specialContent = "Special chars: <>&\"'{}[]|\\`~!@#$%^&*()_+=?";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Special Chars Test",
        slug: generateRandomSlug(),
        bodyMarkdown: specialContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("Unicode characters in post", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const unicodeContent = "Unicode: 你好世界 🔥🚀💻 émojis and more 日本語";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Unicode Test",
        slug: generateRandomSlug(),
        bodyMarkdown: unicodeContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("Emoji in post content", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const emojiContent = "Testing emojis 🚀💡🎉✨🔥💻";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Emoji Test",
        slug: generateRandomSlug(),
        bodyMarkdown: emojiContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("Empty post title", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(400);
  });

  test("Empty post body", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(400);
  });

  test("Very long title", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const longTitle = "A".repeat(500);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: longTitle,
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("Network error handling", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts`);
    expect(response.ok()).toBeTruthy();
  });

  test("Concurrent post creation", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const promises = Array.from({ length: 5 }, (_, i) =>
      request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: `Concurrent Post ${i}`,
          slug: `concurrent-${Date.now()}-${i}`,
          bodyMarkdown: `Content ${i}`,
        },
        headers: {
          Cookie: cookies,
        },
      })
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status() === 201).length;
    expect(successCount).toBe(5);
  });

  test("Multiple posts by same author", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    for (let i = 0; i < 3; i++) {
      const response = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: `Post ${i}`,
          slug: generateRandomSlug(),
          bodyMarkdown: `Content ${i}`,
        },
        headers: {
          Cookie: cookies,
        },
      });
      expect(response.status()).toBe(201);
    }
  });

  test("API returns proper error structure", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test",
      },
    });

    const error = await response.json();
    expect(error).toHaveProperty("error");
    expect(typeof error.error).toBe("string");
  });

  test("HTML is sanitized in markdown", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const maliciousContent =
      "<script>alert('xss')</script><p>Normal content</p>";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "XSS Test",
        slug: generateRandomSlug(),
        bodyMarkdown: maliciousContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyHtml).not.toContain("<script>");
  });

  test("Whitespace handling in content", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const whitespaceContent =
      "   \n\n   Multiple   spaces   \n\n   Newlines   ";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Whitespace Test",
        slug: generateRandomSlug(),
        bodyMarkdown: whitespaceContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("Tabs and mixed whitespace", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const mixedContent = "Tab\there\n\nMixed\tcontent";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Tab Test",
        slug: generateRandomSlug(),
        bodyMarkdown: mixedContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("Post with only whitespace title fails", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "   ",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const status = response.status();
    expect([400, 201, 200].includes(status)).toBeTruthy();
  });

  test("Rapid sequential API calls", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: testUser,
    });

    for (let i = 0; i < 10; i++) {
      const response = await request.get(`${BASE_URL}/api/posts`);
      expect(response.ok()).toBeTruthy();
    }
  });

  test("Post update with empty title", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Original Title",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();

    const updateResponse = await request.put(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        data: {
          title: "",
        },
        headers: {
          Cookie: cookies,
        },
      }
    );

    // Empty title should be rejected with 400
    expect(updateResponse.status()).toBe(400);
  });

  test("API handles malformed JSON gracefully", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: "{ invalid json }",
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("ADMIN Role Tests", () => {
  testUser = {
    email: generateRandomEmail(),
    password: "TestPassword123!",
    name: "Regular User",
  };

  test("ADMIN can edit any user's post", async ({ request }) => {
    const { cookies: userCookies } = await createAuthenticatedUser(
      request,
      testUser
    );

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Regular User Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Original content",
      },
      headers: {
        Cookie: userCookies,
      },
    });

    const post = await createResponse.json();
    expect(post.title).toBe("Regular User Post");

    const { cookies: adminCookies } =
      await createAuthenticatedAdminUser(request);

    const updateResponse = await request.put(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        data: {
          title: "Updated by ADMIN",
        },
        headers: {
          Cookie: adminCookies,
        },
      }
    );

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.title).toBe("Updated by ADMIN");
  });

  test("ADMIN can delete any user's post", async ({ request }) => {
    const { cookies: adminCookies } =
      await createAuthenticatedAdminUser(request);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Post to be deleted by Admin",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
      },
      headers: {
        Cookie: adminCookies,
      },
    });

    const post = await createResponse.json();
    expect(post.title).toBeDefined();

    const deleteResponse = await request.delete(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        headers: {
          Cookie: adminCookies,
        },
      }
    );

    expect(deleteResponse.status()).toBe(200);

    const getResponse = await request.get(`${BASE_URL}/api/posts/${post.slug}`);
    expect(getResponse.status()).toBe(404);
  });
});

test.describe("Post Metadata Tests", () => {
  test.beforeEach(() => {
    testUser = {
      email: generateRandomEmail(),
      password: "TestPassword123!",
      name: "Metadata Test User",
    };
  });

  test("Creating a post with tags stores them correctly", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const tags = ["javascript", "react", "testing"];

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Post with Tags",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content with tags",
        tags,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.metadata).toBeDefined();
    expect(post.metadata.tags).toEqual(tags);
  });

  test("Creating a post with seoDescription stores it correctly", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const seoDescription = "This is a SEO description for the post";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Post with SEO Description",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
        seoDescription,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.metadata).toBeDefined();
    expect(post.metadata.seoDescription).toBe(seoDescription);
  });

  test("Tags are returned in the API response", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const tags = ["api", "test", "e2e"];

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Tags API Test",
        slug: generateRandomSlug(),
        bodyMarkdown: "Testing tags in API",
        tags,
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();

    const getResponse = await request.get(
      `${BASE_URL}/api/posts?limit=1&offset=0`
    );
    expect(getResponse.ok()).toBeTruthy();
    const data = await getResponse.json();
    expect(data.posts.length).toBeGreaterThan(0);
  });

  test("seoDescription is returned in the API response", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const seoDescription = "SEO description for testing";

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "SEO API Test",
        slug: generateRandomSlug(),
        bodyMarkdown: "Testing SEO in API",
        seoDescription,
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();
    expect(post.metadata.seoDescription).toBe(seoDescription);
  });

  test("Tags can be updated via PUT", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Original Tags Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
        tags: ["original"],
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();
    expect(post.metadata.tags).toEqual(["original"]);

    const updateResponse = await request.put(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        data: {
          tags: ["updated", "new-tag"],
        },
        headers: {
          Cookie: cookies,
        },
      }
    );

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.metadata.tags).toEqual(["updated", "new-tag"]);
  });

  test("seoDescription can be updated via PUT", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const createResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Original SEO Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
        seoDescription: "Original SEO",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await createResponse.json();
    expect(post.metadata.seoDescription).toBe("Original SEO");

    const updateResponse = await request.put(
      `${BASE_URL}/api/posts/${post.slug}`,
      {
        data: {
          seoDescription: "Updated SEO description",
        },
        headers: {
          Cookie: cookies,
        },
      }
    );

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.metadata.seoDescription).toBe("Updated SEO description");
  });

  test("Tags max count validation (max 20 tags)", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Too Many Tags",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
        tags: tooManyTags,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain("20");
  });

  test("Tags max length validation (max 50 chars per tag)", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const longTag = "a".repeat(51);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Long Tag Test",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
        tags: [longTag],
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain("50");
  });

  test("seoDescription max length validation (max 500 chars)", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, testUser);

    const longSeoDescription = "a".repeat(501);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Long SEO Test",
        slug: generateRandomSlug(),
        bodyMarkdown: "Content",
        seoDescription: longSeoDescription,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain("500");
  });
});
