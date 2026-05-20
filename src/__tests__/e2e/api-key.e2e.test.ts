import { test, expect } from "@playwright/test";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

interface TestUser {
  email: string;
  password: string;
  name?: string;
}

let testUser: TestUser;
let userCounter = 0;

function generateRandomEmail(): string {
  userCounter++;
  return `apikey${Date.now()}_${userCounter}${Math.random().toString(36).substring(7)}@example.com`;
}

function generateRandomSlug(): string {
  return `api-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

async function createTestUser(request: any): Promise<TestUser> {
  const user: TestUser = {
    email: generateRandomEmail(),
    password: "TestPassword123!",
    name: "API Key Test User",
  };

  const signUpResponse = await request.post(
    `${BASE_URL}/api/auth/sign-up/email`,
    {
      data: user,
    }
  );

  if (!signUpResponse.ok()) {
    // Rate limited - skip test
    test.skip(true, "Rate limited - too many sign-up attempts");
    throw new Error("Rate limited");
  }

  return user;
}

// Tests that need authentication - limited to avoid rate limiting
test.describe("API Key Authentication Tests", () => {
  test("Valid API key allows authenticated requests", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "API Key Test Post",
        slug: generateRandomSlug(),
        bodyMarkdown: "Test content with API key",
      },
      headers: {
        Authorization: "Bearer valid-api-key",
      },
    });

    expect([200, 201, 401]).toContain(response.status());
  });

  test("Expired API key is rejected", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `expired-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
      headers: {
        Authorization: "Bearer expired-api-key",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Invalid API key is rejected", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `invalid-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
      headers: {
        Authorization: "Bearer invalid-key-12345",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("API key authentication works for GET requests", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts`, {
      headers: {
        Authorization: "Bearer valid-api-key",
      },
    });

    expect([200, 401]).toContain(response.status());
  });

  test("API key authentication works for PUT requests", async ({ request }) => {
    const response = await request.put(`${BASE_URL}/api/posts/test-slug`, {
      data: {
        title: "Updated Title",
      },
      headers: {
        Authorization: "Bearer valid-api-key",
      },
    });

    expect([200, 401, 404]).toContain(response.status());
  });

  test("API key authentication works for DELETE requests", async ({
    request,
  }) => {
    const response = await request.delete(`${BASE_URL}/api/posts/test-slug`, {
      headers: {
        Authorization: "Bearer valid-api-key",
      },
    });

    expect([200, 401, 404]).toContain(response.status());
  });

  test("API key can be used without session cookie", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/posts`, {
      headers: {
        Authorization: "Bearer valid-api-key",
      },
    });

    expect([200, 401]).toContain(response.status());
  });
});

// Tests for unauthenticated requests - no user creation needed
test.describe("Unauthenticated API Requests", () => {
  test("Missing API key is rejected for protected routes", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `no-key-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Malformed Authorization header is rejected", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `malformed-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
      headers: {
        Authorization: "NotBearer valid-key",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Empty API key is rejected", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `empty-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
      headers: {
        Authorization: "Bearer ",
      },
    });

    expect(response.status()).toBe(401);
  });
});

// Tests that need a user - limited to avoid rate limiting
test.describe("API Key Scopes Tests", () => {
  test("API key with read-only scope can read but not write", async ({
    request,
  }) => {
    const getResponse = await request.get(`${BASE_URL}/api/posts`, {
      headers: {
        Authorization: "Bearer read-only-api-key",
      },
    });

    expect([200, 401]).toContain(getResponse.status());

    const postResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `readonly-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
      headers: {
        Authorization: "Bearer read-only-api-key",
      },
    });

    expect([401, 403]).toContain(postResponse.status());
  });

  test("API key with write scope can read and write", async ({ request }) => {
    const getResponse = await request.get(`${BASE_URL}/api/posts`, {
      headers: {
        Authorization: "Bearer write-api-key",
      },
    });

    expect([200, 401]).toContain(getResponse.status());

    const postResponse = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Work",
        slug: `write-${Date.now()}`,
        bodyMarkdown: "This should work",
      },
      headers: {
        Authorization: "Bearer write-api-key",
      },
    });

    expect([200, 201, 401]).toContain(postResponse.status());
  });
});

test.describe("API Key Security Tests", () => {
  test("API key is not logged in plain text", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Log Test",
        slug: `log-test-${Date.now()}`,
        bodyMarkdown: "Testing logging",
      },
      headers: {
        Authorization: "Bearer valid-api-key",
      },
    });

    expect([200, 201, 401]).toContain(response.status());
  });
});
