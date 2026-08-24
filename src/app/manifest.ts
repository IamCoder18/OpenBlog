import type { MetadataRoute } from "next";
import { getSiteProfile } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const profile = await getSiteProfile();

  return {
    name: profile.name,
    short_name: profile.name,
    description: profile.description,
    start_url: "/",
    display: "standalone",
    background_color: "#131315",
    theme_color: "#131315",
    icons: [{ src: "/favicon.ico", sizes: "any" }],
  };
}
