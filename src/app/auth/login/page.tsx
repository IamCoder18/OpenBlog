import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { getSession } from "@/lib/session";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const { user } = await getSession();
  if (user) {
    redirect(user.role === "AGENT" ? "/agent/profile" : "/dashboard");
  }

  return <LoginClient signUpEnabled={config.SIGN_UP_ENABLED} />;
}
