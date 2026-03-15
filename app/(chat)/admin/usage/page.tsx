import Link from "next/link";
import { UsageDashboard } from "@/components/admin/usage-dashboard";
import { UserLimits } from "@/components/admin/user-limits";
import { getAllUsersWithLimits } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function AdminUsagePage() {
  const users = await getAllUsersWithLimits();

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
          <Link href="/admin">
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl">Usage Dashboard</h1>
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

