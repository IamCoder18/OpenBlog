import {
  PrismaClient,
  User,
  Post,
  ApiKey,
  Role,
  Visibility,
  UserProfile,
} from "@/lib/prisma";
import supertest from "supertest";
import crypto from "crypto";

let testPrisma: PrismaClient;
let mockDataInitialized = false;

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";

export async function setupTestDatabase(
  databaseUrl?: string
): Promise<PrismaClient> {
  if (testPrisma) {
    return testPrisma;
  }

  const { prisma } = require("@/lib/db");
  testPrisma = prisma as unknown as PrismaClient;

  return testPrisma;
}

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    throw new Error(
      "Test database not initialized. Call setupTestDatabase() first."
    );
  }
  return testPrisma;
}

export interface CreateUserData {
  name?: string;
  email?: string;
  image?: string;
  role?: Role;
}

export interface CreateUserResult {
  user: User;
  profile: UserProfile;
}

export async function createUser(
  data: CreateUserData = {}
): Promise<CreateUserResult> {
  const prisma = getTestPrisma();

  const email = data.email || `test-${crypto.randomUUID()}@example.com`;
  const name = data.name || "Test User";

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: name,
      email,
      image: data.image || null,
    },
  });

  const profile = await prisma.userProfile.create({
    data: {
      userId: user.id,
      role: data.role || "AGENT",
    },
  });

  return {
    user: user as unknown as User,
    profile,
  };
}

export interface CreatePostData {
  title?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  visibility?: Visibility;
  authorId?: string;
  seoDescription?: string;
  tags?: string[];
}

export async function createPost(data: CreatePostData = {}): Promise<Post> {
  const prisma = getTestPrisma();

  let authorId = data.authorId;

  if (!authorId) {
    const userResult = await createUser();
    authorId = userResult.user.id;
  }

  const title = data.title || `Test Post ${crypto.randomUUID().slice(0, 8)}`;
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    crypto.randomUUID().slice(0, 8);
  const bodyMarkdown =
    data.bodyMarkdown || "# Test Post\n\nThis is a test post.";
  const bodyHtml =
    data.bodyHtml || "<h1>Test Post</h1><p>This is a test post.</p>";
  const visibility = data.visibility || "PUBLIC";

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      bodyMarkdown,
      bodyHtml,
      visibility,
      authorId,
      publishedAt: visibility === "PUBLIC" ? new Date() : null,
      metadata:
        data.seoDescription || data.tags
          ? {
              create: {
                seoDescription: data.seoDescription || null,
                tags: data.tags || [],
              },
            }
          : undefined,
    },
  });

  return post;
}

export interface CreateApiKeyData {
  userId?: string;
  name?: string;
  expiresAt?: Date;
}

export async function createApiKey(
  data: CreateApiKeyData = {}
): Promise<ApiKey> {
  const prisma = getTestPrisma();

  let userId = data.userId;

  if (!userId) {
    const userResult = await createUser();
    userId = userResult.user.id;
  }

  const key = `test-api-key-${crypto.randomUUID()}`;
  const name = data.name || "Test API Key";

  const apiKey = await prisma.apiKey.create({
    data: {
      key,
      name,
      userId,
      expiresAt: data.expiresAt || null,
    },
  });

  return apiKey;
}

export interface CreateSessionData {
  userId: string;
  expiresIn?: number;
}

export async function createSession(
  data: CreateSessionData
): Promise<{ sessionToken: string; cookie: string }> {
  const prisma = getTestPrisma();

  const expiresAt = new Date(
    Date.now() + (data.expiresIn || 60 * 60 * 24 * 7) * 1000
  );
  const token = `test-session-${crypto.randomUUID()}`;

  await prisma.session.create({
    data: {
      token,
      userId: data.userId,
      expiresAt,
    },
  });

  const cookie = `better-auth.session_token=${token}; Path=/; HttpOnly; SameSite=Lax`;

  return { sessionToken: token, cookie };
}

export async function getAuthCookie(userId: string): Promise<string> {
  const { cookie } = await createSession({ userId });
  return cookie;
}

export function getApiKeyHeader(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

export function getSessionHeader(userId: string): Record<string, string> {
  return {
    "X-Test-User-Id": userId,
  };
}

export async function createAuthenticatedUser(): Promise<{
  user: User;
  profile: UserProfile;
  cookie: string;
}> {
  const userResult = await createUser();
  const cookie = await getAuthCookie(userResult.user.id);

  return {
    user: userResult.user,
    profile: userResult.profile,
    cookie,
  };
}

export async function createAdminUser(): Promise<{
  user: User;
  profile: UserProfile;
  cookie: string;
}> {
  const userResult = await createUser({ role: "ADMIN" });
  const cookie = await getAuthCookie(userResult.user.id);

  return {
    user: userResult.user,
    profile: userResult.profile,
    cookie,
  };
}

export function createApiClient(baseUrl: string = "http://localhost:3000") {
  return supertest.agent(baseUrl);
}

export async function cleanupDatabase(): Promise<void> {
  if (!testPrisma) {
    return;
  }

  const prisma = testPrisma;

  await prisma.postMetadata.deleteMany();
  await prisma.post.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.siteSettings.deleteMany();
}

export async function closeTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = undefined as unknown as PrismaClient;
  }
}

export async function seedMinimalData(): Promise<{
  user: User;
  post: Post;
  admin: User;
}> {
  await cleanupDatabase();

  const userResult = await createUser({
    name: "Regular User",
    email: "user@test.com",
  });

  const adminResult = await createUser({
    name: "Admin User",
    email: "admin@test.com",
    role: "ADMIN",
  });

  const post = await createPost({
    authorId: userResult.user.id,
    title: "Test Post",
    bodyMarkdown: "# Test\n\nTest content",
    bodyHtml: "<h1>Test</h1><p>Test content</p>",
    visibility: "PUBLIC",
  });

  return {
    user: userResult.user,
    post,
    admin: adminResult.user,
  };
}
