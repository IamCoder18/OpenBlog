import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const posts = await prisma.post.findMany({
      where: {
        visibility: "PUBLIC",
      },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    const baseUrl = config.BASE_URL;

    const postUrls = posts.map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt || post.publishedAt || new Date(),
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
      },
      ...postUrls,
    ];
  } catch (error) {
    // Fallback for when database is not available (e.g., during build)
    console.warn("Database not available for sitemap generation, using fallback");
    const baseUrl = config.BASE_URL;
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
      },
    ];
  }
}
