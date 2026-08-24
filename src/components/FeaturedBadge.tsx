import { Sparkles } from "lucide-react";

export default function FeaturedBadge({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`featured-badge inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-sm ${className}`}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      Featured
    </span>
  );
}
