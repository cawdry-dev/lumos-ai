import Link from "next/link";
import { auth } from "@/lib/supabase/auth";
import { UsageDashboard } from "@/components/admin/usage-dashboard";
import { OrgCostLimitsEditor } from "@/components/admin/org-cost-limits-editor";
import { UserLimits } from "@/components/admin/user-limits";
import { getAllUsersWithLimits, getOrgCostLimits } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { orgPath } from "@/lib/org-path";

export default async function AdminUsagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = (await auth(slug))!;
  const orgId = session.org!.id;
  const billingModel = session.org!.billingModel;
  const [users, orgLimits] = await Promise.all([
    getAllUsersWithLimits(orgId),
    getOrgCostLimits(orgId),
  ]);

  const serialisedUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    displayName: u.displayName,
    dailyCostLimitCents: u.dailyCostLimitCents,
    monthlyCostLimitCents: u.monthlyCostLimitCents,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={orgPath(slug, "/admin")}>
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl">Usage Dashboard</h1>
        <Badge variant="secondary" className="text-xs">
          {billingModel === "per_seat" ? "Per-seat billing" : "Per-token billing"}
        </Badge>
      </div>

      {/* Usage overview with charts */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Usage Overview</CardTitle>
          <CardDescription>
            Token usage and cost breakdown across all users, models, and co-pilots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageDashboard />
        </CardContent>
      </Card>

      {/* Organisation cost limits */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Organisation Cost Limits</CardTitle>
          <CardDescription>
            Set daily and monthly cost limits for the entire organisation. When reached, all members are blocked from further AI usage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgCostLimitsEditor
            dailyCostLimitCents={orgLimits?.dailyCostLimitCents ?? null}
            monthlyCostLimitCents={orgLimits?.monthlyCostLimitCents ?? null}
          />
        </CardContent>
      </Card>

      {/* Per-user cost limits */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">User Cost Limits</CardTitle>
          <CardDescription>
            Set per-user daily and monthly cost limit overrides. Leave blank to use the role default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserLimits users={serialisedUsers} />
        </CardContent>
      </Card>
    </div>
  );
}

