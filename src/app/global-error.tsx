"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen grid place-items-center bg-surface px-5 text-on-surface">
          <div className="max-w-lg text-center">
            <p className="font-semibold text-primary">Unexpected error</p>
            <h1 className="mt-2 text-4xl font-bold">
              OpenBlog could not start
            </h1>
            <p className="mt-4 text-on-surface-variant">
              Nothing has been changed. Retry the page, or return later if the
              service is being restored.
            </p>
            <button type="button" onClick={reset} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
