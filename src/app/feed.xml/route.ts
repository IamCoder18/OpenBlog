import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { stripMarkdown } from "@/lib/strip-markdown";

function cdata(value: string) {
  return value.replaceAll("]]>", "]]]]><![CDATA[>");
}

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
      metadata: { select: { tags: true } },
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
      <title><![CDATA[${cdata(post.title)}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${cdata(stripMarkdown(post.bodyMarkdown, 300))}]]></description>
      <pubDate>${pubDate}</pubDate>
      <dc:creator><![CDATA[${cdata(post.author?.name || "Unknown")}]]></dc:creator>
      ${(post.metadata?.tags ?? []).map(tag => `<category><![CDATA[${cdata(tag)}]]></category>`).join("\n      ")}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title><![CDATA[${blogName}]]></title>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <description><![CDATA[${blogName} RSS Feed]]></description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
