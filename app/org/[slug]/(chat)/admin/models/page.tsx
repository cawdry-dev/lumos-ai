import { connection } from "next/server";
import Link from "next/link";
import { ModelManagement } from "@/components/admin/model-management";
import { getGatewayModels } from "@/lib/ai/gateway";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { orgPath } from "@/lib/org-url";

export default async function AdminModelsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connection();
  const gatewayModels = await getGatewayModels();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={orgPath(slug, "/admin")}>
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl">Models</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Model Management</CardTitle>
          <CardDescription>
            Control which AI models are available to users. When no models are
            explicitly enabled, all models are visible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelManagement models={gatewayModels} />
        </CardContent>
      </Card>
    </div>
  );
}

