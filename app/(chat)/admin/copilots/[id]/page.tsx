import Link from "next/link";
import { notFound } from "next/navigation";
import { getCopilotById, getAllUsers } from "@/lib/db/queries";
import { CopilotForm } from "@/components/admin/copilot-form";
import { CopilotAccess } from "@/components/admin/copilot-access";
import { KnowledgeDocuments } from "@/components/admin/knowledge-documents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function EditCopilotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [copilotRow, users] = await Promise.all([
    getCopilotById(id),
    getAllUsers(),
  ]);

  if (!copilotRow) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/admin/copilots">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl">
          <span className="mr-2">{copilotRow.emoji ?? "🤖"}</span>
          {copilotRow.name}
        </h1>
      </div>

      {/* Edit form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Settings</CardTitle>
          <CardDescription>
            Update the co-pilot configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CopilotForm
            initialData={{
              id: copilotRow.id,
              name: copilotRow.name,
              description: copilotRow.description ?? "",
              emoji: copilotRow.emoji ?? "🤖",
              type: copilotRow.type as "knowledge" | "data",
              systemPrompt: copilotRow.systemPrompt ?? "",
              dbConnectionString: copilotRow.dbConnectionString ?? "",
              isActive: copilotRow.isActive,
            }}
          />
        </CardContent>
      </Card>

      {/* Knowledge documents (shown for knowledge-type co-pilots only) */}
      {copilotRow.type === "knowledge" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Knowledge Base</CardTitle>
            <CardDescription>
              Upload documents to build this co-pilot&apos;s knowledge base.
              Supported formats: .txt, .md, .pdf (max 10 MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KnowledgeDocuments copilotId={copilotRow.id} />
          </CardContent>
        </Card>
      )}

      {/* Access management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">User Access</CardTitle>
          <CardDescription>
            Control which users can access this co-pilot. When no users are
            explicitly added, the co-pilot is available to everyone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CopilotAccess
            copilotId={copilotRow.id}
            allUsers={users.map((u) => ({
              id: u.id,
              email: u.email,
              displayName: u.displayName,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

