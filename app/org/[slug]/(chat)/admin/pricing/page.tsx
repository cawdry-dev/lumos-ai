import Link from "next/link";
import { ModelPricingManager } from "@/components/admin/model-pricing";
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

export default async function AdminPricingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={orgPath(slug, "/admin")}>
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl">Model Pricing</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pricing Rules</CardTitle>
          <CardDescription>
            Configure cost-per-token pricing for each AI model. These prices are used to calculate
            estimated costs in the usage dashboard and enforce cost limits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelPricingManager />
        </CardContent>
      </Card>
    </div>
  );
}

