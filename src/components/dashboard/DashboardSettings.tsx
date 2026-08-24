"use client";

import { useEffect, useState } from "react";
import AgentApiKeys from "@/components/agent/AgentApiKeys";
import ColorModeToggle from "@/components/ColorModeToggle";
import { useToast } from "@/components/ToastContext";
import PublicationSettingsPanel from "@/components/dashboard/PublicationSettingsPanel";

interface User {
  id: string;
  name: string;
  email: string;
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
  const [userQuery, setUserQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(scope === "site");
  const [usersError, setUsersError] = useState("");
  const [site, setSite] = useState({
    name: "",
    description: "",
    logoUrl: "",
    contactEmail: "",
    socialUrl: "",
  });
  const [siteOverrides, setSiteOverrides] = useState({
    name: false,
    description: false,
    logoUrl: false,
    contactEmail: false,
    socialUrl: false,
  });
  const [siteSaving, setSiteSaving] = useState(false);
  useEffect(() => {
    if (scope !== "site") return;
    void Promise.all([
      fetch("/api/settings/site").then(async response => {
        if (!response.ok) return;
        const data = await response.json();
        setSite(data.profile ?? data);
        if (data.overrides) setSiteOverrides(data.overrides);
      }),
      fetch("/api/users")
        .then(async response => {
          if (!response.ok) throw new Error();
          setUsers((await response.json()).users);
        })
        .catch(() => setUsersError("Users couldn’t be loaded."))
        .finally(() => setUsersLoading(false)),
    ]);
  }, [scope]);
  async function saveSite(event: React.FormEvent) {
    event.preventDefault();
    setSiteSaving(true);
    try {
      const payload = { ...site };
      (Object.keys(siteOverrides) as Array<keyof typeof siteOverrides>).forEach(
        key => {
          if (siteOverrides[key])
            delete (payload as Record<string, unknown>)[key];
        }
      );
      const response = await fetch("/api/settings/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Site settings failed");
      setSite(data.profile ?? data);
      if (data.overrides) setSiteOverrides(data.overrides);
      toast.addToast("success", "Site identity saved.");
    } catch (cause) {
      toast.addToast("error", (cause as Error).message);
    } finally {
      setSiteSaving(false);
    }
  }
  async function setRole(userId: string, role: string) {
    const response = await fetch("/api/profile/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!response.ok) return toast.addToast("error", "Role update failed.");
    setUsers(current =>
      current.map(user =>
        user.id === userId ? { ...user, profile: { role } } : user
      )
    );
    toast.addToast("success", "Role updated.");
  }
  const visibleUsers = users.filter(user =>
    `${user.name} ${user.email}`.toLowerCase().includes(userQuery.toLowerCase())
  );
  return (
    <div className="space-y-8">
      <section className="bg-surface-container-low rounded-2xl p-6">
        <h2 className="text-xl font-bold">
          Your reading and editing preferences
        </h2>
        <p className="text-on-surface-variant mt-2">
          Color mode is stored in this browser and takes priority over the site
          brand preset.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <ColorModeToggle />
          <span className="text-sm">Cycle light, dark, and system mode</span>
        </div>
      </section>
      <AgentApiKeys />
      {scope === "site" && (
        <>
          <PublicationSettingsPanel />
          <form
            onSubmit={saveSite}
            className="bg-surface-container-low rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold">Site identity</h2>
            <p className="text-on-surface-variant text-sm">
              Any field set via an environment variable is locked here and
              always takes precedence over values stored in the database.
            </p>
            <div>
              <label
                htmlFor="site-name"
                className="block text-sm font-semibold mb-2"
              >
                Publication name
              </label>
              <input
                id="site-name"
                required
                disabled={siteOverrides.name}
                value={site.name}
                onChange={event =>
                  setSite({ ...site, name: event.target.value })
                }
                className="input-field w-full disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {siteOverrides.name && (
                <p className="text-on-surface-variant text-xs mt-1">
                  Overridden by the BLOG_NAME environment variable. Update your
                  deployment env to change this.
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="site-description"
                className="block text-sm font-semibold mb-2"
              >
                Description
              </label>
              <textarea
                id="site-description"
                required
                disabled={siteOverrides.description}
                maxLength={240}
                value={site.description}
                onChange={event =>
                  setSite({ ...site, description: event.target.value })
                }
                className="input-field w-full disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {siteOverrides.description && (
                <p className="text-on-surface-variant text-xs mt-1">
                  Overridden by the BLOG_DESCRIPTION environment variable.
                  Update your deployment env to change this.
                </p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="site-logo"
                  className="block text-sm font-semibold mb-2"
                >
                  Logo URL
                </label>
                <input
                  id="site-logo"
                  type="url"
                  disabled={siteOverrides.logoUrl}
                  value={site.logoUrl}
                  onChange={event =>
                    setSite({ ...site, logoUrl: event.target.value })
                  }
                  className="input-field w-full disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {siteOverrides.logoUrl && (
                  <p className="text-on-surface-variant text-xs mt-1">
                    Overridden by the SITE_LOGO_URL environment variable.
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="site-contact"
                  className="block text-sm font-semibold mb-2"
                >
                  Contact email
                </label>
                <input
                  id="site-contact"
                  type="email"
                  disabled={siteOverrides.contactEmail}
                  value={site.contactEmail}
                  onChange={event =>
                    setSite({ ...site, contactEmail: event.target.value })
                  }
                  className="input-field w-full disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {siteOverrides.contactEmail && (
                  <p className="text-on-surface-variant text-xs mt-1">
                    Overridden by the SITE_CONTACT_EMAIL environment variable.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="site-social"
                className="block text-sm font-semibold mb-2"
              >
                Social or profile URL
              </label>
              <input
                id="site-social"
                type="url"
                disabled={siteOverrides.socialUrl}
                value={site.socialUrl}
                onChange={event =>
                  setSite({ ...site, socialUrl: event.target.value })
                }
                className="input-field w-full disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {siteOverrides.socialUrl && (
                <p className="text-on-surface-variant text-xs mt-1">
                  Overridden by the SITE_SOCIAL_URL environment variable.
                </p>
              )}
            </div>
            <button disabled={siteSaving} className="btn-primary">
              {siteSaving ? "Saving…" : "Save identity"}
            </button>
          </form>
          <section className="bg-surface-container-low rounded-2xl p-6">
            <h2 className="text-xl font-bold">Users and access</h2>
            <label htmlFor="user-search" className="sr-only">
              Search users
            </label>
            <input
              id="user-search"
              value={userQuery}
              onChange={event => setUserQuery(event.target.value)}
              className="input-field w-full mt-5"
              placeholder="Search name or email"
            />
            {usersError && (
              <p role="alert" className="theme-danger-text mt-4">
                {usersError}
              </p>
            )}
            {usersLoading ? (
              <p role="status" className="mt-4">
                Loading users…
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {visibleUsers.map(user => (
                  <article
                    key={user.id}
                    className="bg-surface-container rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between"
                  >
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-on-surface-variant">
                        {user.email} · {user._count.posts} posts ·{" "}
                        {user._count.apiKeys} keys
                      </p>
                    </div>
                    <label className="text-sm">
                      Role{" "}
                      <select
                        value={user.profile?.role ?? "AGENT"}
                        onChange={event =>
                          void setRole(user.id, event.target.value)
                        }
                        className="input-field ml-2"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="AUTHOR">Author</option>
                        <option value="AGENT">Agent</option>
                        <option value="GUEST">Guest</option>
                      </select>
                    </label>
                  </article>
                ))}
                {!visibleUsers.length && (
                  <p className="text-on-surface-variant">No matching users.</p>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
