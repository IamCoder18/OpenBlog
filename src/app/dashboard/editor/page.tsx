import { redirect } from "next/navigation";
import { requireAuthOrAbove } from "@/lib/session";
import { config } from "@/lib/config";
import EditorClient from "./EditorClient";

export default async function EditorPage() {
  try {
    await requireAuthOrAbove();
  } catch {
    redirect("/auth/login");
  }

  return <EditorClient canonicalOrigin={config.BASE_URL} />;
}
