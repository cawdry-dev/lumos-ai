import { connection } from "next/server";
import Link from "next/link";
import { getAllOrganizations } from "@/lib/db/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default async function OrganisationsPage() {
  await connection();
  const organisations = await getAllOrganizations();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-3xl">Organisations</h1>
          <p className="text-muted-foreground">
            {organisations.length} organisation{organisations.length !== 1 ? "s" : ""} registered
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {organisations.map((org) => (
          <Card key={org.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{org.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span className="font-mono text-xs">/{org.slug}</span>
                    <Badge variant="outline" className="text-xs">
                      {org.billingModel === "per_token" ? "Per Token" : "Per Seat"}
                    </Badge>
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/organisations/${org.id}`}>
                    View Details
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>{org.memberCount} member{org.memberCount !== 1 ? "s" : ""}</span>
                <span>Created {new Date(org.createdAt).toLocaleDateString("en-GB")}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {organisations.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No organisations found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

