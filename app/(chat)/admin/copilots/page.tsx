import Link from "next/link";
import { getCopilots } from "@/lib/db/queries";
import { CopilotList } from "@/components/admin/copilot-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, ArrowLeft } from "lucide-react";

export default async function CopilotListPage() {
  const copilots = await getCopilots();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="font-semibold text-3xl">Co-pilots</h1>
        </div>
        <Button asChild>
          <Link href="/admin/copilots/new">
            <Plus className="mr-2 size-4" />
            New Co-pilot
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All Co-pilots</CardTitle>
          <CardDescription>
            Create and manage co-pilots with custom personas and knowledge bases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CopilotList
            copilots={copilots.map((c) => ({
              id: c.id,
              name: c.name,
              emoji: c.emoji,
              type: c.type,
              isActive: c.isActive,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

