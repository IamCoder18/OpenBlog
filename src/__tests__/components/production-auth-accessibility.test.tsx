import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginClient from "@/app/auth/login/LoginClient";
import SignupClient from "@/app/auth/signup/SignupClient";
import ForgotPasswordClient from "@/app/auth/forgot-password/ForgotPasswordClient";

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

describe("production authentication forms", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the configured identity and accessible login fields", () => {
    render(<LoginClient signUpEnabled blogName="Field Notes" />);
    expect(screen.getByRole("link", { name: "Field Notes" })).toHaveAttribute(
      "href",
      "/"
    );
    expect(
      screen.getByRole("textbox", { name: "Email address" })
    ).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password"
    );
    expect(
      screen.getByRole("link", { name: "Forgot password?" })
    ).toHaveAttribute("href", "/auth/forgot-password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeVisible();
  });

  it("keeps public signup free of self-service privilege escalation", () => {
    render(<SignupClient blogName="Field Notes" />);
    expect(screen.queryByText(/Choose your role/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "minlength",
      "10"
    );
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms"
    );
    expect(
      screen.getByRole("link", { name: "Privacy Policy" })
    ).toHaveAttribute("href", "/privacy");
  });

  it("explains unavailable password recovery when SMTP is intentionally absent", () => {
    render(<ForgotPasswordClient emailDeliveryAvailable={false} />);
    expect(
      screen.getByText(/Email password recovery is not configured/i)
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Send reset link" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to sign in" })
    ).toHaveAttribute("href", "/auth/login");
  });
});
