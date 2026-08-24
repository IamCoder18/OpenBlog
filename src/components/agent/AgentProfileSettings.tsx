"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, User } from "lucide-react";
import { useToast } from "@/components/ToastContext";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  profile: { role: string } | null;
}

export default function AgentProfileSettings({
  initialUser,
}: {
  initialUser: ProfileUser;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialUser.name);
  const [image, setImage] = useState(initialUser.image ?? "");
  const [saved, setSaved] = useState({
    name: initialUser.name,
    image: initialUser.image ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const dirty = name.trim() !== saved.name || image.trim() !== saved.image;
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          image: image.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Profile update failed");
      setSaved({ name: data.user.name, image: data.user.image ?? "" });
      setName(data.user.name);
      setImage(data.user.image ?? "");
      router.refresh();
      toast.addToast("success", "Profile updated.");
    } catch (cause) {
      toast.addToast("error", (cause as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 10)
      return toast.addToast("error", "Use at least 10 characters.");
    setChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.message || "Password change failed");
      setCurrentPassword("");
      setNewPassword("");
      toast.addToast("success", "Password changed and other sessions revoked.");
    } catch (cause) {
      toast.addToast("error", (cause as Error).message);
    } finally {
      setChangingPassword(false);
    }
  }
  return (
    <div className="space-y-8">
      <form
        onSubmit={saveProfile}
        className="bg-surface-container-low rounded-2xl p-6 lg:p-8"
      >
        <h2 className="text-xl font-bold flex gap-2">
          <User className="w-5 h-5" />
          Profile
        </h2>
        <div className="mt-6 grid sm:grid-cols-[6rem_1fr] gap-6 items-start">
          {image ? (
            <img
              src={image}
              alt=""
              width="96"
              height="96"
              className="w-24 h-24 rounded-full object-cover bg-surface-container"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/15 grid place-items-center text-2xl font-bold">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-sm font-semibold mb-2"
              >
                Display name
              </label>
              <input
                id="profile-name"
                autoComplete="name"
                maxLength={100}
                required
                value={name}
                onChange={event => setName(event.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label
                htmlFor="profile-image"
                className="block text-sm font-semibold mb-2"
              >
                Avatar HTTPS URL
              </label>
              <input
                id="profile-image"
                type="url"
                value={image}
                onChange={event => setImage(event.target.value)}
                className="input-field w-full"
                placeholder="https://images.example.com/avatar.jpg"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Use a resized square image hosted by your approved media
                provider. Data URLs are rejected.
              </p>
            </div>
            <div>
              <label
                htmlFor="profile-email"
                className="block text-sm font-semibold mb-2"
              >
                Email
              </label>
              <input
                id="profile-email"
                value={initialUser.email}
                disabled
                className="input-field w-full"
              />
            </div>
            <button disabled={!dirty || saving} className="btn-primary">
              {saving ? "Saving…" : dirty ? "Save profile" : "Saved"}
            </button>
          </div>
        </div>
      </form>
      <form
        onSubmit={changePassword}
        className="bg-surface-container-low rounded-2xl p-6 lg:p-8"
      >
        <h2 className="text-xl font-bold flex gap-2">
          <Shield className="w-5 h-5" />
          Security
        </h2>
        <p className="text-sm text-on-surface-variant mt-2">
          Changing your password revokes every other active session.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-semibold mb-2"
            >
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label
              htmlFor="new-account-password"
              className="block text-sm font-semibold mb-2"
            >
              New password
            </label>
            <input
              id="new-account-password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>
        <button disabled={changingPassword} className="btn-secondary mt-5">
          {changingPassword ? "Updating…" : "Change password"}
        </button>
        <div className="mt-6 pt-5 border-t border-outline-variant/15">
          <p className="text-sm">
            <strong>Role:</strong> {initialUser.profile?.role || "AGENT"}
          </p>
          <p className="text-xs font-mono text-on-surface-variant mt-1">
            User ID: {initialUser.id}
          </p>
        </div>
      </form>
    </div>
  );
}
