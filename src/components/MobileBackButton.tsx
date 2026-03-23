"use client";

import { useRouter } from "next/navigation";

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
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  );
}
