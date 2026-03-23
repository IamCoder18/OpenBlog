import { prisma } from "@/lib/db";
import { Role } from "@/lib/prisma";

export { prisma, Role };

// Clean all tables in the database
export async function cleanupDatabase(): Promise<void> {
  // Delete in correct order to respect foreign keys
  await prisma.postMetadata.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.post.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.user.deleteMany();
}

// Create a test user with profile
export async function createTestUser(options?: {
  email?: string;
  name?: string;
  role?: (typeof Role)[keyof typeof Role];
  image?: string;
}): Promise<{ user: any; profile: any }> {
  const email = options?.email || `test-${Date.now()}@example.com`;
  const name = options?.name || "Test User";
  const role = (options?.role ||
    Role.AGENT) as (typeof Role)[keyof typeof Role];

  const user = await prisma.user.create({
    data: {
      email,
      name,
      image: options?.image || null,
    },
  });

  const profile = await prisma.userProfile.create({
    data: {
      userId: user.id,
      role: role,
    },
  });

  return { user, profile };
}

// Create a test post
export async function createTestPost(options: {
  title: string;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  authorId: string;
  visibility?: "PUBLIC" | "PRIVATE" | "DRAFT" | "UNLISTED";
  tags?: string[];
  seoDescription?: string;
  publishedAt?: Date;
}): Promise<any> {
  const visibility = options.visibility || "PUBLIC";

  const post = await prisma.post.create({
    data: {
      title: options.title,
      slug: options.slug,
      bodyMarkdown: options.bodyMarkdown,
      bodyHtml: options.bodyHtml,
      authorId: options.authorId,
      visibility,
      publishedAt:
        options.publishedAt !== undefined
          ? options.publishedAt
          : visibility === "PUBLIC"
            ? new Date()
            : null,
      metadata:
        options.tags || options.seoDescription
          ? {
              create: {
                tags: options.tags || [],
                seoDescription: options.seoDescription || null,
              },
            }
          : undefined,
    },
    include: {
      author: true,
      metadata: true,
    },
  });

  return post;
}
