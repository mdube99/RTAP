import { redirect } from "next/navigation";

export default async function SettingsPage() {
  // Redirect to the first settings section
  redirect("/settings/taxonomy");
}