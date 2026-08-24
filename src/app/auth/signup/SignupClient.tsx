"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  PenLine,
  RefreshCw,
} from "lucide-react";

export default function SignupClient({ blogName }: { blogName: string }) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fail = (message: string) => {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (password !== confirmPassword) return fail("Passwords do not match.");
    if (
      password.length < 10 ||
      !/[a-zA-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      return fail("Use at least 10 characters with a letter and a number.");
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        return fail(data?.message || "Could not create account.");
      }
      router.push("/agent/profile?welcome=1");
    } catch {
      fail("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const errorId = error ? "signup-error" : undefined;
  const fieldClass = "input-field w-full min-h-12";
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
            One account, a clear path
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] xl:text-5xl">
            Make this publication part of your workflow.
          </h2>
          <div className="mt-8 space-y-4 text-sm text-inverse-on-surface/70">
            {[
              "A secure home for your profile and integrations",
              "Publishing access managed by the site administrator",
              "Simple tools that stay focused on the work",
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
          Start with an account. Grow into the role you need.
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
            <span className="eyebrow">Get started</span>
            <h1
              id="signup-title"
              className="mt-3 text-4xl font-extrabold tracking-[-0.05em]"
            >
              Create your account
            </h1>
            <p className="mt-3 text-on-surface-variant">
              Set up a secure profile for reading, integrations, and future
              publishing access.
            </p>
          </header>
          <section aria-labelledby="signup-title">
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
                  htmlFor="signup-name"
                  className="mb-2 block text-sm font-bold"
                >
                  Full name
                </label>
                <input
                  id="signup-name"
                  name="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  aria-describedby={errorId}
                  className={fieldClass}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-2 block text-sm font-bold"
                >
                  Email address
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  aria-describedby={errorId}
                  className={fieldClass}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-2 block text-sm font-bold"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={10}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    aria-describedby="password-help signup-error"
                    className={`${fieldClass} pr-12`}
                    placeholder="At least 10 characters"
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
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p
                  id="password-help"
                  className="mt-2 text-xs text-on-surface-variant"
                >
                  At least 10 characters, including a letter and a number.
                  Pasting is supported.
                </p>
              </div>
              <div>
                <label
                  htmlFor="signup-confirm"
                  className="mb-2 block text-sm font-bold"
                >
                  Confirm password
                </label>
                <input
                  id="signup-confirm"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  aria-describedby={errorId}
                  className={fieldClass}
                  placeholder="Re-enter your password"
                />
              </div>
              <p className="text-xs text-on-surface-variant">
                New accounts start with integration access. An administrator can
                grant publishing access. Email verification is not currently
                required.
              </p>
              <p className="text-xs text-on-surface-variant">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms
                </Link>{" "}
                and acknowledge our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full min-h-12"
              >
                {loading && (
                  <RefreshCw
                    aria-hidden="true"
                    className="w-5 h-5 animate-spin"
                  />
                )}
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-bold text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
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
