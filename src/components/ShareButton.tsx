"use client";

import { useState, useRef, useEffect } from "react";

interface ShareButtonProps {
  title: string;
  slug: string;
}

export default function ShareButton({ title, slug }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/blog/${slug}`
      : `/blog/${slug}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-all"
        aria-label="Share"
      >
        <span className="material-symbols-outlined text-lg">share</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={popoverRef}
            className="absolute right-0 top-full mt-2 w-72 bg-surface-container rounded-2xl border border-outline-variant/15 shadow-2xl z-50 animate-scale-in overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">
                    share
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    Share story
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/10">
                <span className="material-symbols-outlined text-sm text-on-surface-variant flex-shrink-0">
                  link
                </span>
                <span className="text-xs text-on-surface-variant truncate flex-1 font-mono">
                  {url}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className={`w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  copied
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "editorial-gradient text-on-primary"
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {copied ? "check_circle" : "content_copy"}
                </span>
                {copied ? "Link copied!" : "Copy to clipboard"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
