import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import SignInPageClient from "@features/shared/auth/sign-in-page";

export default async function SignInPage(props: { searchParams?: Promise<{ callbackUrl?: string; error?: string }> }) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const { callbackUrl = "/", error } = (await props.searchParams) ?? {};
  const credsEnabled = process.env.AUTH_CREDENTIALS_ENABLED !== "false"; // default enabled
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <SignInPageClient
      credsEnabled={credsEnabled}
      googleEnabled={googleEnabled}
      callbackUrl={callbackUrl}
      initialError={error}
    />
  );
}
