"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ToastContext";
import {
  Calendar,
  ChevronDown,
  Check,
  CalendarRange,
  RefreshCw,
} from "lucide-react";

interface ViewsByDay {
  date: string;
  views: number;
}

interface AnalyticsData {
  totalViews: number;
  viewsByDay: ViewsByDay[];
  period: { days: number; from: string };
}

type DateRange = "7d" | "30d" | "90d" | "custom";

const RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  custom: "Custom range",
};

export default function DateRangeSelector() {
  const toast = useToast();
  const [range, setRange] = useState<DateRange>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

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
    if (range === "custom") return;
    void fetchAnalytics(
      `days=${range === "7d" ? 7 : range === "90d" ? 90 : 30}`
    );
  }, [range, fetchAnalytics]);

  const handleCustomApply = () => {
    if (!customFrom || !customTo) return;
    setShowCustom(false);
    setShowDropdown(false);
    void fetchAnalytics(`from=${customFrom}&to=${customTo}`);
  };

  const maxViews = Math.max(...(data?.viewsByDay.map(d => d.views) || [1]), 1);
  const barHeights =
    data?.viewsByDay.map(d => Math.max(5, (d.views / maxViews) * 100)) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart */}
      <div className="lg:col-span-2 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface">
              Page views
            </h3>
            <p className="text-xs text-on-surface-variant">
              {data?.period.days ?? 30} day trend
            </p>
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant/10 hover:border-outline-variant/20 transition-colors text-xs"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {range === "custom" && customFrom
                  ? `${customFrom} - ${customTo}`
                  : RANGE_LABELS[range]}
              </span>
              <ChevronDown className="w-4 h-4 text-on-surface-variant" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface-container rounded-xl border border-outline-variant/10 shadow-xl z-50 overflow-hidden animate-scale-in">
                {(["7d", "30d", "90d"] as DateRange[]).map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setRange(r);
                      setShowDropdown(false);
                      setShowCustom(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-surface-container-high transition-colors flex items-center gap-2 ${
                      range === r ? "text-primary" : "text-on-surface"
                    }`}
                  >
                    {range === r && <Check className="w-4 h-4" />}
                    <span className={range === r ? "" : "ml-6"}>
                      {RANGE_LABELS[r]}
                    </span>
                  </button>
                ))}
                <div className="border-t border-outline-variant/10">
                  <button
                    onClick={() => {
                      setRange("custom");
                      setShowCustom(!showCustom);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2"
                  >
                    <CalendarRange className="w-4 h-4 text-on-surface-variant" />
                    Custom range
                  </button>
                  {showCustom && (
                    <div className="px-4 pb-3 space-y-2">
                      <input
                        type="date"
                        value={customFrom}
                        onChange={e => setCustomFrom(e.target.value)}
                        className="w-full bg-surface-container-low rounded-lg px-3 py-1.5 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none"
                      />
                      <input
                        type="date"
                        value={customTo}
                        onChange={e => setCustomTo(e.target.value)}
                        className="w-full bg-surface-container-low rounded-lg px-3 py-1.5 text-xs text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none"
                      />
                      <button
                        onClick={handleCustomApply}
                        disabled={!customFrom || !customTo}
                        className="w-full editorial-gradient text-on-primary px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="relative h-48 w-full flex items-end gap-1 overflow-hidden">
          {loading ? (
            <div className="w-full flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : barHeights.length > 0 ? (
            barHeights.map((h, i) => (
              <div
                key={i}
                className="w-full bg-primary/20 rounded-t border-t-2 border-primary relative group cursor-pointer hover:bg-primary/30 transition-colors"
                style={{ height: `${h}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest px-2 py-0.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {data?.viewsByDay[i]?.views ?? 0}
                </div>
              </div>
            ))
          ) : (
            <div className="w-full flex items-center justify-center text-on-surface-variant text-sm h-full">
              No views in this period
            </div>
          )}
        </div>

        {/* Day Labels */}
        {data && data.viewsByDay.length > 0 && (
          <div className="flex justify-between mt-2 text-[9px] text-on-surface-variant font-medium uppercase tracking-widest font-label px-1">
            {data.viewsByDay
              .filter((_, i) => i % Math.ceil(data.viewsByDay.length / 7) === 0)
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

      {/* Insights */}
      <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 flex flex-col">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-6">
          Summary
        </h3>
        <div className="space-y-4 flex-1">
          <div className="p-4 rounded-xl bg-surface-container">
            <div className="text-xs text-on-surface-variant font-label uppercase tracking-wider mb-1">
              Total views
            </div>
            <div className="text-2xl font-bold font-headline text-on-surface">
              {loading ? "..." : (data?.totalViews ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-surface-container">
            <div className="text-xs text-on-surface-variant font-label uppercase tracking-wider mb-1">
              Daily average
            </div>
            <div className="text-2xl font-bold font-headline text-on-surface">
              {loading
                ? "..."
                : data
                  ? Math.round(
                      data.totalViews / Math.max(data.period.days, 1)
                    ).toLocaleString()
                  : "0"}
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl border border-primary/10 bg-primary/5">
          <p className="text-xs text-secondary leading-relaxed font-medium">
            {data && data.totalViews > 0
              ? `${data.totalViews} views over ${data.period.days} days`
              : "No views recorded in this period"}
          </p>
        </div>
      </div>
    </div>
  );
}
