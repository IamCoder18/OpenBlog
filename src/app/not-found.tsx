import { SearchX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-8">
      <div className="text-center">
        <SearchX className="w-20 h-20 text-outline-variant mb-6 mx-auto" />
        <h1 className="font-headline text-6xl font-extrabold tracking-tighter text-on-surface mb-4">
          404
        </h1>
        <p className="text-on-surface-variant text-lg mb-8 max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <a
          href="/"
          className="editorial-gradient text-on-primary px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-2 transition-all duration-300 hover:opacity-90 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </a>
      </div>
    </div>
  );
}
