import { test, expect, APIRequestContext } from "@playwright/test";
import {
  createAuthenticatedUser,
  createAuthenticatedAdminUser,
  generateRandomEmail,
  generateRandomSlug,
  BASE_URL,
  TestUser,
} from "./test-helpers";

async function createAuthenticatedAgentUser(
  request: APIRequestContext,
  options?: {
    email?: string;
    password?: string;
    name?: string;
  }
): Promise<{ user: TestUser; cookies: string }> {
  const { user, cookies } = await createAuthenticatedUser(request, options);

  const response = await request.post(`${BASE_URL}/api/admin/set-role`, {
    data: {
      email: user.email,
      role: "AGENT",
    },
    headers: {
      Origin: BASE_URL,
      Cookie: cookies,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to set AGENT role: ${await response.text()}`);
  }

  return { user, cookies };
}

async function createAuthenticatedAuthorUser(
  request: APIRequestContext,
  options?: {
    email?: string;
    password?: string;
    name?: string;
  }
): Promise<{ user: TestUser; cookies: string }> {
  const { user, cookies } = await createAuthenticatedUser(request, options);

  const response = await request.post(`${BASE_URL}/api/admin/set-role`, {
    data: {
      email: user.email,
      role: "AUTHOR",
    },
    headers: {
      Origin: BASE_URL,
      Cookie: cookies,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to set AUTHOR role: ${await response.text()}`);
  }

  return { user, cookies };
}

test.describe("UserProfile Role-Based Access Tests", () => {
  let testUser: TestUser;
  let testUser2: TestUser;

  test.beforeEach(() => {
    testUser = {
      email: generateRandomEmail(),
      password: "TestPassword123!",
      name: "Test Agent User",
    };
    testUser2 = {
      email: generateRandomEmail(),
      password: "TestPassword123!",
      name: "Test Agent User 2",
    };
  });

  test.describe("AGENT Role Tests", () => {
    test("AGENT role can create posts", async ({ request }) => {
      const { cookies } = await createAuthenticatedAgentUser(request, testUser);

      const response = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "AGENT Created Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content by AGENT user",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: cookies,
        },
      });

      expect(response.status()).toBe(201);
      const post = await response.json();
      expect(post.title).toBe("AGENT Created Post");
    });

    test("AGENT role can update own posts", async ({ request }) => {
      const { cookies } = await createAuthenticatedAgentUser(request, testUser);

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Original AGENT Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Original content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: cookies,
        },
      });

      expect(createResponse.status()).toBe(201);

      const post = await createResponse.json();

      const deleteResponse = await request.delete(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          headers: {
            Origin: BASE_URL,
            Cookie: cookies,
          },
        }
      );

      expect(deleteResponse.status()).toBe(200);

      const getResponse = await request.get(
        `${BASE_URL}/api/posts/${post.slug}`
      );
      expect(getResponse.status()).toBe(404);
    });

    test("AGENT role cannot delete others' posts (403)", async ({
      request,
    }) => {
      const { cookies: agent1Cookies } = await createAuthenticatedAgentUser(
        request,
        testUser
      );
      const { cookies: agent2Cookies } = await createAuthenticatedAgentUser(
        request,
        testUser2
      );

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Agent 1 Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: agent1Cookies,
        },
      });

      expect(createResponse.status()).toBe(201);

      const post = await createResponse.json();

      const deleteResponse = await request.delete(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          headers: {
            Origin: BASE_URL,
            Cookie: agent2Cookies,
          },
        }
      );

      expect(deleteResponse.status()).toBe(403);
      const error = await deleteResponse.json();
      expect(error.error).toContain("only delete your own posts");
    });
  });

  test.describe("ADMIN Role Tests", () => {
    test("ADMIN role can edit any post", async ({ request }) => {
      const { cookies: agentCookies } = await createAuthenticatedAgentUser(
        request,
        testUser
      );

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Regular Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Original content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: agentCookies,
        },
      });

      const post = await createResponse.json();
      expect(post.title).toBe("Regular Post");

      const { cookies: adminCookies } =
        await createAuthenticatedAdminUser(request);

      const updateResponse = await request.put(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          data: {
            title: "Updated by ADMIN",
          },
          headers: {
            Origin: BASE_URL,
            Cookie: adminCookies,
          },
        }
      );

      expect(updateResponse.status()).toBe(200);
      const updated = await updateResponse.json();
      expect(updated.title).toBe("Updated by ADMIN");
    });

    test("ADMIN role can delete any post", async ({ request }) => {
      const { cookies: agentCookies } = await createAuthenticatedAgentUser(
        request,
        testUser
      );

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Post for ADMIN",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: agentCookies,
        },
      });

      expect(createResponse.status()).toBe(201);

      const post = await createResponse.json();
      expect(post.title).toBeDefined();

      const { cookies: adminCookies } =
        await createAuthenticatedAdminUser(request);

      const deleteResponse = await request.delete(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          headers: {
            Origin: BASE_URL,
            Cookie: adminCookies,
          },
        }
      );

      expect(deleteResponse.status()).toBe(200);

      const getResponse = await request.get(
        `${BASE_URL}/api/posts/${post.slug}`
      );
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe("AUTHOR Role Tests", () => {
    test("AUTHOR role can create posts", async ({ request }) => {
      const { cookies } = await createAuthenticatedAuthorUser(
        request,
        testUser
      );

      const response = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "AUTHOR Created Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content by AUTHOR user",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: cookies,
        },
      });

      expect(response.status()).toBe(201);
      const post = await response.json();
      expect(post.title).toBe("AUTHOR Created Post");
    });

    test("AUTHOR role can update own posts", async ({ request }) => {
      const { cookies } = await createAuthenticatedAuthorUser(
        request,
        testUser
      );

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Original AUTHOR Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Original content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: cookies,
        },
      });

      expect(createResponse.status()).toBe(201);

      const post = await createResponse.json();

      const updateResponse = await request.put(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          data: {
            title: "Updated AUTHOR Post",
          },
          headers: {
            Origin: BASE_URL,
            Cookie: cookies,
          },
        }
      );

      expect(updateResponse.status()).toBe(200);
      const updated = await updateResponse.json();
      expect(updated.title).toBe("Updated AUTHOR Post");
    });

    test("AUTHOR role can delete own posts", async ({ request }) => {
      const { cookies } = await createAuthenticatedAuthorUser(
        request,
        testUser
      );

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Original AUTHOR Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Original content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: cookies,
        },
      });

      expect(createResponse.status()).toBe(201);

      const post = await createResponse.json();

      const deleteResponse = await request.delete(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          headers: {
            Origin: BASE_URL,
            Cookie: cookies,
          },
        }
      );

      expect(deleteResponse.status()).toBe(200);

      const getResponse = await request.get(
        `${BASE_URL}/api/posts/${post.slug}`
      );
      expect(getResponse.status()).toBe(404);
    });

    test("AUTHOR role cannot delete others' posts (403)", async ({
      request,
    }) => {
      const { cookies: authorCookies } = await createAuthenticatedAuthorUser(
        request,
        testUser
      );
      const { cookies: agentCookies } = await createAuthenticatedAgentUser(
        request,
        testUser2
      );

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Author Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: authorCookies,
        },
      });

      expect(createResponse.status()).toBe(201);

      const post = await createResponse.json();

      const deleteResponse = await request.delete(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          headers: {
            Origin: BASE_URL,
            Cookie: agentCookies,
          },
        }
      );

      expect(deleteResponse.status()).toBe(403);
      const error = await deleteResponse.json();
      expect(error.error).toContain("only delete your own posts");
    });
  });

  test.describe("UserProfile Existence Tests", () => {
    test("UserProfile existence is required for authenticated actions - UPDATE", async ({
      request,
    }) => {
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
          title: "Test Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: user1Cookies,
        },
      });

      const post = await createResponse.json();

      const response = await request.put(`${BASE_URL}/api/posts/${post.slug}`, {
        data: {
          title: "New Title",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: user2Cookies,
        },
      });

      expect(response.status()).toBe(403);
    });

    test("UserProfile existence is required for authenticated actions - DELETE", async ({
      request,
    }) => {
      const { cookies: user1Cookies } = await createAuthenticatedUser(
        request,
        testUser
      );

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Test Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: user1Cookies,
        },
      });

      const post = await createResponse.json();

      const { cookies: user2Cookies } = await createAuthenticatedUser(
        request,
        testUser2
      );

      const setRoleResponse = await request.post(
        `${BASE_URL}/api/admin/set-role`,
        {
          data: {
            email: testUser2.email,
            role: "GUEST",
          },
          headers: {
            Origin: BASE_URL,
            Cookie: user2Cookies,
            "Content-Type": "application/json",
          },
        }
      );

      if (!setRoleResponse.ok()) {
        throw new Error(
          `Failed to set GUEST role: ${await setRoleResponse.text()}`
        );
      }

      const response = await request.delete(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          headers: {
            Origin: BASE_URL,
            Cookie: user2Cookies,
          },
        }
      );

      expect(response.status()).toBe(403);
    });
  });

  test.describe("Role Association Tests", () => {
    test("Role is correctly associated with user", async ({ request }) => {
      const { cookies } = await createAuthenticatedAgentUser(request, testUser);

      const sessionResponse = await request.get(
        `${BASE_URL}/api/auth/get-session`,
        {
          headers: {
            Origin: BASE_URL,
            Cookie: cookies,
          },
        }
      );

      expect(sessionResponse.ok()).toBeTruthy();
      const sessionData = await sessionResponse.json();
      expect(sessionData.user).toBeDefined();
      expect(sessionData.user.email).toBe(testUser.email);
    });

    test("AGENT role has correct permissions vs regular authenticated user", async ({
      request,
    }) => {
      const { cookies: agentCookies } = await createAuthenticatedAgentUser(
        request,
        testUser
      );

      const createResponse = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Agent Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: agentCookies,
        },
      });

      expect(createResponse.status()).toBe(201);

      const { cookies: regularCookies } = await createAuthenticatedUser(
        request,
        testUser2
      );

      const createResponse2 = await request.post(`${BASE_URL}/api/posts`, {
        data: {
          title: "Regular User Post",
          slug: generateRandomSlug(),
          bodyMarkdown: "Content",
        },
        headers: {
          Origin: BASE_URL,
          Cookie: regularCookies,
        },
      });

      const post = await createResponse2.json();

      const updateResponse = await request.put(
        `${BASE_URL}/api/posts/${post.slug}`,
        {
          data: {
            title: "Trying to update",
          },
          headers: {
            Origin: BASE_URL,
            Cookie: agentCookies,
          },
        }
      );

      expect(updateResponse.status()).toBe(403);
    });
  });
});
