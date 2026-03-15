import { auth } from "@/lib/supabase/auth";
import { getAllowedDomains } from "@/lib/db/queries";
import { SsoSettings } from "@/components/admin/sso-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SsoAdminPage() {
  // Auth is already checked in the admin layout
  const session = (await auth())!;
  const domains = await getAllowedDomains();

  const serialisedDomains = domains.map((d) => ({
    id: d.id,
    domain: d.domain,
    defaultRole: d.defaultRole,
    ssoProvider: d.ssoProvider,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-8 font-semibold text-3xl">SSO Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Single Sign-On</CardTitle>
          <CardDescription>
            Configure SSO providers and manage whitelisted domains for automatic
            user provisioning. Users signing in via SSO with a whitelisted email
            domain will be automatically granted access with the configured role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SsoSettings initialDomains={serialisedDomains} />
        </CardContent>
      </Card>
    </div>
  );
}

