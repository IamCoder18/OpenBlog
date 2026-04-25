"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function DesktopBackLink() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const ref = document.referrer;
    if (!ref) return;

    const url = new URL(ref, window.location.origin);
    if (url.origin !== window.location.origin) return;

    const path = url.pathname;
    if (path === "/explore") {
      setLabel("Back to Explore");
    } else if (path === "/") {
      setLabel("Back to Feed");
    } else if (path.startsWith("/dashboard")) {
      setLabel("Back to Dashboard");
    } else {
      setLabel("Back");
    }
  }, []);

  if (!label) return null;

    return (
      <Link
        href="/"
        className="hidden md:inline-flex items-center gap-2 px-0 py-2 text-primary text-sm font-medium mb-8 font-label hover:opacity-80 transition-opacity"
      >
        <ArrowLeft className="w-5 h-5" />
        {label}
      </Link>
    );
}
