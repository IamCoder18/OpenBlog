"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Key, Trash2 } from "lucide-react";
import { useToast } from "@/components/ToastContext";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  scopes: string[];
}

export default function AgentApiKeys() {
  const toast = useToast();
  const acknowledgeRef = useRef<HTMLButtonElement>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [scopes, setScopes] = useState(["posts:read"]);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [revoke, setRevoke] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function fetchKeys() {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/keys");
      if (!response.ok) throw new Error();
      setKeys((await response.json()).keys);
    } catch {
      setLoadError("API keys couldn’t be loaded.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void fetchKeys();
  }, []);
  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(expiry !== "never" && { expiresInDays: Number(expiry) }),
          scopes,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not create key");
      setName("");
      setSecret(data.key);
      setCopied(false);
      await fetchKeys();
      requestAnimationFrame(() => acknowledgeRef.current?.focus());
    } catch (cause) {
      toast.addToast("error", (cause as Error).message);
    } finally {
      setCreating(false);
    }
  }
  async function revokeKey() {
    if (!revoke || revoking) return;
    setRevoking(true);
    try {
      const response = await fetch(`/api/keys/${revoke.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not revoke key");
      setRevoke(null);
      await fetchKeys();
      toast.addToast("success", "API key revoked.");
    } catch (cause) {
      toast.addToast("error", (cause as Error).message);
    } finally {
      setRevoking(false);
    }
  }
  function toggleScope(scope: string) {
    setScopes(current =>
      current.includes(scope)
        ? current.filter(value => value !== scope)
        : [...current, scope]
    );
  }

  return (
    <section
      className="bg-surface-container-low rounded-2xl p-6 lg:p-8"
      aria-labelledby="api-keys-title"
    >
      <h2
        id="api-keys-title"
        className="text-xl font-bold flex items-center gap-2"
      >
        <Key className="w-5 h-5" />
        API keys
      </h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Secrets are shown once. Stored keys are hashed and cannot be recovered.
      </p>
      <form onSubmit={createKey} className="mt-6 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="key-name"
            className="block text-sm font-semibold mb-2"
          >
            Key name
          </label>
          <input
            id="key-name"
            required
            maxLength={100}
            value={name}
            onChange={event => setName(event.target.value)}
            className="input-field w-full"
            placeholder="Deployment or integration name"
          />
        </div>
        <div>
          <label
            htmlFor="key-expiry"
            className="block text-sm font-semibold mb-2"
          >
            Expires
          </label>
          <select
            id="key-expiry"
            value={expiry}
            onChange={event => setExpiry(event.target.value)}
            className="input-field w-full"
          >
            <option value="never">Never expires</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold mb-2">Permissions</legend>
          {["posts:read", "posts:write"].map(scope => (
            <label key={scope} className="flex items-center gap-2 min-h-9">
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
              />
              {scope === "posts:read" ? "Read posts" : "Create and edit posts"}
            </label>
          ))}
        </fieldset>
        <button
          disabled={creating || !name.trim() || !scopes.length}
          className="btn-primary sm:col-span-2 justify-self-start"
        >
          {creating ? "Creating…" : "Create API key"}
        </button>
      </form>
      {loadError && (
        <p role="alert" className="mt-6 theme-danger-text">
          {loadError}{" "}
          <button type="button" onClick={fetchKeys} className="underline">
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-6">
          Loading keys…
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {keys
            .filter(key => !key.revokedAt)
            .map(key => (
              <article
                key={key.id}
                className="bg-surface-container rounded-xl p-4 flex gap-4 justify-between"
              >
                <div>
                  <h3 className="font-semibold">{key.name}</h3>
                  <code className="text-sm text-on-surface-variant">
                    {key.prefix}••••••••
                  </code>
                  <p className="text-xs text-on-surface-variant mt-2">
                    Scopes: {key.scopes.join(", ")} · Created{" "}
                    <time dateTime={key.createdAt}>
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(key.createdAt))}
                    </time>
                    {key.expiresAt
                      ? ` · Expires ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(key.expiresAt))}`
                      : " · No expiration"}
                    {key.lastUsedAt
                      ? ` · Last used ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(key.lastUsedAt))}`
                      : " · Never used"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRevoke(key)}
                  aria-label={`Revoke ${key.name}`}
                  className="min-w-11 min-h-11 theme-danger-text"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </article>
            ))}
          {!keys.some(key => !key.revokedAt) && (
            <p className="text-on-surface-variant">No active API keys.</p>
          )}
        </div>
      )}
      {secret && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="secret-title"
          className="fixed inset-0 z-[210] bg-black/60 grid place-items-center p-5"
        >
          <div className="bg-surface-container rounded-2xl p-6 max-w-xl w-full">
            <h2 id="secret-title" className="text-2xl font-bold">
              Save this secret now
            </h2>
            <p className="mt-2 text-on-surface-variant">
              It will never be displayed again.
            </p>
            <code className="block mt-5 p-4 bg-surface rounded-lg break-all select-all">
              {secret}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret);
                  setCopied(true);
                } catch {
                  toast.addToast(
                    "error",
                    "Copy failed. Select the secret and copy it manually."
                  );
                }
              }}
              className="btn-secondary mt-4 inline-flex items-center gap-2"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied" : "Copy secret"}
            </button>
            <div className="mt-6 flex justify-end">
              <button
                ref={acknowledgeRef}
                type="button"
                onClick={() => setSecret("")}
                className="btn-primary"
              >
                I saved it
              </button>
            </div>
          </div>
        </div>
      )}
      {revoke && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-title"
          className="fixed inset-0 z-[210] bg-black/60 grid place-items-center p-5"
        >
          <div className="bg-surface-container rounded-2xl p-6 max-w-md">
            <h2 id="revoke-title" className="text-xl font-bold">
              Revoke {revoke.name}?
            </h2>
            <p className="mt-3 text-on-surface-variant">
              Integrations using this key will stop immediately.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={revoking}
                onClick={() => setRevoke(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revoking}
                onClick={revokeKey}
                className="theme-danger-soft theme-danger-text px-5 rounded-lg"
              >
                {revoking ? "Revoking…" : "Revoke key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
