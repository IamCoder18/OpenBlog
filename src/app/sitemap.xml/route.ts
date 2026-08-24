import { connection } from "next/server";
import {
  buildSitemapIndex,
  loadSitemapOverview,
  serializeSitemapIndex,
  sitemapResponse,
} from "@/lib/sitemap";

export async function GET(): Promise<Response> {
  await connection();
  const overview = await loadSitemapOverview();
  return sitemapResponse(serializeSitemapIndex(buildSitemapIndex(overview)));
}
