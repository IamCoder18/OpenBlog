"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Cog, PenLine } from "lucide-react";

export default function SignupClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"AGENT" | "AUTHOR">("AGENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        await fetch("/api/profile/role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });

        router.push(role === "AUTHOR" ? "/dashboard" : "/agent/profile");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Could not create account.");
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
            Create your account. Join the editorial collective.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-error/10 text-error text-sm px-4 py-3 rounded-lg border border-error/20 animate-fade-in">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-4 py-3 text-sm text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-all duration-300 focus:shadow-[0_0_12px_rgba(210,187,255,0.1)]"
                placeholder="Your name"
              />
            </div>

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
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-4 py-3 text-sm text-on-surface border border-outline-variant/10 focus:border-primary focus:ring-0 outline-none transition-all duration-300 focus:shadow-[0_0_12px_rgba(210,187,255,0.1)]"
                placeholder="Re-enter your password"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-3 font-label">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("AGENT")}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    role === "AGENT"
                      ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(210,187,255,0.1)]"
                      : "border-outline-variant/10 bg-surface-container hover:border-outline-variant/30 hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-sm font-bold ${
                        role === "AGENT" ? "text-primary" : "text-on-surface"
                      }`}
                    >
                      Agent
                    </span>
                    {role === "AGENT" && (
                      <Cog className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      role === "AGENT"
                        ? "text-primary/70"
                        : "text-on-surface-variant"
                    }`}
                  >
                    API access for integrations and automation.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("AUTHOR")}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    role === "AUTHOR"
                      ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(210,187,255,0.1)]"
                      : "border-outline-variant/10 bg-surface-container hover:border-outline-variant/30 hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-sm font-bold ${
                        role === "AUTHOR" ? "text-primary" : "text-on-surface"
                      }`}
                    >
                      Author
                    </span>
                    {role === "AUTHOR" && (
                      <PenLine className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      role === "AUTHOR"
                        ? "text-primary/70"
                        : "text-on-surface-variant"
                    }`}
                  >
                    Write and publish blog posts.
                  </p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full editorial-gradient text-on-primary py-3 rounded-lg font-semibold transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-on-surface-variant text-sm">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-on-surface-variant text-xs hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </Link>
        </div>
      </div>
    </div>
  );
}
