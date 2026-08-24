"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  PenLine,
  RefreshCw,
} from "lucide-react";

function safeReturnTo(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default function LoginClient({
  signUpEnabled,
  blogName,
}: {
  signUpEnabled: boolean;
  blogName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message || "Invalid email or password.");
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      router.refresh();
      const returnTo = safeReturnTo(searchParams.get("returnTo"));
      if (returnTo) return router.push(returnTo);
      const profileResponse = await fetch("/api/profile");
      const data = profileResponse.ok ? await profileResponse.json() : null;
      router.push(
        data?.user?.profile?.role === "AGENT" ? "/agent/profile" : "/dashboard"
      );
    } catch {
      setError("Something went wrong. Please try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  const errorId = error ? "login-error" : undefined;
  return (
    <main
      id="main-content"
      className="grid min-h-screen bg-surface lg:grid-cols-[0.9fr_1.1fr]"
    >
      <aside className="relative hidden overflow-hidden bg-inverse-surface p-12 text-inverse-on-surface lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div
          aria-hidden="true"
          className="absolute -left-24 top-1/3 size-80 rounded-full bg-primary/25 blur-3xl"
        />
        <Link
          href="/"
          aria-label={`${blogName} home`}
          className="relative inline-flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.04em]"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-white text-[#5146d8]">
            <PenLine className="size-[1.1rem]" />
          </span>
          {blogName}
        </Link>
        <div className="relative max-w-lg">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-inverse-on-surface/55">
            Your writing workspace
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] xl:text-5xl">
            Pick up where your best ideas left off.
          </h2>
          <div className="mt-8 space-y-4 text-sm text-inverse-on-surface/70">
            {[
              "Draft and publish without a complicated setup",
              "See how every story is performing",
              "Keep your publication and profile in one place",
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-white/10 text-white">
                  <Check className="size-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-inverse-on-surface/45">
          Focus on the story. We’ll keep the workspace out of your way.
        </p>
      </aside>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md animate-fade-in-up">
          <header className="mb-9">
            <Link
              href="/"
              className="mb-10 inline-flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.04em] lg:hidden"
            >
              <span className="grid size-9 place-items-center rounded-xl editorial-gradient text-white">
                <PenLine className="size-[1.1rem]" />
              </span>
              {blogName}
            </Link>
            <span className="eyebrow">Welcome back</span>
            <h1
              id="login-title"
              className="mt-3 text-4xl font-extrabold tracking-[-0.05em]"
            >
              Sign in to your workspace
            </h1>
            <p className="mt-3 text-on-surface-variant">
              Enter your details to continue writing and managing your stories.
            </p>
          </header>
          <section aria-labelledby="login-title">
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              aria-busy={loading}
            >
              {error && (
                <div
                  id={errorId}
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="rounded-xl px-4 py-3 theme-danger-soft theme-danger-text"
                >
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-bold"
                >
                  Email address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={errorId}
                  className="input-field w-full min-h-12"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-sm font-bold">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={errorId}
                    className="input-field w-full min-h-12 pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(value => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-1 top-1 grid min-h-11 min-w-11 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full min-h-12"
                aria-busy={loading}
              >
                {loading && (
                  <RefreshCw
                    aria-hidden="true"
                    className="size-5 animate-spin"
                  />
                )}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
            {signUpEnabled && (
              <p className="mt-7 text-center text-sm text-on-surface-variant">
                New to {blogName}?{" "}
                <Link
                  href="/auth/signup"
                  className="font-bold text-primary hover:underline"
                >
                  Create an account
                </Link>
              </p>
            )}
          </section>
          <Link
            href="/"
            className="mt-8 flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to stories
          </Link>
        </div>
      </div>
    </main>
  );
}
