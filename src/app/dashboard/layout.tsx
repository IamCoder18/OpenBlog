import { redirect } from "next/navigation";
import { requireAuthOrAbove } from "@/lib/session";
import Sidebar from "@/components/dashboard/Sidebar";
import { getSiteProfile } from "@/lib/site-settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireAuthOrAbove();
  } catch {
    redirect("/explore?error=dashboard_unauthorized");
  }
  const profile = await getSiteProfile();

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Sidebar
        userName={user.name}
        userRole={user.role}
        userEmail={user.email}
        publicationName={profile.name}
      />
      <main className="lg:ml-72 min-h-screen">{children}</main>
    </div>
  );
}
