import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import SignupClient from "./SignupClient";
import { getSession } from "@/lib/session";

export default async function SignupPage() {
  if (!config.SIGN_UP_ENABLED) {
    redirect("/auth/login");
  }

  const { user } = await getSession();
  if (user) redirect(user.role === "AGENT" ? "/agent/profile" : "/dashboard");

  return <SignupClient blogName={config.BLOG_NAME} />;
}
