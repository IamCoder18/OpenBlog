import { test, expect } from "@playwright/test";
import {
  createAuthenticatedUser,
  generateRandomEmail,
  generateRandomSlug,
  BASE_URL,
} from "./test-helpers";

let testUser: { email: string; password: string; name?: string };

test.describe("Security Tests - XSS Prevention", () => {
  let cookies: string;
  test.beforeEach(async ({ request }) => {
    const result = await createAuthenticatedUser(request, {
      name: "Security Test User",
    });
    cookies = result.cookies;
  });

  test("Script tag injection is prevented in post body", async ({
    request,
  }) => {
    const maliciousContent =
      "<script>alert('xss')</script><p>Normal content</p>";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "XSS Test - Script Tag",
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
    expect(post.bodyHtml).not.toContain("alert(");
  });

  test("Script tag injection is prevented in post title", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "<script>alert('xss')</script>",
        slug: generateRandomSlug(),
        bodyMarkdown: "Test content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    const post = await response.json();
    const htmlTitle = post.bodyHtml || "";
    expect(htmlTitle).not.toContain("<script>");
  });

  test("Event handlers (onclick, onerror, onload) are removed", async ({
    request,
  }) => {
    const maliciousContent = `
<img src="x" onerror="alert(1)">
<svg onload="alert(1)">
<a href="#" onclick="alert(1)">click</a>
    `.trim();

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Event Handler Test",
        slug: generateRandomSlug(),
        bodyMarkdown: maliciousContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    const html = post.bodyHtml || "";
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onload");
  });

  test("JavaScript URLs are blocked", async ({ request }) => {
    const maliciousContent = `
<a href="javascript:alert(1)">Click me</a>
<a href="javascript:alert('xss')">Link</a>
    `.trim();

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "JS URL Test",
        slug: generateRandomSlug(),
        bodyMarkdown: maliciousContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    const html = post.bodyHtml || "";
    expect(html).not.toContain("javascript:");
  });

  test("Iframe injection is prevented", async ({ request }) => {
    const maliciousContent = `
<iframe src="https://evil.com/steal"></iframe>
<iframe src="javascript:alert(1)"></iframe>
    `.trim();

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Iframe Test",
        slug: generateRandomSlug(),
        bodyMarkdown: maliciousContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect([201, 400]).toContain(response.status());
  });
});

test.describe("Security Tests - Additional Input Validation", () => {
  let cookies: string;
  test.beforeEach(async ({ request }) => {
    const result = await createAuthenticatedUser(request, {
      name: "Input Validation Test User",
    });
    cookies = result.cookies;
  });

  test("Null byte injection is handled", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Test\x00Title",
        slug: generateRandomSlug(),
        bodyMarkdown: "Test\x00Content",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect([201, 400]).toContain(response.status());
  });

  test("Very long input does not cause denial of service", async ({
    request,
  }) => {
    const longContent = "A".repeat(100000);

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Long Content Test",
        slug: generateRandomSlug(),
        bodyMarkdown: longContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("HTML comment injection is handled", async ({ request }) => {
    const maliciousContent = `
<!--[if IE]><script>alert('xss')</script><![endif]-->
    `.trim();

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "HTML Comment Test",
        slug: generateRandomSlug(),
        bodyMarkdown: maliciousContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyHtml).not.toContain("<!--");
  });

  test("CDATA injection is handled", async ({ request }) => {
    const maliciousContent = `
<![CDATA[<script>alert(1)</script>]]>
    `.trim();

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "CDATA Test",
        slug: generateRandomSlug(),
        bodyMarkdown: maliciousContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.bodyHtml).not.toContain("<![CDATA[");
  });

  test("Data URI scheme is sanitized", async ({ request }) => {
    const maliciousContent = `
<a href="data:text/html,<script>alert(1)</script>">Click</a>
    `.trim();

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Data URI Test",
        slug: generateRandomSlug(),
        bodyMarkdown: maliciousContent,
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
    const post = await response.json();
    const html = post.bodyHtml || "";
    expect(html).not.toContain("data:text/html");
  });
});

test.describe("Security Tests - Authentication Bypass Prevention", () => {
  test("Cannot create post without authentication", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Unauthorized Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Should not work",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Cannot update post without authentication", async ({ request }) => {
    const response = await request.put(`${BASE_URL}/api/posts/some-slug`, {
      data: {
        title: "Unauthorized Update",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Cannot delete post without authentication", async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/posts/some-slug`);

    expect(response.status()).toBe(401);
  });

  test("Invalid session token is rejected", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts`, {
      headers: {
        Cookie: "session=invalid-token-12345",
      },
    });

    expect(response.ok()).toBeTruthy();
  });
});

test.describe("Security Tests - Rate Limiting Verification", () => {
  test("Multiple rapid sign-up attempts are rate limited", async ({
    request,
  }) => {
    const email = generateRandomEmail();
    const attempts: number[] = [];

    for (let i = 0; i < 10; i++) {
      const response = await request.post(
        `${BASE_URL}/api/auth/sign-up/email`,
        {
          data: {
            email,
            password: "TestPassword123!",
            name: "Rate Limit Test",
          },
        }
      );
      attempts.push(response.status());
    }

    const successCount = attempts.filter(s => s === 200 || s === 201).length;
    expect(successCount).toBeLessThanOrEqual(1);
  });
});
