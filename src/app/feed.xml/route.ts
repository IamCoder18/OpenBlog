import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export async function GET() {
  const posts = await prisma.post.findMany({
    where: {
      visibility: "PUBLIC",
    },
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 20,
  });

  const baseUrl = config.BASE_URL;
  const blogName = config.BLOG_NAME;

  const items = posts
    .map(post => {
      const pubDate = post.publishedAt
        ? post.publishedAt.toUTCString()
        : new Date().toUTCString();

      return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <description><![CDATA[${post.bodyMarkdown?.slice(0, 200) || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${post.author?.name || "Unknown"}</author>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${blogName}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${blogName} RSS Feed]]></description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
