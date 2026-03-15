import Link from "next/link";
import { auth } from "@/lib/supabase/auth";
import { getAllUsers, getPendingInvitations } from "@/lib/db/queries";
import { InvitationForm } from "@/components/admin/invitation-form";
import { PendingInvitations } from "@/components/admin/pending-invitations";
import { ModelManagement } from "@/components/admin/model-management";
import { UserList } from "@/components/admin/user-list";
import { getGatewayModels } from "@/lib/ai/gateway";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Bot, ChevronRight, Coins, Shield } from "lucide-react";

export default async function AdminPage() {
  // Auth is already checked in layout, but we need the session for the current user ID
  const session = (await auth())!;
  const [users, invitations, gatewayModels] = await Promise.all([
    getAllUsers(),
    getPendingInvitations(),
    getGatewayModels(),
  ]);

  const serialisedInvitations = invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    displayName: inv.displayName ?? null,
    expiresAt: inv.expiresAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-8 font-semibold text-3xl">Administration</h1>

      {/* Users section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Users</CardTitle>
          <CardDescription>
            Manage user accounts and roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserList
            users={users.map((u) => ({
              id: u.id,
              email: u.email,
              role: u.role,
              displayName: u.displayName,
              mfaExempt: u.mfaExempt,
              dailyCostLimitCents: u.dailyCostLimitCents,
              monthlyCostLimitCents: u.monthlyCostLimitCents,
            }))}
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>

      {/* Invitations section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Invitations</CardTitle>
          <CardDescription>
            Invite new users and manage pending invitations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          <InvitationForm />
          <div>
            <h3 className="mb-4 font-medium text-sm text-muted-foreground">
              Pending Invitations
            </h3>
            <PendingInvitations invitations={serialisedInvitations} />
          </div>
        </CardContent>
      </Card>

      {/* Co-pilots section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Co-pilots</CardTitle>
              <CardDescription>
                Create and manage co-pilots with custom personas and knowledge bases.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/copilots">
                <Bot className="mr-2 size-4" />
                Manage
                <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* SSO settings section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Single Sign-On</CardTitle>
              <CardDescription>
                Configure SSO providers (Azure AD, GitLab) and manage whitelisted domains
                for automatic user provisioning.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/sso">
                <Shield className="mr-2 size-4" />
                Manage
                <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Usage dashboard section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Usage &amp; Cost Limits</CardTitle>
              <CardDescription>
                View token usage, manage cost limits, and export usage reports.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/usage">
                <BarChart3 className="mr-2 size-4" />
                Dashboard
                <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Model pricing section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Model Pricing</CardTitle>
              <CardDescription>
                Configure cost-per-token pricing for AI models used in cost calculations.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/pricing">
                <Coins className="mr-2 size-4" />
                Manage
                <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Model management section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Models</CardTitle>
          <CardDescription>
            Control which AI models are available to users. When no models are explicitly enabled, all models are visible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelManagement models={gatewayModels} />
        </CardContent>
      </Card>
    </div>
  );
}

