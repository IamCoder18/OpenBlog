import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import SignupClient from "./SignupClient";

export default function SignupPage() {
  if (!config.SIGN_UP_ENABLED) {
    redirect("/auth/login");
  }

  return <SignupClient />;
}
