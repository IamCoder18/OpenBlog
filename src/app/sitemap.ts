import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
}
