"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordClient({
  emailDeliveryAvailable,
}: {
  emailDeliveryAvailable: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "error">(
    "idle"
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!emailDeliveryAvailable) return;
    setStatus("pending");
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      });
      setStatus(response.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main
      id="main-content"
      className="min-h-screen grid place-items-center px-5 py-12"
    >
      <section
        className="w-full max-w-md bg-surface-container-low rounded-2xl p-6 sm:p-8"
        aria-labelledby="forgot-title"
      >
        <h1 id="forgot-title" className="text-3xl font-bold">
          Reset your password
        </h1>
        {!emailDeliveryAvailable ? (
          <div
            role="status"
            className="mt-5 theme-warning-soft rounded-lg p-4 text-on-surface"
          >
            Email password recovery is not configured for this publication.
            Contact an administrator to regain access.
          </div>
        ) : (
          <>
            <p className="mt-3 text-on-surface-variant">
              Enter your account email. If it exists, we’ll send a link valid
              for one hour.
            </p>
            {status === "sent" ? (
              <div
                role="status"
                className="mt-6 theme-success-soft theme-success-text rounded-lg p-4"
              >
                If an account exists for that address, its reset link is on the
                way. You can close this page safely.
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="mt-6 space-y-5"
                aria-busy={status === "pending"}
              >
                {status === "error" && (
                  <p role="alert" className="theme-danger-text">
                    Email delivery is temporarily unavailable. Try again later
                    or contact an administrator.
                  </p>
                )}
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-semibold mb-2"
                  >
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    className="input-field w-full min-h-12"
                  />
                </div>
                <button
                  className="btn-primary w-full min-h-12"
                  disabled={status === "pending"}
                >
                  {status === "pending" ? "Sending…" : "Send reset link"}
                </button>
              </form>
            )}
          </>
        )}
        <Link
          href="/auth/login"
          className="mt-6 inline-flex min-h-11 items-center text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
