"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastContext";

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "You are not authorized to access this page.",
  FORBIDDEN: "You don't have permission to access this resource.",
  dashboard_unauthorized: "You don't have permission to access the dashboard.",
};

function QueryToastInner() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error && ERROR_MESSAGES[error] && shownRef.current !== error) {
      shownRef.current = error;
      addToast("error", ERROR_MESSAGES[error]);
    }
  }, [searchParams, addToast]);

  return null;
}

export default function QueryToast() {
  return (
    <div data-testid="query-toast">
      <Suspense fallback={null}>
        <QueryToastInner />
      </Suspense>
    </div>
  );
}
