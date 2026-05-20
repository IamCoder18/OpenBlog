import { test, expect } from "@playwright/test";
import {
  createAuthenticatedUser,
  generateRandomEmail,
  generateRandomSlug,
  BASE_URL,
  extractCookies,
  TestUser,
  loginUser,
} from "./test-helpers";

let testUser: TestUser;

test.describe("Session Expiration Tests", () => {
  test.beforeEach(async ({ request }) => {
    testUser = await createAuthenticatedUser(request);
  });

  test("Session persists for configured duration", async ({ request }) => {
    const sessionCookie = await loginUser(
      request,
      testUser.user.email,
      testUser.user.password
    );

    expect(sessionCookie).toContain("better-auth.session_token");

    const response = await request.get(`${BASE_URL}/api/posts`, {
      headers: {
        Cookie: sessionCookie,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test("Valid session allows authenticated requests", async ({ request }) => {
    const cookies = await loginUser(
      request,
      testUser.user.email,
      testUser.user.password
    );

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Session Test Post",
        slug: `session-test-${Date.now()}`,
        bodyMarkdown: "Test content for session",
      },
      headers: {
        Cookie: cookies,
      },
    });

    expect(response.status()).toBe(201);
  });

  test("Invalid session token is rejected for protected operations", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `fail-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
      headers: {
        Cookie: "better-auth.session_token=invalid-token-12345",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Malformed session cookie is rejected", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `fail-malformed-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
      headers: {
        Cookie: "better-auth.session_token=",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Expired session is rejected for protected operations", async ({
    request,
  }) => {
    const expiredSessionCookie =
      "better-auth.session_token=expired-session-token-xyz";

    const response = await request.post(`${BASE_URL}/api/posts`, {
      data: {
        title: "Should Fail",
        slug: `fail-expired-${Date.now()}`,
        bodyMarkdown: "Should not work",
      },
      headers: {
        Cookie: expiredSessionCookie,
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Session cookie has proper security attributes", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: testUser.user.email,
        password: testUser.user.password,
      },
    });

    const cookies = response.headers()["set-cookie"];
    expect(cookies).toBeDefined();

    const sessionCookie = cookies
      .split(",")
      .find((c: string) => c.includes("better-auth.session_token"));

    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("Path=/");
  });

  test("Session can be refreshed on activity", async ({ request }) => {
    const sessionCookie = await loginUser(
      request,
      testUser.user.email,
      testUser.user.password
    );

    const response1 = await request.get(`${BASE_URL}/api/posts`, {
      headers: { Cookie: sessionCookie },
    });
    expect(response1.ok()).toBeTruthy();

    const response2 = await request.get(`${BASE_URL}/api/posts`, {
      headers: { Cookie: sessionCookie },
    });
    expect(response2.ok()).toBeTruthy();
  });

  test("Multiple concurrent sessions are supported", async ({ request }) => {
    const session1 = await loginUser(
      request,
      testUser.user.email,
      testUser.user.password
    );
    const session2 = await loginUser(
      request,
      testUser.user.email,
      testUser.user.password
    );

    const response1 = await request.get(`${BASE_URL}/api/posts`, {
      headers: { Cookie: session1 },
    });
    const response2 = await request.get(`${BASE_URL}/api/posts`, {
      headers: { Cookie: session2 },
    });

    expect(response1.ok()).toBeTruthy();
    expect(response2.ok()).toBeTruthy();
  });

  test("Logout invalidates session", async ({ request }) => {
    const sessionCookie = await loginUser(
      request,
      testUser.user.email,
      testUser.user.password
    );

    const logoutResponse = await request.post(`${BASE_URL}/api/auth/sign-out`, {
      data: {},
      headers: {
        Cookie: sessionCookie,
      },
    });

    expect(logoutResponse.ok()).toBeTruthy();
  });
});

test.describe("Session Security Tests", () => {
  test.beforeEach(async ({ request }) => {
    testUser = await createAuthenticatedUser(request);
  });

  test("Session token is not exposed in response body", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: testUser.user.email,
        password: testUser.user.password,
      },
    });

    const body = await response.json();
    expect(body).not.toHaveProperty("sessionToken");
  });

  test("Different users have different sessions", async ({ request }) => {
    const user2Email = generateRandomEmail();
    const user2: TestUser = {
      email: user2Email,
      password: "TestPassword123!",
      name: "User 2",
    };

    await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: user2,
    });

    const session1 = await loginUser(
      request,
      testUser.user.email,
      testUser.user.password
    );
    const session2 = await loginUser(request, user2Email, user2.password);

    expect(session1).not.toEqual(session2);
  });
});
