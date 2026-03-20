import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";
import { orgPath } from "@/lib/org-url";
import { getOrganizationMembers } from "@/lib/db/queries";
import { OrgMemberList } from "@/components/org-member-list";
import { OrgInviteForm } from "@/components/org-invite-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Member management page.
 * Lists all organisation members with role management and invite form.
 * Only accessible to org admins and owners.
 */
export default async function MembersPage({
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

  // Only admins/owners can access member management
  if (session.org.role !== "admin" && session.org.role !== "owner") {
    redirect(orgPath(slug, "/"));
  }

  const members = await getOrganizationMembers(session.org.id);

  const serialisedMembers = members.map((m) => ({
    userId: m.userId,
    email: m.email,
    displayName: m.displayName ?? null,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-8 font-semibold text-3xl">Members</h1>

      {/* Add member */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Add Member</CardTitle>
          <CardDescription>
            Add an existing user to this organisation by their email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgInviteForm />
        </CardContent>
      </Card>

      {/* Member list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Organisation Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in this organisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgMemberList
            members={serialisedMembers}
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

