import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import AgentProfileSettings from "@/components/agent/AgentProfileSettings";

export function generateMetadata() {
  return {
    title: `Profile | ${config.BLOG_NAME}`,
  };
}

export default async function AgentProfilePage() {
  const { user } = await getSession();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      profile: {
        select: { role: true },
      },
    },
  });

  if (!dbUser) return null;

  return (
    <div className="pt-20 lg:pt-8 px-4 sm:px-6 lg:px-12 pb-12 max-w-4xl mx-auto">
      <header className="mb-8">
        <span className="text-primary font-label text-[10px] tracking-[0.2em] uppercase">
          Account
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mt-2">
          Profile
        </h1>
        <p className="text-on-surface-variant text-sm mt-2">
          Manage your personal information and preferences.
        </p>
      </header>

      <AgentProfileSettings initialUser={dbUser} />
    </div>
  );
}
