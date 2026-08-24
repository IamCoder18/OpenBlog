import { getSiteProfile } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const FAVICON_CACHE_CONTROL =
  "private, no-cache, no-store, max-age=0, must-revalidate";

export async function GET(request: Request): Promise<Response> {
  const profile = await getSiteProfile();
  const destination = profile.logoUrl
    ? profile.logoUrl
    : new URL("/default-favicon.ico", request.url).toString();
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": FAVICON_CACHE_CONTROL,
      Location: destination,
    },
  });
}
