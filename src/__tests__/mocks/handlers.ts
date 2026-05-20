import { http, HttpResponse } from "msw";

export interface PostAuthor {
  id: string;
  name: string;
  image: string | null;
}

export interface PostMetadata {
  id: string;
  seoDescription: string | null;
  tags: string[];
  postId: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  publishedAt: string | null;
  author: PostAuthor;
  metadata: PostMetadata | null;
}

export interface PostsListResponse {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
}

const mockPosts: Post[] = [
  {
    id: "post-1",
    title: "Test Post 1",
    slug: "test-post-1",
    bodyMarkdown: "# Test Post 1\n\nContent here.",
    bodyHtml: "<h1>Test Post 1</h1><p>Content here.</p>",
    publishedAt: new Date().toISOString(),
    author: {
      id: "user-1",
      name: "Test Author",
      image: "https://example.com/avatar.jpg",
    },
    metadata: {
      id: "meta-1",
      seoDescription: "SEO description for test post 1",
      tags: ["react", "typescript"],
      postId: "post-1",
    },
  },
  {
    id: "post-2",
    title: "Test Post 2",
    slug: "test-post-2",
    bodyMarkdown: "# Test Post 2\n\nMore content.",
    bodyHtml: "<h1>Test Post 2</h1><p>More content.</p>",
    publishedAt: new Date().toISOString(),
    author: {
      id: "user-1",
      name: "Test Author",
      image: "https://example.com/avatar.jpg",
    },
    metadata: {
      id: "meta-2",
      seoDescription: "SEO description for test post 2",
      tags: ["react", "nextjs"],
      postId: "post-2",
    },
  },
  {
    id: "post-3",
    title: "Test Post 3",
    slug: "test-post-3",
    bodyMarkdown: "# Test Post 3\n\nEven more content.",
    bodyHtml: "<h1>Test Post 3</h1><p>Even more content.</p>",
    publishedAt: new Date().toISOString(),
    author: {
      id: "user-2",
      name: "Another Author",
      image: null,
    },
    metadata: {
      id: "meta-3",
      seoDescription: null,
      tags: ["python"],
      postId: "post-3",
    },
  },
];

export const handlers = [
  http.get("/api/posts", ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const posts = mockPosts.slice(offset, offset + limit);
    const response: PostsListResponse = {
      posts,
      total: mockPosts.length,
      limit,
      offset,
    };

    return HttpResponse.json(response);
  }),

  http.get("/api/posts/:slug/related", ({ params }) => {
    const { slug } = params;
    const post = mockPosts.find(p => p.slug === slug);

    if (!post || !post.metadata?.tags?.length) {
      return HttpResponse.json([]);
    }

    const tags = post.metadata.tags;
    const relatedPosts = mockPosts
      .filter(
        p => p.slug !== slug && p.metadata?.tags?.some(t => tags.includes(t))
      )
      .slice(0, 3);

    return HttpResponse.json(relatedPosts);
  }),
];
