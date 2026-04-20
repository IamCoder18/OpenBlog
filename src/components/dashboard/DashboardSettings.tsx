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

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  profile: { role: string } | null;
  _count: { posts: number; apiKeys: number };
}

export default function DashboardSettings({
  scope,
}: {
  scope: "personal" | "site";
}) {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeTheme, setActiveTheme] = useState("default");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (scope === "site") void fetchTheme();
    if (scope === "site") void fetchUsers();
    void fetchKeys();
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTheme = async () => {
    try {
      const res = await fetch("/api/settings/theme");
      if (res.ok) {
        const data = await res.json();
        setActiveTheme(data.theme);
        document.documentElement.setAttribute("data-theme", data.theme);
        localStorage.setItem("openblog-theme", data.theme);
      }
    } catch {
      const stored = localStorage.getItem("openblog-theme");
      if (stored) {
        setActiveTheme(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        toast.addToast("error", "Could not load users.");
      }
    } catch {
      toast.addToast("error", "Couldn't connect to load users.");
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys);
      }
    } catch {
      toast.addToast("error", "Couldn't load API keys.");
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

  const handleThemeChange = async (themeId: string) => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("openblog-theme", themeId);
    setSaved(true);

    try {
      const res = await fetch("/api/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeId }),
      });
      if (res.ok) {
        toast.addToast("success", "Theme updated.");
      } else {
        const data = await res.json().catch(() => null);
        toast.addToast("error", data?.error || "Could not save theme.");
      }
    } catch {
      toast.addToast(
        "error",
        "Couldn't reach the server. Theme saved locally."
      );
    }

    setTimeout(() => setSaved(false), 2000);
  };

  const themes = [
    {
      id: "default",
      name: "Luminal",
      description:
        "Deep obsidian with violet accents. The signature editorial aesthetic.",
      preview: "linear-gradient(135deg, #131315 0%, #201f21 50%, #7c3aed 100%)",
    },
    {
      id: "ocean",
      name: "Abyssal",
      description:
        "Deep ocean blues with cyan highlights. Cool and professional.",
      preview: "linear-gradient(135deg, #07141f 0%, #102131 50%, #0284c7 100%)",
    },
    {
      id: "forest",
      name: "Verdant",
      description:
        "Rich forest greens with emerald accents. Natural and organic.",
      preview: "linear-gradient(135deg, #08140c 0%, #122318 50%, #16a34a 100%)",
    },
    {
      id: "ember",
      name: "Ember",
      description:
        "Warm charcoal with rose and amber tones. Bold and expressive.",
      preview: "linear-gradient(135deg, #160b0b 0%, #241515 50%, #e11d48 100%)",
    },
  ];

  const roleIcon = (role: string) => {
    if (role === "ADMIN") return "account_circle";
    if (role === "AUTHOR") return "edit_note";
    return "smart_toy";
  };

  const roleColor = (role: string) => {
    if (role === "ADMIN")
      return {
        bg: "bg-primary/10",
        text: "text-primary",
        avatarBg: "bg-primary-container",
        avatarText: "text-on-primary-container",
      };
    if (role === "AUTHOR")
      return {
        bg: "bg-secondary/10",
        text: "text-secondary",
        avatarBg: "bg-secondary-container",
        avatarText: "text-on-secondary-container",
      };
    return {
      bg: "bg-tertiary/10",
      text: "text-tertiary",
      avatarBg: "bg-tertiary/10",
      avatarText: "text-tertiary",
    };
  };

  return (
    <div className="space-y-8">
      {scope === "site" && (
        <section className="bg-surface-container-low rounded-2xl p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">
                palette
              </span>
              Theme Preset
            </h2>
            {saved && (
              <span className="text-xs theme-success-text flex items-center gap-1 font-label">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Theme updated
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`text-left p-5 rounded-xl transition-all duration-300 border ${
                  activeTheme === theme.id
                    ? "bg-surface-container border-primary/30 shadow-lg shadow-primary/5"
                    : "bg-surface-container-low border-outline-variant/5 hover:border-outline-variant/20 hover:bg-surface-container"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex-shrink-0"
                    style={{ background: theme.preview }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-on-surface font-headline">
                        {theme.name}
                      </span>
                      {activeTheme === theme.id && (
                        <span className="material-symbols-outlined text-primary text-lg">
                          check_circle
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {theme.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* User Management (admin only) */}
      {scope === "site" && (
        <section className="bg-surface-container-low rounded-2xl p-6 lg:p-8">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">
              group
            </span>
            Users
          </h2>
          <div className="space-y-2">
            {users.map(user => {
              const colors = roleColor(user.profile?.role ?? "");
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-surface-container rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colors.avatarBg}`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${colors.avatarText}`}
                      >
                        {roleIcon(user.profile?.role ?? "")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-on-surface truncate">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-on-surface-variant truncate">
                        {user.email} &middot; {user._count.posts} posts
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[9px] uppercase tracking-wider rounded-full font-bold flex-shrink-0 ${colors.bg} ${colors.text}`}
                  >
                    {user.profile?.role || "UNKNOWN"}
                  </span>
                </div>
              );
            })}
            {users.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-6">
                No users found.
              </p>
            )}
          </div>
        </section>
      )}

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

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
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
            {creating ? "..." : "Create"}
          </button>
        </div>

        <div className="space-y-2">
          {apiKeys.map(key => (
            <div
              key={key.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-surface-container rounded-xl"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-on-surface">
                  {key.name}
                </div>
                <div className="text-xs text-on-surface-variant font-mono break-all">
                  {showKeys
                    ? key.key
                    : `${key.key.slice(0, 8)}...${key.key.slice(-4)}`}
                </div>
              </div>
              <button
                onClick={() => handleDeleteKey(key.id)}
                className="p-2 rounded-lg theme-danger-soft text-on-surface-variant hover:theme-danger-text transition-colors flex-shrink-0 self-end sm:self-auto"
              >
                <span className="material-symbols-outlined text-sm">
                  delete
                </span>
              </button>
            </div>
          ))}
          {apiKeys.length === 0 && (
            <p className="text-on-surface-variant text-xs text-center py-4">
              No API keys yet.
            </p>
          )}
        </div>
      </section>

      {/* SEO & Discovery */}
      <section className="bg-surface-container-low rounded-2xl p-6 lg:p-8">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">
            search
          </span>
          SEO & Discovery
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-lg">
                map
              </span>
              <span className="text-sm font-semibold text-on-surface">
                Sitemap
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Auto-generated XML sitemap for search engines.
            </p>
          </a>
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-tertiary text-lg">
                rss_feed
              </span>
              <span className="text-sm font-semibold text-on-surface">
                RSS Feed
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              RSS feed for content syndication.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
