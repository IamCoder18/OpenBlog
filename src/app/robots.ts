import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { config } from "@/lib/config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/dashboard/", "/agent/"],
    },
    sitemap: `${config.BASE_URL}/sitemap.xml`,
  };
}
