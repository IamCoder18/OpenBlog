export default function Loading() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      className="max-w-7xl mx-auto px-5 pt-28 pb-20"
    >
      <span className="sr-only">Loading page</span>
      <div className="h-12 w-2/3 rounded-xl bg-surface-container animate-pulse" />
      <div className="mt-10 grid md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-64 rounded-xl bg-surface-container-low animate-pulse"
          />
        ))}
      </div>
    </main>
  );
}
