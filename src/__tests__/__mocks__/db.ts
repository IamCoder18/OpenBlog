import { vi } from "vitest";

const mockPosts: any[] = [];
const mockUsers: any[] = [];
let postIdCounter = 1;
let userIdCounter = 1;

export const prisma = {
  post: {
    findMany: vi.fn(async (options: any) => {
      let results = mockPosts.filter(p => p.visibility === "PUBLIC");

      if (options?.where?.id?.not) {
        results = results.filter(p => p.id !== options.where.id.not);
      }

      if (options?.where?.visibility) {
        results = results.filter(
          p => p.visibility === options.where.visibility
        );
      }

      if (options?.where?.metadata?.tags?.hasSome) {
        const tags = options.where.metadata.tags.hasSome;
        results = results.filter(
          p =>
            p.metadata?.tags &&
            p.metadata.tags.some((tag: string) => tags.includes(tag))
        );
      }

      if (options?.orderBy?.publishedAt === "desc") {
        results.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        );
      }

      const skip = options?.skip || 0;
      const take = options?.take || 10;

      return results.slice(skip, skip + take);
    }),
    count: vi.fn(async (options: any) => {
      let results = mockPosts.filter(p => p.visibility === "PUBLIC");

      if (options?.where?.visibility) {
        results = results.filter(
          p => p.visibility === options.where.visibility
        );
      }

      return results.length;
    }),
    findUnique: vi.fn(async (options: any) => {
      return mockPosts.find(p => p.slug === options?.where?.slug) || null;
    }),
    create: vi.fn(async (data: any) => {
      const post = {
        id: `post-${postIdCounter++}`,
        title: data.data.title,
        slug: data.data.slug,
        bodyMarkdown: data.data.bodyMarkdown,
        bodyHtml: data.data.bodyHtml,
        visibility: data.data.visibility,
        authorId: data.data.authorId,
        publishedAt: data.data.publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: data.data.metadata
          ? {
              id: `meta-${postIdCounter}`,
              seoDescription: data.data.metadata.create?.seoDescription,
              tags: data.data.metadata.create?.tags || [],
              postId: `post-${postIdCounter}`,
            }
          : null,
      };
      mockPosts.push(post);
      return post;
    }),
    deleteMany: vi.fn(async () => {
      const length = mockPosts.length;
      mockPosts.length = 0;
      return { count: length };
    }),
  },
  user: {
    create: vi.fn(async (data: any) => {
      const user = {
        id: `user-${userIdCounter++}`,
        name: data.data.name,
        email: data.data.email,
        image: data.data.image,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsers.push(user);
      return user;
    }),
    findUnique: vi.fn(async (options: any) => {
      return mockUsers.find(u => u.id === options?.where?.id) || null;
    }),
    deleteMany: vi.fn(async () => {
      const length = mockUsers.length;
      mockUsers.length = 0;
      return { count: length };
    }),
  },
  userProfile: {
    create: vi.fn(async (data: any) => ({
      id: `profile-${userIdCounter++}`,
      role: data.data.role || "AGENT",
      userId: data.data.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
  session: {
    create: vi.fn(),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
  account: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
  apiKey: {
    create: vi.fn(async (data: any) => ({
      id: `key-${Date.now()}`,
      key: data.data.key,
      name: data.data.name,
      userId: data.data.userId,
      expiresAt: data.data.expiresAt,
      createdAt: new Date(),
    })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
  verification: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
  postMetadata: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
  siteSettings: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
};

export function resetMockData() {
  mockPosts.length = 0;
  mockUsers.length = 0;
  postIdCounter = 1;
  userIdCounter = 1;
}

export function getMockPosts() {
  return mockPosts;
}

export function getMockUsers() {
  return mockUsers;
}

export function getPostIdCounter() {
  return postIdCounter;
}

export function getUserIdCounter() {
  return userIdCounter;
}

export function setPostIdCounter(value: number) {
  postIdCounter = value;
}

export function setUserIdCounter(value: number) {
  userIdCounter = value;
}

export function addMockPost(post: any) {
  mockPosts.push(post);
}

export function addMockUser(user: any) {
  mockUsers.push(user);
}
