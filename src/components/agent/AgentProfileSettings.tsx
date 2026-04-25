"use client";

import { useState, useRef } from "react";
import { useToast } from "@/components/ToastContext";
import { User, Info } from "lucide-react";

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
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialUser.name);
  const [image, setImage] = useState<string | null>(initialUser.image);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.addToast("error", "Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.addToast("error", "Image must be less than 2MB.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setUploading(false);
      };
      reader.onerror = () => {
        toast.addToast("error", "Failed to read image.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.addToast("error", "Failed to process image.");
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.addToast("error", "Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          image,
        }),
      });

      if (res.ok) {
        toast.addToast("success", "Profile updated.");
      } else {
        const data = await res.json().catch(() => null);
        toast.addToast("error", data?.error || "Could not update profile.");
      }
    } catch {
      toast.addToast("error", "Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Info */}
      <section className="bg-surface-container-low rounded-2xl p-6 lg:p-8">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Profile
        </h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
              <span className="text-lg font-bold text-on-primary-container">
                {initials}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Change avatar"}
              </button>
              {image && (
                <button
                  onClick={handleRemoveImage}
                  className="text-xs font-medium text-on-surface-variant hover:theme-danger-text"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant">
              JPG, PNG or GIF. Max 2MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-surface-container rounded-lg px-4 py-2.5 text-sm text-on-surface border-none outline-none focus:ring-1 focus:ring-primary/30 transition-shadow"
            placeholder="Your name"
            maxLength={100}
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={initialUser.email}
            disabled
            className="w-full bg-surface-container rounded-lg px-4 py-2.5 text-sm text-on-surface-variant border-none outline-none cursor-not-allowed"
          />
          <p className="text-[11px] text-on-surface-variant">
            Email cannot be changed.
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="editorial-gradient text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all active:scale-95"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </section>

      {/* Account Info */}
      <section className="bg-surface-container-low rounded-2xl p-6 lg:p-8">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          Account
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-on-surface-variant">Role</span>
            <span className="px-2.5 py-1 text-[9px] uppercase tracking-wider rounded-full font-bold bg-primary/10 text-primary">
              {initialUser.profile?.role || "AGENT"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-on-surface-variant">User ID</span>
            <span className="text-xs text-on-surface-variant font-mono">
              {initialUser.id}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
