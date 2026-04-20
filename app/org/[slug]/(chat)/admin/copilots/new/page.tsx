import Link from "next/link";
import { CopilotForm } from "@/components/admin/copilot-form";
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

export default async function NewCopilotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={orgPath(slug, "/admin/copilots")}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl">New Co-pilot</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create Co-pilot</CardTitle>
          <CardDescription>
            Configure a new co-pilot with its persona, type, and access settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CopilotForm />
        </CardContent>
      </Card>
    </div>
  );
}

