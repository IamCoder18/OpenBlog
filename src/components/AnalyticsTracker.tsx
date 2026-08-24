"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    const match = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
    if (!match) return;
    lastPath.current = pathname;

    const track = async () => {
      try {
        const postResponse = await fetch(
          `/api/posts/${encodeURIComponent(match[1])}`
        );
        if (!postResponse.ok) return;
        const post = (await postResponse.json()) as { id: string };

        await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            referrer: document.referrer || null,
            postId: post.id,
          }),
        });
      } catch {
        // Silently fail analytics - non-critical
      }
    };

    void track();
  }, [pathname]);

  return null;
}
