import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-8 font-semibold text-3xl">Settings</h1>
      <SettingsForm
        displayName={session.user.displayName ?? ""}
        accentColour={session.user.accentColour}
        ssoProvider={session.user.ssoProvider}
      />
    </div>
  );
}

