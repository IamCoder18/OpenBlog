import { config } from "@/lib/config";

interface FooterProps {
  className?: string;
  blogName?: string;
}

export default function Footer({ className = "", blogName }: FooterProps) {
  const name = blogName || config.BLOG_NAME;
  return (
    <footer
      className={`w-full pt-12 pb-24 md:py-12 px-8 bg-zinc-950 border-t border-zinc-800/30 ${className}`}
    >
      <div className="max-w-7xl mx-auto text-center">
        <p className="font-body text-xs uppercase tracking-widest text-zinc-500 opacity-80">
          &copy; {new Date().getFullYear()} {name}
        </p>
      </div>
    </footer>
  );
}
