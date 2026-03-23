"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastContext";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
}

export default function AgentApiKeys() {
  const toast = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchKeys();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys);
      } else {
        toast.addToast("error", "Could not load API keys.");
      }
    } catch {
      toast.addToast("error", "Couldn't load API keys.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        setNewKeyName("");
        toast.addToast("success", "API key created.");
        void fetchKeys();
      } else {
        const data = await res.json().catch(() => null);
        toast.addToast("error", data?.error || "Could not create key.");
      }
    } catch {
      toast.addToast("error", "Couldn't reach the server.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.addToast("success", "API key deleted.");
        void fetchKeys();
      }
    } catch {
      toast.addToast("error", "Couldn't reach the server.");
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-8">
      {/* API Keys */}
      <section className="bg-surface-container-low rounded-2xl p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-xl">
              vpn_key
            </span>
            API Keys
          </h2>
          <button
            onClick={() => setShowKeys(!showKeys)}
            className="text-xs text-primary hover:underline font-label"
          >
            {showKeys ? "Hide" : "Show"}
          </button>
        </div>

        <p className="text-sm text-on-surface-variant mb-6">
          API keys allow programmatic access to the blog API. Use them in the{" "}
          <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded font-mono">
            Authorization: Bearer &lt;key&gt;
          </code>{" "}
          header.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            className="flex-1 bg-surface-container rounded-lg px-4 py-2.5 text-sm text-on-surface border-none outline-none focus:ring-1 focus:ring-primary/30 transition-shadow"
            placeholder="Key name..."
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateKey()}
          />
          <button
            onClick={handleCreateKey}
            disabled={creating || !newKeyName.trim()}
            className="editorial-gradient text-on-primary px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all active:scale-95 flex-shrink-0"
          >
            {creating ? "..." : "Create Key"}
          </button>
        </div>

        {loading ? (
          <p className="text-on-surface-variant text-xs text-center py-6">
            Loading...
          </p>
        ) : (
          <div className="space-y-2">
            {apiKeys.map(key => (
              <div
                key={key.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 bg-surface-container rounded-xl"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">
                      {key.name}
                    </span>
                    {isExpired(key.expiresAt) && (
                      <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider rounded-full font-bold bg-red-500/10 text-red-400">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-on-surface-variant font-mono break-all mt-1">
                    {showKeys
                      ? key.key
                      : `${key.key.slice(0, 8)}...${key.key.slice(-4)}`}
                  </div>
                  <div className="text-[11px] text-on-surface-variant/70 mt-1">
                    Created{" "}
                    {new Date(key.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {key.expiresAt && (
                      <>
                        {" "}
                        &middot; Expires{" "}
                        {new Date(key.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 transition-colors flex-shrink-0 self-end sm:self-auto"
                >
                  <span className="material-symbols-outlined text-sm">
                    delete
                  </span>
                </button>
              </div>
            ))}
            {apiKeys.length === 0 && (
              <p className="text-on-surface-variant text-xs text-center py-6">
                No API keys yet. Create one above to get started.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
