"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Mode = "light" | "dark" | "system";

function readStored(): Mode | null {
  const v = localStorage.getItem("openblog-color-mode");
  return v === "light" || v === "dark" ? v : null;
}

export default function ColorModeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    setMode(readStored() ?? "system");
  }, []);

  function toggle() {
    const stored = readStored() ?? "system";
    const next: Mode = stored === "dark" ? "light" : "dark";
    setMode(next);
    localStorage.setItem("openblog-color-mode", next);
    document.documentElement.dataset.colorMode = next;
  }

  const effective =
    mode === "system"
      ? typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  const Icon = effective === "dark" ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid min-h-11 min-w-11 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
      aria-label={`Color mode: ${mode}. Toggle color mode`}
      title={`Color mode: ${mode}`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
