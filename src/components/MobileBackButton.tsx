"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function MobileBackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="md:hidden p-2 -ml-2 text-on-surface-variant hover:text-on-surface transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
