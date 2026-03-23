import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function BlogNotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar />

      <main className="flex-1 pt-24 pb-20 max-w-3xl mx-auto px-8 w-full">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <span className="material-symbols-outlined text-8xl text-outline-variant mb-6">
            article
          </span>
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface mb-4">
            Post not found
          </h1>
          <p className="text-on-surface-variant text-lg mb-8 max-w-md">
            This story may have been removed or the link is incorrect.
          </p>
          <Link
            href="/"
            className="editorial-gradient text-on-primary px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-2 transition-all duration-300 hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Feed
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
