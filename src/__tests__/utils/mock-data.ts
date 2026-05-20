export const mockUsers = {
  admin: {
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN" as const,
  },
  author: {
    name: "Author User",
    email: "author@example.com",
    role: "AUTHOR" as const,
  },
  agent: {
    name: "Agent User",
    email: "agent@example.com",
    role: "AGENT" as const,
  },
  another: {
    name: "Another User",
    email: "another@example.com",
    role: "AGENT" as const,
  },
};

export const mockPosts = {
  published: {
    title: "Published Post",
    slug: "published-post",
    bodyMarkdown: "# Published Post\n\nThis is a published post.",
    bodyHtml: "<h1>Published Post</h1><p>This is a published post.</p>",
    visibility: "PUBLIC" as const,
  },
  draft: {
    title: "Draft Post",
    slug: "draft-post",
    bodyMarkdown: "# Draft Post\n\nThis is a draft post.",
    bodyHtml: "<h1>Draft Post</h1><p>This is a draft post.</p>",
    visibility: "PRIVATE" as const,
  },
  private: {
    title: "Private Post",
    slug: "private-post",
    bodyMarkdown: "# Private Post\n\nThis is a private post.",
    bodyHtml: "<h1>Private Post</h1><p>This is a private post.</p>",
    visibility: "PRIVATE" as const,
  },
  withSeo: {
    title: "SEO Optimized Post",
    slug: "seo-optimized-post",
    bodyMarkdown: "# SEO Post\n\nThis post has SEO metadata.",
    bodyHtml: "<h1>SEO Post</h1><p>This post has SEO metadata.</p>",
    visibility: "PUBLIC" as const,
    seoDescription: "This is an SEO description for the post",
    tags: ["seo", "optimization", "test"],
  },
};

export const mockApiKeys = {
  valid: {
    name: "Valid API Key",
  },
  expired: {
    name: "Expired API Key",
  },
};

export const mockSessions = {
  valid: {
    expiresIn: 60 * 60 * 24 * 7,
  },
  short: {
    expiresIn: 60,
  },
};

export const mockSiteSettings = {
  blogName: {
    key: "blog_name",
    value: "Test Blog",
  },
  blogDescription: {
    key: "blog_description",
    value: "A test blog for testing purposes",
  },
};

export const testPatterns = {
  emails: {
    valid: "test@example.com",
    invalid: "not-an-email",
    empty: "",
  },
  passwords: {
    valid: "testPassword123",
    short: "short",
    empty: "",
  },
  slugs: {
    valid: "test-post-slug",
    withNumbers: "test-post-123",
    empty: "",
  },
};

export const apiResponsePatterns = {
  success: expect.objectContaining({
    success: true,
  }),
  error: expect.objectContaining({
    error: expect.any(String),
  }),
  notFound: expect.objectContaining({
    error: expect.stringContaining("not found"),
  }),
  unauthorized: expect.objectContaining({
    error: expect.stringContaining("unauthorized"),
  }),
  forbidden: expect.objectContaining({
    error: expect.stringContaining("forbidden"),
  }),
};

export function generateRandomEmail(): string {
  return `test-${Math.random().toString(36).substring(7)}@example.com`;
}

export function generateRandomSlug(): string {
  return `test-${Math.random().toString(36).substring(7)}`;
}

export function generateExpiredDate(): Date {
  return new Date(Date.now() - 1000);
}

export function generateFutureDate(daysFromNow: number = 7): Date {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}
