"use client";

import { useEffect, useState } from "react";

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const available =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(
        available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent"
    >
      <div
        className="h-full origin-left bg-primary transition-transform duration-150"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
