import { connection } from "next/server";
import {
  buildSiteEntries,
  loadPostSitemapPage,
  loadSitemapOverview,
  partition,
  serializeSitemap,
  sitemapResponse,
  type SitemapUrl,
} from "@/lib/sitemap";

interface SitemapPartContext {
  params: Promise<{ part: string }>;
}

function partNumber(value: string, kind: "site" | "posts"): number | null {
  const match = new RegExp(`^${kind}-(\\d+)\\.xml$`).exec(value);
  if (!match) return null;
  const number = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(number) && number > 0 ? number - 1 : null;
}

export async function GET(
  _request: Request,
  context: SitemapPartContext
): Promise<Response> {
  await connection();
  const { part } = await context.params;
  const sitePage = partNumber(part, "site");
  const postPage = partNumber(part, "posts");

  let entries: SitemapUrl[] | undefined;
  if (sitePage !== null) {
    const overview = await loadSitemapOverview();
    entries = partition(buildSiteEntries(overview))[sitePage];
  } else if (postPage !== null) {
    entries = await loadPostSitemapPage(postPage);
  }

  if (!entries?.length)
    return new Response("Sitemap part not found", { status: 404 });
  return sitemapResponse(serializeSitemap(entries));
}
