"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Common emoji options for quick selection. */
const EMOJI_OPTIONS = [
  "🤖", "📚", "🧠", "💡", "📊", "🔍", "💬", "🎯",
  "⚡", "🛠️", "📝", "🌐", "🔒", "📈", "🎨", "🧪",
];

export type CopilotFormData = {
  id?: string;
  name: string;
  description: string;
  emoji: string;
  type: "knowledge" | "data";
  systemPrompt: string;
  dbConnectionString: string;
  isActive: boolean;
};

const DEFAULTS: CopilotFormData = {
  name: "",
  description: "",
  emoji: "🤖",
  type: "knowledge",
  systemPrompt: "",
  dbConnectionString: "",
  isActive: true,
};

export function CopilotForm({
  initialData,
}: {
  initialData?: Partial<CopilotFormData> & { id?: string };
}) {
  const router = useRouter();
  const isEditing = !!initialData?.id;
  const [data, setData] = useState<CopilotFormData>({
    ...DEFAULTS,
    ...initialData,
  });
  const [saving, setSaving] = useState(false);

  const update = useCallback(
    <K extends keyof CopilotFormData>(key: K, value: CopilotFormData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim()) {
      toast({ type: "error", description: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      const url = isEditing ? `/api/copilots/${initialData!.id}` : "/api/copilots";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          description: data.description || "",
          emoji: data.emoji || null,
          type: data.type,
          systemPrompt: data.systemPrompt || null,
          dbConnectionString: data.dbConnectionString || null,
          isActive: data.isActive,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast({ type: "error", description: json.error ?? "Failed to save co-pilot." });
        return;
      }
      const json = await res.json();
      toast({ type: "success", description: isEditing ? "Co-pilot updated." : "Co-pilot created." });
      if (!isEditing) {
        router.push(`/admin/copilots/${json.copilot.id}`);
      } else {
        router.refresh();
      }
    } catch {
      toast({ type: "error", description: "Failed to save co-pilot." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Emoji picker */}
      <div className="space-y-2">
        <Label>Emoji</Label>
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => update("emoji", e)}
              className={`rounded-md border p-2 text-xl transition-colors hover:bg-muted ${
                data.emoji === e ? "border-primary bg-primary/10" : "border-transparent"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. HR Assistant"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={data.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="A brief description of what this co-pilot does"
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={data.type}
          onValueChange={(v) => update("type", v as "knowledge" | "data")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="knowledge">Knowledge</SelectItem>
            <SelectItem value="data">Data</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {data.type === "knowledge"
            ? "Knowledge co-pilots use uploaded documents for RAG retrieval."
            : "Data co-pilots query an external Postgres database."}
        </p>
      </div>

      {/* System prompt */}
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          value={data.systemPrompt}
          onChange={(e) => update("systemPrompt", e.target.value)}
          placeholder="You are a helpful assistant that..."
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          Custom persona instructions prepended to every conversation.
        </p>
      </div>

      {/* DB connection string (shown for data type only) */}
      {data.type === "data" && (
        <div className="space-y-2">
          <Label htmlFor="dbConnectionString">Database Connection String</Label>
          <Input
            id="dbConnectionString"
            type="password"
            value={data.dbConnectionString}
            onChange={(e) => update("dbConnectionString", e.target.value)}
            placeholder="postgresql://user:pass@host:5432/dbname"
          />
          <p className="text-xs text-muted-foreground">
            Connection string for the external Postgres database. Stored securely.
          </p>
        </div>
      )}

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={data.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
        </label>
        <Label>Active</Label>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/copilots")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Co-pilot"}
        </Button>
      </div>
    </form>
  );
}

