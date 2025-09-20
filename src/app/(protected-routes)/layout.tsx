import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function ProtectedRoutesLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/auth/signin");
  }

  return <div className="max-w-7xl mx-auto">{children}</div>;
}
