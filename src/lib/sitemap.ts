import "server-only";

import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  DEFAULT_PUBLICATION_SETTINGS,
  normalizePublicationSettings,
  type PublicationSettings,
} from "@/lib/publication-settings.shared";

export const SITEMAP_MAX_URLS = 50_000;

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const XML_STYLESHEET = '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>';
const PUBLICATION_KEY = "publication_experience";
const SITE_PROFILE_KEY = "site_profile";

export interface SitemapPost {
  id: string;
  slug: string;
  authorId: string;
  updatedAt: Date;
  publishedAt: Date | null;
  metadata: {
    tags: string[];
    coverImage: string | null;
  } | null;
}

export interface SitemapUrl {
  url: string;
  lastModified?: Date;
  images?: string[];
}

export interface SitemapIndexUrl {
  url: string;
  lastModified?: Date;
}

export interface SitemapOverview {
  baseUrl: string;
  posts: SitemapPost[];
  publication: PublicationSettings;
  publicationModifiedAt?: Date;
  siteModifiedAt?: Date;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function validDate(value: Date | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function latestDate(
  values: ReadonlyArray<Date | null | undefined>
): Date | undefined {
  let latest: Date | undefined;
  for (const value of values) {
    if (value && validDate(value) && (!latest || value > latest))
      latest = value;
  }
  return latest;
}

function renderLastModified(lastModified: Date | undefined): string {
  return validDate(lastModified)
    ? `\n<lastmod>${lastModified.toISOString()}</lastmod>`
    : "";
}

export function serializeSitemap(entries: SitemapUrl[]): string {
  const hasImages = entries.some(entry => entry.images?.length);
  const namespace = hasImages
    ? ' xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : ' xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  const urls = entries
    .map(entry => {
      const images = (entry.images ?? [])
        .map(
          image =>
            `\n<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`
        )
        .join("");
      return `<url>\n<loc>${escapeXml(entry.url)}</loc>${renderLastModified(entry.lastModified)}${images}\n</url>`;
    })
    .join("\n");
  return `${XML_HEADER}\n${XML_STYLESHEET}\n<urlset${namespace}>\n${urls}\n</urlset>`;
}

export function serializeSitemapIndex(entries: SitemapIndexUrl[]): string {
  const sitemaps = entries
    .map(
      entry =>
        `<sitemap>\n<loc>${escapeXml(entry.url)}</loc>${renderLastModified(entry.lastModified)}\n</sitemap>`
    )
    .join("\n");
  return `${XML_HEADER}\n${XML_STYLESHEET}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps}\n</sitemapindex>`;
}

export function sitemapResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function publicImageUrl(value: string | null, baseUrl: string): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), `${baseUrl}/`);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function buildPostEntries(
  baseUrl: string,
  posts: SitemapPost[]
): SitemapUrl[] {
  return posts.map(post => {
    const image = publicImageUrl(post.metadata?.coverImage ?? null, baseUrl);
    return {
      url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
      lastModified: post.updatedAt,
      ...(image ? { images: [image] } : {}),
    };
  });
}

