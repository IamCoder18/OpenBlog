import { SearchX, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-[0_24px_70px_rgba(28,32,51,0.1)] sm:p-12">
        <span className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <SearchX className="size-7" />
        </span>
        <p className="eyebrow">404 · Lost page</p>
        <h1 className="mt-3 font-headline text-4xl font-extrabold tracking-[-0.05em] text-on-surface sm:text-5xl">
          This idea wandered off.
        </h1>
        <p className="mx-auto mb-8 mt-4 max-w-md text-lg text-on-surface-variant">
          The page may have moved, but there are plenty of stories waiting back
          at the publication.
        </p>
        <Link href="/" className="btn-primary">
          <ArrowLeft className="w-5 h-5" />
          Back to stories
        </Link>
      </div>
    </div>
  );
}
