import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getOrganizationById,
  getOrganizationMembers,
  getUsagePeriodTotals,
} from "@/lib/db/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function OrganisationDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await connection();
  const { orgId } = await params;
  const org = await getOrganizationById(orgId);

  if (!org) {
    notFound();
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [members, usage] = await Promise.all([
    getOrganizationMembers(orgId),
    getUsagePeriodTotals({ from: thirtyDaysAgo, to: now, orgId }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/admin/organisations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organisations
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl">{org.name}</h1>
        <div className="mt-1 flex items-center gap-3 text-muted-foreground">
          <span className="font-mono text-sm">/{org.slug}</span>
          <Badge variant="outline">
            {org.billingModel === "per_token" ? "Per Token" : "Per Seat"}
          </Badge>
          <span className="text-sm">
            Created {new Date(org.createdAt).toLocaleDateString("en-GB")}
          </span>
        </div>
      </div>

      {/* Usage summary (last 30 days) */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Tokens (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {usage.totalTokens.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Cost (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              £{(usage.totalCostCents / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Members</CardTitle>
          <CardDescription>
            Users who belong to this organisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">
                    {member.displayName ?? member.email}
                  </p>
                  {member.displayName && (
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {member.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(member.joinedAt).toLocaleDateString("en-GB")}
                  </span>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No members found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

