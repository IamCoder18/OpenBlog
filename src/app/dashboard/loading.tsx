import { RefreshCw } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <RefreshCw className="w-10 h-10 text-primary animate-spin" />
    </div>
  );
}
