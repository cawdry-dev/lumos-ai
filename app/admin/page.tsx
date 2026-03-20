import { connection } from "next/server";
import Link from "next/link";
import { getGlobalUsageStats } from "@/lib/db/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Coins, Activity, ChevronRight } from "lucide-react";

export default async function GlobalAdminDashboard() {
  await connection();
  const stats = await getGlobalUsageStats();

  const cards = [
    {
      title: "Organisations",
      value: stats.organisationCount,
      description: "Total registered organisations",
      icon: Building2,
      href: "/admin/organisations",
    },
    {
      title: "Users",
      value: stats.userCount,
      description: "Total registered users",
      icon: Users,
      href: "/admin/users",
    },
    {
      title: "Total Tokens",
      value: stats.totalTokens.toLocaleString(),
      description: "Tokens used across all organisations",
      icon: Activity,
    },
    {
      title: "Total Cost",
      value: `£${(stats.totalCostCents / 100).toFixed(2)}`,
      description: "Estimated cost across all organisations",
      icon: Coins,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="mb-2 font-semibold text-3xl">Global Admin Dashboard</h1>
      <p className="mb-8 text-muted-foreground">
        Overview of all organisations, users, and usage across the platform.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-medium text-sm">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
              {card.href && (
                <Button variant="link" className="mt-2 h-auto p-0 text-xs" asChild>
                  <Link href={card.href}>
                    View all <ChevronRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Organisations</CardTitle>
            <CardDescription>
              Manage all organisations on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/admin/organisations">
                <Building2 className="mr-2 h-4 w-4" />
                Manage Organisations
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Users</CardTitle>
            <CardDescription>
              View and manage all users across all organisations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

