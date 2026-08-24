"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const invalid = params.get("error") === "INVALID_TOKEN" || !token;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      password !== confirm ||
      password.length < 10 ||
      !/[a-zA-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setStatus("error");
      return;
    }
    setStatus("pending");
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password, token }),
    }).catch(() => null);
    setStatus(response?.ok ? "success" : "error");
  }

  return (
    <main
      id="main-content"
      className="min-h-screen grid place-items-center px-5 py-12"
    >
      <section className="w-full max-w-md bg-surface-container-low rounded-2xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        {invalid ? (
          <>
            <p role="alert" className="mt-5 theme-danger-text">
              This reset link is invalid or has expired.
            </p>
            <Link
              href="/auth/forgot-password"
              className="mt-5 inline-flex text-primary"
            >
              Request a new link
            </Link>
          </>
        ) : status === "success" ? (
          <>
            <p role="status" className="mt-5 theme-success-text">
              Your password has been updated.
            </p>
            <Link href="/auth/login" className="btn-primary mt-6 inline-flex">
              Sign in
            </Link>
          </>
        ) : (
          <form
            onSubmit={submit}
            className="mt-6 space-y-5"
            aria-busy={status === "pending"}
          >
            {status === "error" && (
              <p role="alert" className="theme-danger-text">
                Use matching passwords with at least 10 characters, a letter,
                and a number. The link may also have expired.
              </p>
            )}
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-semibold mb-2"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="input-field w-full min-h-12"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-semibold mb-2"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={event => setConfirm(event.target.value)}
                className="input-field w-full min-h-12"
              />
            </div>
            <button
              className="btn-primary w-full min-h-12"
              disabled={status === "pending"}
            >
              {status === "pending" ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
