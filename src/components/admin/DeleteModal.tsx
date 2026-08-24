"use client";

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteModal({
  title,
  onConfirm,
  onCancel,
  pending = false,
  error = "",
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  error?: string;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previous.current = document.activeElement as HTMLElement;
    cancelRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
      if (event.key === "Tab" && dialogRef.current) {
        const items = [
          ...dialogRef.current.querySelectorAll<HTMLElement>(
            "button:not(:disabled)"
          ),
        ];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous.current?.focus();
    };
  }, [onCancel, pending]);
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center p-4 bg-black/60">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        className="bg-surface-container rounded-2xl max-w-md w-full p-6 shadow-2xl"
      >
        <div className="flex gap-3 items-center">
          <Trash2 className="theme-danger-text" />
          <h2 id="delete-title" className="text-xl font-bold">
            Delete story
          </h2>
        </div>
        <p id="delete-description" className="mt-4 text-on-surface-variant">
          Permanently delete “{title}”? This cannot be undone.
        </p>
        {error && (
          <p role="alert" className="mt-3 theme-danger-text">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="theme-danger-soft theme-danger-text px-5 rounded-lg font-semibold"
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