export function buildSiteEntries({
  baseUrl,
  posts,
  publication,
  publicationModifiedAt,
  siteModifiedAt,
}: SitemapOverview): SitemapUrl[] {
  const latestPost = latestDate(posts.map(post => post.updatedAt));
  const collectionModifiedAt = latestDate([
    latestPost,
    publicationModifiedAt,
    siteModifiedAt,
  ]);
  const authors = new Map<string, Date>();
  const topics = new Map<string, Date>();

  for (const post of posts) {
    const authorDate = authors.get(post.authorId);
    if (!authorDate || post.updatedAt > authorDate)
      authors.set(post.authorId, post.updatedAt);
    for (const rawTag of post.metadata?.tags ?? []) {
      const tag = rawTag.trim();
      if (!tag) continue;
      const topicDate = topics.get(tag);
      if (!topicDate || post.updatedAt > topicDate)
        topics.set(tag, post.updatedAt);
    }
  }

  const pages = (["about", "contact", "privacy", "terms"] as const)
    .filter(key => publication.pages[key].enabled)
    .map(key => ({
      url: `${baseUrl}/${key}`,
      ...(publicationModifiedAt ? { lastModified: publicationModifiedAt } : {}),
    }));
  const authorEntries = [...authors.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([id, lastModified]) => ({
      url: `${baseUrl}/authors/${encodeURIComponent(id)}`,
      lastModified,
    }));
  const topicEntries = [...topics.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([tag, lastModified]) => ({
      url: `${baseUrl}/topics/${encodeURIComponent(tag)}`,
      lastModified,
    }));

  return [
    {
      url: baseUrl,
      ...(collectionModifiedAt ? { lastModified: collectionModifiedAt } : {}),
    },
    {
      url: `${baseUrl}/explore`,
      ...(collectionModifiedAt ? { lastModified: collectionModifiedAt } : {}),
    },
    ...pages,
    ...authorEntries,
    ...topicEntries,
  ];
}

export function partition<T>(values: T[]): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += SITEMAP_MAX_URLS)
    chunks.push(values.slice(index, index + SITEMAP_MAX_URLS));
  return chunks;
}

export function buildSitemapIndex(
  overview: SitemapOverview
): SitemapIndexUrl[] {
  const siteChunks = partition(buildSiteEntries(overview));
  const postChunks = partition(overview.posts);
  const entries: SitemapIndexUrl[] = [];

  siteChunks.forEach((chunk, index) => {
    entries.push({
      url: `${overview.baseUrl}/sitemaps/site-${index + 1}.xml`,
      lastModified: latestDate(chunk.map(entry => entry.lastModified)),
    });
  });
  postChunks.forEach((chunk, index) => {
    entries.push({
      url: `${overview.baseUrl}/sitemaps/posts-${index + 1}.xml`,
      lastModified: latestDate(chunk.map(post => post.updatedAt)),
    });
  });

  if (entries.length > SITEMAP_MAX_URLS)
    throw new Error("Sitemap index exceeds the protocol limit");
  return entries;
}

function parsePublication(value: string | undefined): PublicationSettings {
  if (!value) return DEFAULT_PUBLICATION_SETTINGS;
  try {
    return normalizePublicationSettings(JSON.parse(value));
  } catch {
    return DEFAULT_PUBLICATION_SETTINGS;
  }
}

export async function loadSitemapOverview(): Promise<SitemapOverview> {
  const [posts, settings] = await Promise.all([
    prisma.post.findMany({
      where: { visibility: "PUBLIC" },
      orderBy: { id: "asc" },
      select: {
        id: true,
        slug: true,
        authorId: true,
        updatedAt: true,
        publishedAt: true,
        metadata: { select: { tags: true, coverImage: true } },
      },
    }),
    prisma.siteSettings.findMany({
      where: { key: { in: [PUBLICATION_KEY, SITE_PROFILE_KEY] } },
      select: { key: true, value: true, updatedAt: true },
    }),
  ]);
  const publication = settings.find(setting => setting.key === PUBLICATION_KEY);
  const siteProfile = settings.find(
    setting => setting.key === SITE_PROFILE_KEY
  );

  return {
    baseUrl: config.BASE_URL,
    posts,
    publication: parsePublication(publication?.value),
    publicationModifiedAt: publication?.updatedAt,
    siteModifiedAt: siteProfile?.updatedAt,
  };
}

export async function loadPostSitemapPage(page: number): Promise<SitemapUrl[]> {
  const posts = await prisma.post.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { id: "asc" },
    skip: page * SITEMAP_MAX_URLS,
    take: SITEMAP_MAX_URLS,
    select: {
      id: true,
      slug: true,
      authorId: true,
      updatedAt: true,
      publishedAt: true,
      metadata: { select: { tags: true, coverImage: true } },
    },
  });
  return buildPostEntries(config.BASE_URL, posts);
}
