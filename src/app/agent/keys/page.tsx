import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { config } from "@/lib/config";
import AgentApiKeys from "@/components/agent/AgentApiKeys";

export function generateMetadata() {
  return {
    title: `API Keys | ${config.BLOG_NAME}`,
  };
}

export default async function AgentKeysPage() {
  const { user } = await getSession();
  if (!user) return null;

  if (user.role !== "AGENT") {
    redirect("/agent/profile");
  }

  return (
    <div className="pt-20 lg:pt-8 px-4 sm:px-6 lg:px-12 pb-12 max-w-4xl mx-auto">
      <header className="mb-8">
        <span className="text-primary font-label text-[10px] tracking-[0.2em] uppercase">
          Account
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mt-2">
          API Keys
        </h1>
        <p className="text-on-surface-variant text-sm mt-2">
          Manage your API keys for programmatic access.
        </p>
      </header>

      <AgentApiKeys />
    </div>
  );
}
