import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import SignInPageClient from "@features/shared/auth/sign-in-page";

export default async function SignInPage(props: { searchParams?: Promise<{ callbackUrl?: string; error?: string }> }) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const { callbackUrl = "/", error } = (await props.searchParams) ?? {};
  const passkeysEnabled = process.env.AUTH_PASSKEYS_ENABLED === "true";
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <SignInPageClient
      passkeysEnabled={passkeysEnabled}
      googleEnabled={googleEnabled}
      callbackUrl={callbackUrl}
      initialError={error}
    />
  );
}
