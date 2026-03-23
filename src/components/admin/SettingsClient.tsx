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

export default function SettingsClient() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeTheme, setActiveTheme] = useState("default");
  const [blogName] = useState("OpenBlog");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("openblog-theme");
    if (stored) {
      setActiveTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
    void fetchUsers();
    void fetchKeys();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        toast.addToast(
          "error",
          "Could not load users. Please refresh the page."
        );
      }
    } catch {
      toast.addToast("error", "Couldn't connect to the server to load users.");
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys);
      } else {
        toast.addToast(
          "error",
          "Could not load API keys. Please refresh the page."
        );
      }
    } catch {
      toast.addToast(
        "error",
        "Couldn't connect to the server to load API keys."
      );
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
        toast.addToast("success", "API key created successfully.");
        void fetchKeys();
      } else {
        const data = await res.json().catch(() => null);
        toast.addToast("error", data?.error || "Could not create API key.");
      }
    } catch {
      toast.addToast("error", "Couldn't reach the server. Try again.");
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
      } else {
        const data = await res.json().catch(() => null);
        toast.addToast("error", data?.error || "Could not delete API key.");
      }
    } catch {
      toast.addToast("error", "Couldn't reach the server. Try again.");
    }
  };

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("openblog-theme", themeId);
    setSaved(true);
    toast.addToast("success", "Theme updated.");
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
      preview: "linear-gradient(135deg, #0c1222 0%, #131c2e 50%, #0284c7 100%)",
    },
    {
      id: "forest",
      name: "Verdant",
      description:
        "Rich forest greens with emerald accents. Natural and organic.",
      preview: "linear-gradient(135deg, #0a1a0f 0%, #122118 50%, #16a34a 100%)",
    },
    {
      id: "ember",
      name: "Ember",
      description:
        "Warm charcoal with rose and amber tones. Bold and expressive.",
      preview: "linear-gradient(135deg, #1a0f0f 0%, #211616 50%, #e11d48 100%)",
    },
  ];

  return (
    <div className="max-w-4xl space-y-12">
      {/* Site Configuration */}
      <section className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
        <h2 className="font-headline text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            settings
          </span>
          Site Configuration
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
              Blog Name
            </label>
            <div className="w-full max-w-md bg-surface-container rounded-lg px-4 py-3 text-sm text-on-surface border border-outline-variant/10">
              {blogName}
            </div>
            <p className="text-[10px] text-outline mt-2 font-label">
              Read-only. Configure via BLOG_NAME in .env file
            </p>
          </div>
        </div>
      </section>

      {/* Theme Selection */}
      <section className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              palette
            </span>
            Theme Preset
          </h2>
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-label">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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

      {/* User Management */}
      <section className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
        <h2 className="font-headline text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">group</span>
          User Management
        </h2>
        <div className="space-y-3">
          {users.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-surface-container rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.profile?.role === "ADMIN"
                      ? "bg-primary-container text-on-primary-container"
                      : user.profile?.role === "AUTHOR"
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-tertiary/10 text-tertiary"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {user.profile?.role === "ADMIN"
                      ? "account_circle"
                      : user.profile?.role === "AUTHOR"
                        ? "edit_note"
                        : "smart_toy"}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-on-surface">
                    {user.name}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {user.email} &middot; {user._count.posts} posts &middot;{" "}
                    {user._count.apiKeys} API keys
                  </div>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold ${
                  user.profile?.role === "ADMIN"
                    ? "bg-primary/10 text-primary"
                    : user.profile?.role === "AUTHOR"
                      ? "bg-secondary/10 text-secondary"
                      : "bg-tertiary/10 text-tertiary"
                }`}
              >
                {user.profile?.role || "UNKNOWN"}
              </span>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-on-surface-variant text-sm text-center py-8">
              No users found.
            </p>
          )}
        </div>
      </section>

      {/* API Key Management */}
      <section className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">
              vpn_key
            </span>
            API Keys
          </h2>
          <button
            onClick={() => setShowKeys(!showKeys)}
            className="text-xs text-primary hover:underline font-label"
          >
            {showKeys ? "Hide keys" : "Show keys"}
          </button>
        </div>

        {/* Create Key */}
        <div className="flex gap-3 mb-6">
          <input
            className="flex-1 bg-surface-container rounded-lg px-4 py-2.5 text-sm text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-colors"
            placeholder="New API key name..."
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateKey()}
          />
          <button
            onClick={handleCreateKey}
            disabled={creating || !newKeyName.trim()}
            className="editorial-gradient text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
          >
            {creating ? "Creating..." : "Create Key"}
          </button>
        </div>

        <div className="space-y-3">
          {apiKeys.map(key => (
            <div
              key={key.id}
              className="flex items-center justify-between p-4 bg-surface-container rounded-xl"
            >
              <div>
                <div className="text-sm font-semibold text-on-surface">
                  {key.name}
                </div>
                <div className="text-xs text-on-surface-variant font-mono">
                  {showKeys
                    ? key.key
                    : `${key.key.slice(0, 8)}...${key.key.slice(-4)}`}
                </div>
                <div className="text-[10px] text-outline mt-1">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.expiresAt &&
                    ` &middot; Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                </div>
              </div>
              <button
                onClick={() => handleDeleteKey(key.id)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  delete
                </span>
              </button>
            </div>
          ))}
          {apiKeys.length === 0 && (
            <p className="text-on-surface-variant text-sm text-center py-4">
              No API keys yet. Create one to enable programmatic access.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
