import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { UserUsageDetail } from "@/components/admin/user-usage-detail";
import { orgPath } from "@/lib/org-path";

type PageProps = { params: Promise<{ slug: string; userId: string }> };

export default async function UserUsageDetailPage({ params }: PageProps) {
  const { slug, userId } = await params;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={orgPath(slug, "/admin/usage")}>
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl">User Usage Detail</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Usage Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <UserUsageDetail userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}

