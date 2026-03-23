import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db";
import AgentSidebar from "@/components/agent/AgentSidebar";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/auth/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { image: true },
  });

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <AgentSidebar
        userName={user.name}
        userRole={user.role}
        userEmail={user.email}
        userImage={dbUser?.image ?? null}
      />
      <main className="lg:ml-72 min-h-screen">{children}</main>
    </div>
  );
}
