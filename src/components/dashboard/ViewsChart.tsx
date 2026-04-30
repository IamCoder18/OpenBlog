"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ToastContext";
import { RefreshCw, BarChart3 } from "lucide-react";

interface ViewsByDay {
  date: string;
  views: number;
}

interface AnalyticsData {
  totalViews: number;
  viewsByDay: ViewsByDay[];
  topPaths: Array<{ path: string; views: number }>;
  period: { days: number; from: string };
}

type DateRange = "7d" | "30d" | "90d";

const RANGE_LABELS: Record<DateRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export default function ViewsChart({ postId }: { postId?: string }) {
  const toast = useToast();
  const [range, setRange] = useState<DateRange>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(
    async (params: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?${params}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch {
        toast.addToast("error", "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    const params = new URLSearchParams({
      days: range === "7d" ? "7" : range === "90d" ? "90" : "30",
    });
    if (postId) params.set("postId", postId);
    void fetchAnalytics(params.toString());
  }, [range, postId, fetchAnalytics]);

  const maxViews = Math.max(...(data?.viewsByDay.map(d => d.views) || [1]), 1);
  const barHeights =
    data?.viewsByDay.map(d => Math.max(4, (d.views / maxViews) * 100)) || [];

  const dailyAvg = data
    ? Math.round(data.totalViews / Math.max(data.period.days, 1))
    : 0;

  return (
    <div
      data-testid="views-chart"
      className="bg-surface-container-low rounded-2xl p-6 lg:p-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Page Views
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Traffic over the last {RANGE_LABELS[range]}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1">
          {(["7d", "30d", "90d"] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                range === r
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div className="bg-surface-container rounded-xl p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] text-on-surface-variant font-label uppercase tracking-wider mb-1">
            Total Views
          </div>
          <div className="text-xl sm:text-2xl font-bold font-headline text-on-surface">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-surface-container-highest rounded animate-pulse" />
            ) : (
              (data?.totalViews ?? 0).toLocaleString()
            )}
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] text-on-surface-variant font-label uppercase tracking-wider mb-1">
            Daily Average
          </div>
          <div className="text-xl sm:text-2xl font-bold font-headline text-on-surface">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-surface-container-highest rounded animate-pulse" />
            ) : (
              dailyAvg.toLocaleString()
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-40 w-full flex items-end gap-[3px] overflow-hidden">
        {loading ? (
          <div className="w-full flex items-center justify-center h-full">
            <RefreshCw className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : barHeights.length > 0 ? (
          barHeights.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/15 rounded-t-sm hover:bg-primary/30 transition-colors relative group cursor-pointer"
              style={{ height: `${h}%` }}
            >
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-surface-container-highest px-2.5 py-1 rounded-lg text-[10px] text-on-surface opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                <div className="font-semibold">
                  {data?.viewsByDay[i]?.views ?? 0} views
                </div>
                <div className="text-on-surface-variant">
                  {data?.viewsByDay[i]?.date
                    ? new Date(data.viewsByDay[i].date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )
                    : ""}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="w-full flex flex-col items-center justify-center text-on-surface-variant h-full gap-2">
            <BarChart3 className="w-10 h-10 text-outline-variant" />
            <span className="text-xs">No views in this period</span>
          </div>
        )}
      </div>

      {/* Day labels */}
      {data && data.viewsByDay.length > 0 && (
        <div className="flex justify-between mt-3 text-[8px] sm:text-[9px] text-on-surface-variant/70 font-medium uppercase tracking-widest font-label px-1">
          {data.viewsByDay
            .filter(
              (_, i) =>
                i % Math.max(1, Math.ceil(data.viewsByDay.length / 4)) === 0
            )
            .map((d, i) => (
              <span key={i}>
                {new Date(d.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
