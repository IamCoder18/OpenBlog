"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="min-h-[70vh] grid place-items-center px-5"
    >
      <div className="text-center max-w-lg">
        <p className="text-primary font-semibold">Something went wrong</p>
        <h1 className="text-4xl font-bold mt-2">
          This page couldn’t be loaded
        </h1>
        <p className="text-on-surface-variant mt-4">
          Your content has not been changed. Try the request again.
        </p>
        {error.digest && (
          <p className="text-xs text-on-surface-variant mt-2">
            Reference: {error.digest}
          </p>
        )}
        <button type="button" onClick={reset} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}
