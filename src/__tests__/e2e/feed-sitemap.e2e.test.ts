import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  createAuthenticatedUser,
  createAuthenticatedPost,
  generateRandomSlug,
  BASE_URL,
} from "./test-helpers";

function xmlLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match =>
    match[1]
      .replaceAll("&amp;", "&")
      .replaceAll("&quot;", '"')
      .replaceAll("&apos;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
  );
}

async function sitemapDocuments(request: APIRequestContext): Promise<string[]> {
  const indexResponse = await request.get(`${BASE_URL}/sitemap.xml`);
  expect(indexResponse.ok()).toBeTruthy();
  const index = await indexResponse.text();
  const documents = await Promise.all(
    xmlLocations(index).map(async url => {
      const response = await request.get(url);
      expect(response.ok()).toBeTruthy();
      return response.text();
    })
  );
  return [index, ...documents];
}

test.describe("RSS Feed Endpoint (/feed.xml)", () => {
  test("Returns valid XML with correct Content-Type", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/feed.xml`);

    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/xml");
  });

  test("Contains required RSS elements", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/feed.xml`);
    const xml = await response.text();

    expect(xml).toMatch(/<\?xml version="1\.0" encoding="UTF-8"\s*\?>/);
    expect(xml).toContain("<rss");
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<title>");
    expect(xml).toContain("<link>");
    expect(xml).toContain("<description>");
  });

  test("Includes blog name in feed", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/feed.xml`);
    const xml = await response.text();

    expect(xml).toContain("<title>");
    expect(xml).toContain("<link>");
  });

  test("Returns valid XML structure when no posts exist", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/feed.xml`);
    const xml = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(xml).toContain("</channel>");
    expect(xml).toContain("</rss>");
  });

  test("Public posts appear in feed with correct format", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/feed.xml`);
    const xml = await response.text();

    const channelStart = xml.indexOf("<channel>");
    const channelEnd = xml.indexOf("</channel>");
    const channelContent = xml.substring(channelStart, channelEnd);

    expect(channelContent).toContain("<title>");
    expect(channelContent).toContain("<link>");
  });
});

test.describe("Sitemap Endpoint (/sitemap.xml)", () => {
  test("Robots advertises the runtime sitemap URL", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/robots.txt`);
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).toContain(`Sitemap: ${BASE_URL}/sitemap.xml`);
  });

  test("Returns valid XML with correct Content-Type", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/sitemap.xml`);

    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/xml");
  });

  test("Contains required sitemap elements", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/sitemap.xml`);
    const xml = await response.text();

    expect(xml).toMatch(/<\?xml version="1\.0" encoding="UTF-8"\s*\?>/);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("<sitemap>");
    expect(xml).toContain("<loc>");
    expect(xml).toContain('href="/sitemap.xsl"');
  });

  test("Includes base URL in sitemap", async ({ request }) => {
    const documents = await sitemapDocuments(request);

    expect(documents.join("\n")).toContain(`<loc>${BASE_URL}</loc>`);
  });

  test("Returns valid XML structure when no posts exist", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/sitemap.xml`);
    const xml = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(xml).toContain("</sitemapindex>");
  });

  test("Reflects newly published posts and excludes non-indexable posts", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Sitemap Test Author",
    });
    const publicSlug = generateRandomSlug();
    const privateSlug = generateRandomSlug();
    const unlistedSlug = generateRandomSlug();

    await createAuthenticatedPost(
      request,
      {
        title: "Runtime Sitemap Public Post",
        slug: publicSlug,
        bodyMarkdown: "Created after the production build.",
        visibility: "PUBLIC",
        tags: ["Sitemap Runtime"],
      },
      cookies
    );
    await createAuthenticatedPost(
      request,
      {
        title: "Runtime Sitemap Private Post",
        slug: privateSlug,
        bodyMarkdown: "Must not be indexed.",
        visibility: "PRIVATE",
      },
      cookies
    );
    await createAuthenticatedPost(
      request,
      {
        title: "Runtime Sitemap Unlisted Post",
        slug: unlistedSlug,
        bodyMarkdown: "Must not be indexed.",
        visibility: "UNLISTED",
      },
      cookies
    );

    const xml = (await sitemapDocuments(request)).join("\n");
    expect(xml).toContain(`/blog/${publicSlug}`);
    expect(xml).toContain("/topics/sitemap%20runtime");
    expect(xml).not.toContain(`/blog/${privateSlug}`);
    expect(xml).not.toContain(`/blog/${unlistedSlug}`);
  });

  test("Includes lastmod elements for posts", async ({ request }) => {
    const xml = (await sitemapDocuments(request)).join("\n");
    expect(xml).toMatch(
      /<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z<\/lastmod>/
    );
  });
});

test.describe("Related Posts Endpoint (/api/posts/:slug/related)", () => {
  test("Returns 404 for non-existent post", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/posts/non-existent-post-12345/related`
    );

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Post not found");
  });

  test("Returns 404 for private post", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Related Posts Test User",
    });

    const postResponse = await createAuthenticatedPost(
      request,
      {
        title: "Private Related Test Post",
        slug: `private-related-test-${Date.now()}`,
        bodyMarkdown: "This is a private post",
        visibility: "PRIVATE",
      },
      cookies
    );

    const postData = await postResponse.json();

    const relatedResponse = await request.get(
      `${BASE_URL}/api/posts/${postData.slug}/related`
    );

    expect(relatedResponse.status()).toBe(404);
    const relatedData = await relatedResponse.json();
    expect(relatedData.error).toBe("Post not found");
  });

  test("Returns empty array when no related posts exist", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Related Posts Test User 2",
    });

    const uniqueSlug = `solo-post-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    const postResponse = await createAuthenticatedPost(
      request,
      {
        title: "Solo Post",
        slug: uniqueSlug,
        bodyMarkdown: "This post has no related content",
        visibility: "PUBLIC",
        tags: ["unique-tag-nonexistent"],
      },
      cookies
    );

    const postData = await postResponse.json();

    const relatedResponse = await request.get(
      `${BASE_URL}/api/posts/${postData.slug}/related`
    );

    expect(relatedResponse.ok()).toBeTruthy();
    const relatedData = await relatedResponse.json();
    expect(Array.isArray(relatedData)).toBeTruthy();
  });

  test("Returns related posts with matching tags", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Related Posts Test User 3",
    });

    const mainSlug = `main-related-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    await createAuthenticatedPost(
      request,
      {
        title: "Main Post for Related Test",
        slug: mainSlug,
        bodyMarkdown: "Main content with tags",
        visibility: "PUBLIC",
        tags: ["e2e-test-tag", "testing"],
      },
      cookies
    );

    await createAuthenticatedPost(
      request,
      {
        title: "Related Post 1",
        slug: `related-1-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`,
        bodyMarkdown: "Related content",
        visibility: "PUBLIC",
        tags: ["e2e-test-tag"],
      },
      cookies
    );

    await createAuthenticatedPost(
      request,
      {
        title: "Related Post 2",
        slug: `related-2-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`,
        bodyMarkdown: "More related content",
        visibility: "PUBLIC",
        tags: ["testing"],
      },
      cookies
    );

    const relatedResponse = await request.get(
      `${BASE_URL}/api/posts/${mainSlug}/related`
    );

    expect(relatedResponse.ok()).toBeTruthy();
    const relatedData = await relatedResponse.json();
    expect(Array.isArray(relatedData)).toBeTruthy();
  });

  test("Returns posts with correct structure", async ({ request }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Related Posts Test User 4",
    });

    const mainSlug = `main-structure-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    await createAuthenticatedPost(
      request,
      {
        title: "Main Structure Test",
        slug: mainSlug,
        bodyMarkdown: "Main content",
        visibility: "PUBLIC",
        tags: ["structure-test"],
      },
      cookies
    );

    const relatedSlug = `related-structure-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    const relatedPostResponse = await createAuthenticatedPost(
      request,
      {
        title: "Related Structure Test",
        slug: relatedSlug,
        bodyMarkdown: "Related content",
        visibility: "PUBLIC",
        tags: ["structure-test"],
        seoDescription: "Test SEO description",
      },
      cookies
    );

    const relatedResponse = await request.get(
      `${BASE_URL}/api/posts/${mainSlug}/related`
    );

    expect(relatedResponse.ok()).toBeTruthy();
    const relatedData = await relatedResponse.json();

    if (relatedData.length > 0) {
      const firstRelated = relatedData[0];
      expect(firstRelated).toHaveProperty("id");
      expect(firstRelated).toHaveProperty("title");
      expect(firstRelated).toHaveProperty("slug");
      expect(firstRelated).toHaveProperty("author");
      expect(firstRelated.author).toHaveProperty("id");
      expect(firstRelated.author).toHaveProperty("name");
      expect(firstRelated).toHaveProperty("metadata");
    }
  });

  test("Does not include the main post in related results", async ({
    request,
  }) => {
    const { cookies } = await createAuthenticatedUser(request, {
      name: "Related Posts Test User 5",
    });

    const uniqueSlug = `exclude-test-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    await createAuthenticatedPost(
      request,
      {
        title: "Exclude Test Post",
        slug: uniqueSlug,
        bodyMarkdown: "Test content",
        visibility: "PUBLIC",
        tags: ["exclude-test"],
      },
      cookies
    );

    const relatedResponse = await request.get(
      `${BASE_URL}/api/posts/${uniqueSlug}/related`
    );

    expect(relatedResponse.ok()).toBeTruthy();
    const relatedData = await relatedResponse.json();

    for (const relatedPost of relatedData) {
      expect(relatedPost.slug).not.toBe(uniqueSlug);
    }
  });

  test("Returns JSON content type", async ({ request }) => {
    const postsResponse = await request.get(`${BASE_URL}/api/posts?limit=1`);

    if (postsResponse.ok()) {
      const data = await postsResponse.json();
      if (data.posts.length > 0) {
        const slug = data.posts[0].slug;
        const response = await request.get(
          `${BASE_URL}/api/posts/${slug}/related`
        );

        expect(response.headers()["content-type"]).toContain(
          "application/json"
        );
      }
    }
  });
});
