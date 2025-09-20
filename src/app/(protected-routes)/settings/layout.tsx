import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { UserRole } from "@prisma/client";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Only admins can access settings (auth is enforced by the group layout)
  if (session && session.user.role !== UserRole.ADMIN) {
    redirect("/");
  }

  return (
    <div className="p-6">
      {children}
    </div>
  );
}
