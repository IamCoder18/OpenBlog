"use client";

export default function DeleteModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 theme-danger-soft rounded-lg">
            <span className="material-symbols-outlined theme-danger-text">
              delete
            </span>
          </div>
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Delete story
          </h3>
        </div>
        <p className="text-sm text-on-surface-variant mb-6">
          Are you sure you want to delete{" "}
          <span className="text-on-surface font-semibold">
            &quot;{title}&quot;
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-on-surface rounded-lg border border-outline-variant/20 hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold theme-danger-soft theme-danger-text rounded-lg border border-current/15 hover:opacity-90 transition-colors active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
