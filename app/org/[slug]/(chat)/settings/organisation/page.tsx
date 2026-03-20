import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";
import { orgPath } from "@/lib/org-url";
import { OrgSettingsForm } from "@/components/org-settings-form";

/**
 * Organisation settings page.
 * Only accessible to org admins and owners.
 */
export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connection();
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    redirect("/login");
  }

  // Only admins/owners can access org settings
  if (session.org.role !== "admin" && session.org.role !== "owner") {
    redirect(orgPath(slug, "/"));
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-8 font-semibold text-3xl">Organisation Settings</h1>
      <OrgSettingsForm
        orgName={session.org.name}
        billingModel={session.org.billingModel}
      />
    </div>
  );
}

