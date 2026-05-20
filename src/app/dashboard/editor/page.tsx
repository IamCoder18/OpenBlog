import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { config } from "@/lib/config";
import EditorClient from "./EditorClient";

export default async function EditorPage() {
  try {
    await requireAuth();
  } catch {
    redirect("/auth/login");
  }

  return <EditorClient blogName={config.BLOG_NAME} />;
}
