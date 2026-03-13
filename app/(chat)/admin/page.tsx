import { auth } from "@/lib/supabase/auth";
import { getAllUsers, getPendingInvitations } from "@/lib/db/queries";
import { InvitationForm } from "@/components/admin/invitation-form";
import { PendingInvitations } from "@/components/admin/pending-invitations";
import { ModelManagement } from "@/components/admin/model-management";
import { UserList } from "@/components/admin/user-list";
import { getGatewayModels } from "@/lib/ai/gateway";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

