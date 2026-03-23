import { APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

function getHeaders(
  extraHeaders: Record<string, string> = {}
): Record<string, string> {
  return {
    Origin: BASE_URL,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

export interface TestUser {
  email: string;
  password: string;
  name?: string;
}

function generateRandomEmail(prefix: string = "test"): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).substring(7)}@example.com`;
}

function generateRandomSlug(): string {
  return `test-post-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function extractCookies(response: {
  headers: () => Record<string, string | string[]>;
}): string {
  const setCookie = response.headers()["set-cookie"];
  if (!setCookie) return "";

  if (Array.isArray(setCookie)) {
    return setCookie.map((c: string) => c.split(";")[0]).join("; ");
  }
  return setCookie.split(";")[0];
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(
          `[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

function isRateLimited(response: { status: () => number }): boolean {
  return response.status() === 429;
}

export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  return retryWithBackoff(
    async () => {
      const response = await request.post(
        `${BASE_URL}/api/auth/sign-in/email`,
        {
          data: {
            email,
            password,
          },
          headers: getHeaders(),
        }
      );

      if (isRateLimited(response)) {
        console.log(
          `[RATE LIMIT] Login rate limited for ${email}, retrying...`
        );
        throw new Error("Rate limited");
      }

      if (!response.ok()) {
        console.error(`[DEBUG] Login failed for ${email}:`);
        console.error(`[DEBUG] Status: ${response.status()}`);
        console.error(`[DEBUG] Body: ${await response.text()}`);
        throw new Error(`Failed to login user: ${email}`);
      }

      return extractCookies(response);
    },
    5,
    2000
  );
}

export async function createAuthenticatedUser(
  request: APIRequestContext,
  options?: {
    email?: string;
    password?: string;
    name?: string;
  }
): Promise<{ user: TestUser; cookies: string }> {
  const user: TestUser = {
    email: options?.email || generateRandomEmail("auth"),
    password: options?.password || "TestPassword123!",
    name: options?.name || "Test User",
  };

  return retryWithBackoff(
    async () => {
      const signUpResponse = await request.post(
        `${BASE_URL}/api/auth/sign-up/email`,
        {
          data: user,
          headers: getHeaders(),
        }
      );

      if (isRateLimited(signUpResponse)) {
        console.log(
          `[RATE LIMIT] Sign-up rate limited for ${user.email}, retrying...`
        );
        throw new Error("Rate limited");
      }

      if (signUpResponse.status() === 422) {
        const bodyText = await signUpResponse.text();
        if (bodyText.includes("User already exists")) {
          console.log(
            `[422] User already exists for ${user.email}, attempting sign-in...`
          );
          const signInResponse = await request.post(
            `${BASE_URL}/api/auth/sign-in/email`,
            {
              data: {
                email: user.email,
                password: user.password,
              },
              headers: getHeaders(),
            }
          );

          if (signInResponse.ok()) {
            return {
              user,
              cookies: extractCookies(signInResponse),
            };
          }
        }
      }

      if (signUpResponse.status() === 409) {
        const signInResponse = await request.post(
          `${BASE_URL}/api/auth/sign-in/email`,
          {
            data: {
              email: user.email,
              password: user.password,
            },
            headers: getHeaders(),
          }
        );

        if (isRateLimited(signInResponse)) {
          console.log(
            `[RATE LIMIT] Sign-in rate limited for ${user.email}, retrying...`
          );
          throw new Error("Rate limited");
        }

        if (!signInResponse.ok()) {
          console.error(
            `[DEBUG] Sign-in existing user failed for ${user.email}:`
          );
          console.error(`[DEBUG] Status: ${signInResponse.status()}`);
          console.error(`[DEBUG] Body: ${await signInResponse.text()}`);
          throw new Error(`Failed to sign in existing user: ${user.email}`);
        }

        return {
          user,
          cookies: extractCookies(signInResponse),
        };
      }

      if (!signUpResponse.ok()) {
        console.error(`[DEBUG] Sign-up failed for ${user.email}:`);
        console.error(`[DEBUG] Status: ${signUpResponse.status()}`);
        console.error(`[DEBUG] Body: ${await signUpResponse.text()}`);

        const signInResponse = await request.post(
          `${BASE_URL}/api/auth/sign-in/email`,
          {
            data: {
              email: user.email,
              password: user.password,
            },
            headers: getHeaders(),
          }
        );

        if (isRateLimited(signInResponse)) {
          console.log(
            `[RATE LIMIT] Sign-in rate limited for ${user.email}, retrying...`
          );
          throw new Error("Rate limited");
        }

        if (signInResponse.ok()) {
          return {
            user,
            cookies: extractCookies(signInResponse),
          };
        }

        console.error(
          `[DEBUG] Sign-up AND sign-in both failed for ${user.email}`
        );
        throw new Error(`Failed to create or sign in user: ${user.email}`);
      }

      const signInResponse = await request.post(
        `${BASE_URL}/api/auth/sign-in/email`,
        {
          data: {
            email: user.email,
            password: user.password,
          },
          headers: getHeaders(),
        }
      );

      if (isRateLimited(signInResponse)) {
        console.log(
          `[RATE LIMIT] Sign-in rate limited for ${user.email}, retrying...`
        );
        throw new Error("Rate limited");
      }

      if (!signInResponse.ok()) {
        console.error(
          `[DEBUG] Sign-in after sign-up failed for ${user.email}:`
        );
        console.error(`[DEBUG] Status: ${signInResponse.status()}`);
        console.error(`[DEBUG] Body: ${await signInResponse.text()}`);

        const retrySignUpResponse = await request.post(
          `${BASE_URL}/api/auth/sign-up/email`,
          {
            data: user,
            headers: getHeaders(),
          }
        );

        if (retrySignUpResponse.ok()) {
          const retrySignInResponse = await request.post(
            `${BASE_URL}/api/auth/sign-in/email`,
            {
              data: {
                email: user.email,
                password: user.password,
              },
              headers: getHeaders(),
            }
          );

          if (retrySignInResponse.ok()) {
            return {
              user,
              cookies: extractCookies(retrySignInResponse),
            };
          }
        }

        throw new Error(`Failed to sign in new user: ${user.email}`);
      }

      return {
        user,
        cookies: extractCookies(signInResponse),
      };
    },
    5,
    2000
  );
}

export async function createAuthenticatedAdminUser(
  request: APIRequestContext,
  options?: {
    email?: string;
    password?: string;
    name?: string;
  }
): Promise<{ user: TestUser; cookies: string }> {
  const { user, cookies } = await createAuthenticatedUser(request, options);

  await retryWithBackoff(
    async () => {
      const response = await request.post(`${BASE_URL}/api/admin/set-role`, {
        data: {
          email: user.email,
          role: "ADMIN",
        },
        headers: getHeaders({ Cookie: cookies }),
      });

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`Failed to set admin role: ${errorText}`);
      }
    },
    5,
    2000
  );

  return { user, cookies };
}

export async function createAuthenticatedPost(
  request: APIRequestContext,
  options: {
    title: string;
    slug?: string;
    bodyMarkdown: string;
    visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
    tags?: string[];
    seoDescription?: string;
  },
  cookies: string
) {
  const response = await request.post(`${BASE_URL}/api/posts`, {
    data: options,
    headers: getHeaders({ Cookie: cookies }),
  });

  return response;
}

export {
  generateRandomEmail,
  generateRandomSlug,
  extractCookies,
  getHeaders,
  BASE_URL,
  loginUser,
  createAuthenticatedAdminUser,
};
