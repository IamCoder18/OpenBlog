"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function MobileBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;
  const destination = pathname.startsWith("/blog/") ? "/explore" : "/";

  return (
    <button
      onClick={() => router.push(destination)}
      className="md:hidden min-w-11 min-h-11 -ml-2 text-on-surface-variant hover:text-on-surface transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
