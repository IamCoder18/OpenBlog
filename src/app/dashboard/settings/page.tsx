import { getSession } from "@/lib/session";
import { config } from "@/lib/config";
import DashboardSettings from "@/components/dashboard/DashboardSettings";
import Footer from "@/components/Footer";

export function generateMetadata() {
  return {
    title: `Settings | ${config.BLOG_NAME}`,
    description: "Customize your blog's appearance and configuration.",
  };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { user } = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "AUTHOR")) {
    return null;
  }

  const params = await searchParams;
  const isAdmin = user.role === "ADMIN";
  const isPersonal = isAdmin
    ? (params.mode ?? "personal") === "personal"
    : true;
  const scope = isPersonal ? "personal" : "site";

  return (
    <div className="pt-20 lg:pt-8 px-4 sm:px-6 lg:px-12 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <span className="text-primary font-label text-[10px] tracking-[0.2em] uppercase">
          {isPersonal ? "Your Workspace" : "Admin Mode"}
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mt-2">
          Settings
        </h1>
        <p className="text-on-surface-variant text-sm mt-2">
          {isPersonal
            ? "Customize your experience and manage API access."
            : "Manage themes, users, and platform configuration."}
        </p>
      </header>

      <DashboardSettings scope={scope} />

      <Footer className="mt-16" />
    </div>
  );
}
