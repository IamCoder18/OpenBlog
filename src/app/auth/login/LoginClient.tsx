"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginClient({
  signUpEnabled,
}: {
  signUpEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.refresh();

        const profileRes = await fetch("/api/profile");
        if (profileRes.ok) {
          const data = await profileRes.json();
          const role = data.user?.profile?.role;
          router.push(role === "AGENT" ? "/agent/profile" : "/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Invalid email or password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-8">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="text-3xl font-headline font-bold tracking-tighter text-on-surface hover:text-primary transition-colors"
          >
            OpenBlog
          </Link>
          <p className="text-on-surface-variant mt-3 text-sm">
            Welcome back. Sign in to your editorial suite.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error/10 text-error text-sm px-4 py-3 rounded-lg border border-error/20 animate-fade-in">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-4 py-3 text-sm text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-all duration-300 focus:shadow-[0_0_12px_rgba(210,187,255,0.1)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-4 py-3 text-sm text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-all duration-300 focus:shadow-[0_0_12px_rgba(210,187,255,0.1)]"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full editorial-gradient text-on-primary py-3 rounded-lg font-semibold transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined text-lg animate-spin">
                  sync
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {signUpEnabled && (
            <div className="mt-6 text-center">
              <p className="text-on-surface-variant text-sm">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Create one
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-on-surface-variant text-xs hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to blog
          </Link>
        </div>
      </div>
    </div>
  );
}
