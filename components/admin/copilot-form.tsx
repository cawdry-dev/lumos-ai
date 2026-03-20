"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrgPath } from "@/lib/org-url";
import { Plus, Trash2 } from "lucide-react";
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
import type { ChatModel } from "@/lib/ai/models";

/** Common emoji options for quick selection. */
const EMOJI_OPTIONS = [
  "🤖", "📚", "🧠", "💡", "📊", "🔍", "💬", "🎯",
  "⚡", "🛠️", "📝", "🌐", "🔒", "📈", "🎨", "🧪",
];

/** Shape of a single MCP server entry in the form. */
export interface McpServerEntry {
  name: string;
  url: string;
  apiKey: string;
  headers: string; // JSON string — parsed on submit
  instructions: string;
}

export type CopilotFormData = {
  id?: string;
  name: string;
  description: string;
  emoji: string;
  type: "knowledge" | "data";
  systemPrompt: string;
  dbConnectionString: string;
  dbType: "postgres" | "mysql";
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  sshPrivateKey: string;
  modelId: string;
  mcpServers: McpServerEntry[];
  enabledTools: string[];
  isActive: boolean;
};

const EMPTY_MCP_SERVER: McpServerEntry = {
  name: "",
  url: "",
  apiKey: "",
  headers: "",
  instructions: "",
};

const DEFAULTS: CopilotFormData = {
  name: "",
  description: "",
  emoji: "🤖",
  type: "knowledge",
  systemPrompt: "",
  dbConnectionString: "",
  dbType: "postgres",
  sshHost: "",
  sshPort: 22,
  sshUsername: "",
  sshPrivateKey: "",
  modelId: "",
  mcpServers: [],
  enabledTools: [],
  isActive: true,
};

export function CopilotForm({
  initialData,
}: {
  initialData?: Partial<CopilotFormData> & { id?: string };
}) {
  const router = useRouter();
  const buildPath = useOrgPath();
  const isEditing = !!initialData?.id;
  const [data, setData] = useState<CopilotFormData>({
    ...DEFAULTS,
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState<ChatModel[]>([]);

  // Fetch available models for the model selector
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch(buildPath("/api/admin/models"));
        if (!res.ok) return;
        const json = await res.json();
        const models = json.models as ChatModel[];
        const enabledIds = json.enabledModelIds as string[];
        // If no models are explicitly enabled, all are available
        if (enabledIds.length === 0) {
          setAvailableModels(models);
        } else {
          const enabledSet = new Set(enabledIds);
          setAvailableModels(models.filter((m) => enabledSet.has(m.id)));
        }
      } catch {
        // Silently fail — the selector will just be empty
      }
    }
    fetchModels();
  }, []);

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
      const url = isEditing ? buildPath(`/api/copilots/${initialData!.id}`) : buildPath("/api/copilots");
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
          dbConnectionString: data.type === "data" ? (data.dbConnectionString || null) : null,
          dbType: data.type === "data" ? data.dbType : null,
          sshHost: data.type === "data" && data.sshHost ? data.sshHost : null,
          sshPort: data.type === "data" && data.sshHost ? data.sshPort : null,
          sshUsername: data.type === "data" && data.sshHost ? (data.sshUsername || null) : null,
          sshPrivateKey: data.type === "data" && data.sshHost ? (data.sshPrivateKey || null) : null,
          modelId: data.modelId || null,
          enabledTools: data.enabledTools.length > 0 ? data.enabledTools : null,
          mcpServers: data.mcpServers.length > 0
            ? data.mcpServers
                .filter((s) => s.name.trim() && s.url.trim())
                .map((s) => ({
                  name: s.name.trim(),
                  url: s.url.trim(),
                  ...(s.apiKey ? { apiKey: s.apiKey } : {}),
                  ...(s.headers ? { headers: JSON.parse(s.headers) } : {}),
                  ...(s.instructions ? { instructions: s.instructions } : {}),
                }))
            : null,
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
        router.push(buildPath(`/admin/copilots/${json.copilot.id}`));
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
          className="glass-input"
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
          className="glass-input"
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

      {/* Enabled Tools */}
      <div className="space-y-2">
        <Label>Enabled Tools</Label>
        <p className="text-xs text-muted-foreground">
          Select which extra tools this co-pilot can use. The core tool
          ({data.type === "knowledge" ? "Knowledge Search" : "Database Query"}) is always enabled.
        </p>
        <div className="space-y-2">
          {[
            { id: "webSearch", label: "Web Search", desc: "Search the web for current information" },
            { id: "imageGen", label: "Image Generation", desc: "Generate images (GPT-5 models only)" },
            { id: "weather", label: "Weather", desc: "Check current weather conditions" },
            { id: "documents", label: "Documents & Artifacts", desc: "Create and edit documents, code, and spreadsheets" },
          ].map((tool) => (
            <label key={tool.id} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={data.enabledTools.includes(tool.id)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...data.enabledTools, tool.id]
                    : data.enabledTools.filter((t) => t !== tool.id);
                  update("enabledTools", next);
                }}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">{tool.label}</div>
                <div className="text-xs text-muted-foreground">{tool.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Locked model */}
      <div className="space-y-2">
        <Label>Locked Model</Label>
        <Select
          value={data.modelId || "__none__"}
          onValueChange={(v) => update("modelId", v === "__none__" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="No locked model (user chooses)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No locked model (user chooses)</SelectItem>
            {availableModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          When set, users chatting with this co-pilot will always use the
          selected model and cannot change it.
        </p>
      </div>

      {/* Data co-pilot configuration (shown for data type only) */}
      {data.type === "data" && (
        <>
          {/* Database type selector */}
          <div className="space-y-2">
            <Label>Database Type</Label>
            <div className="flex gap-4">
              {(["postgres", "mysql"] as const).map((dt) => (
                <label key={dt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dbType"
                    value={dt}
                    checked={data.dbType === dt}
                    onChange={() => update("dbType", dt)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{dt === "postgres" ? "Postgres" : "MySQL HeatWave"}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Connection string */}
          <div className="space-y-2">
            <Label htmlFor="dbConnectionString">Database Connection String</Label>
            <Input
              id="dbConnectionString"
              type="password"
              value={data.dbConnectionString}
              onChange={(e) => update("dbConnectionString", e.target.value)}
              placeholder={
                data.dbType === "postgres"
                  ? "postgresql://user:pass@host:5432/dbname"
                  : "mysql://user:pass@host:3306/dbname"
              }
              className="glass-input"
            />
            <p className="text-xs text-muted-foreground">
              Connection string for the external database. Stored securely.
            </p>
          </div>

          {/* SSH Tunnel configuration */}
          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-2 text-sm font-medium">SSH Tunnel (optional)</legend>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sshHost">SSH Host</Label>
                <Input
                  id="sshHost"
                  value={data.sshHost}
                  onChange={(e) => update("sshHost", e.target.value)}
                  placeholder="bastion.example.com"
                  className="glass-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sshPort">SSH Port</Label>
                <Input
                  id="sshPort"
                  type="number"
                  value={data.sshPort}
                  onChange={(e) => update("sshPort", Number(e.target.value) || 22)}
                  placeholder="22"
                  className="glass-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sshUsername">SSH Username</Label>
              <Input
                id="sshUsername"
                value={data.sshUsername}
                onChange={(e) => update("sshUsername", e.target.value)}
                placeholder="ec2-user"
                className="glass-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sshPrivateKey">SSH Private Key</Label>
              <Textarea
                id="sshPrivateKey"
                value={data.sshPrivateKey}
                onChange={(e) => update("sshPrivateKey", e.target.value)}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                PEM-format private key for the SSH bastion host.
              </p>
            </div>
          </fieldset>

          {/* Test Connection button */}
          <div>
            <TestConnectionButton data={data} />
          </div>
        </>
      )}

      {/* MCP Servers */}
      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-2 text-sm font-medium">MCP Servers (optional)</legend>
        <p className="text-xs text-muted-foreground">
          Connect external tool servers using the Model Context Protocol.
        </p>

        {data.mcpServers.map((server, idx) => (
          <div key={idx} className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Server {idx + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setData((prev) => ({
                    ...prev,
                    mcpServers: prev.mcpServers.filter((_, i) => i !== idx),
                  }));
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  value={server.name}
                  onChange={(e) => {
                    const updated = [...data.mcpServers];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    setData((prev) => ({ ...prev, mcpServers: updated }));
                  }}
                  placeholder="e.g. Jira"
                />
              </div>
              <div className="space-y-1">
                <Label>URL *</Label>
                <Input
                  value={server.url}
                  onChange={(e) => {
                    const updated = [...data.mcpServers];
                    updated[idx] = { ...updated[idx], url: e.target.value };
                    setData((prev) => ({ ...prev, mcpServers: updated }));
                  }}
                  placeholder="https://mcp.example.com/sse"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>API Key</Label>
              <Input
                type="password"
                value={server.apiKey}
                onChange={(e) => {
                  const updated = [...data.mcpServers];
                  updated[idx] = { ...updated[idx], apiKey: e.target.value };
                  setData((prev) => ({ ...prev, mcpServers: updated }));
                }}
                placeholder="Bearer token / API key"
              />
            </div>

            <div className="space-y-1">
              <Label>Headers (JSON)</Label>
              <Textarea
                value={server.headers}
                onChange={(e) => {
                  const updated = [...data.mcpServers];
                  updated[idx] = { ...updated[idx], headers: e.target.value };
                  setData((prev) => ({ ...prev, mcpServers: updated }));
                }}
                placeholder='{"X-Custom-Header": "value"}'
                rows={2}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label>Instructions</Label>
              <Textarea
                value={server.instructions}
                onChange={(e) => {
                  const updated = [...data.mcpServers];
                  updated[idx] = { ...updated[idx], instructions: e.target.value };
                  setData((prev) => ({ ...prev, mcpServers: updated }));
                }}
                placeholder="Additional instructions for the LLM when using this server's tools…"
                rows={2}
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setData((prev) => ({
              ...prev,
              mcpServers: [...prev.mcpServers, { ...EMPTY_MCP_SERVER }],
            }));
          }}
        >
          <Plus className="mr-1 size-4" />
          Add MCP Server
        </Button>
      </fieldset>

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
          onClick={() => router.push(buildPath("/admin/copilots"))}
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

/** Small inline component for the "Test Connection" button. */
function TestConnectionButton({ data }: { data: CopilotFormData }) {
  const buildPath = useOrgPath();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleTest = async () => {
    if (!data.dbConnectionString) {
      toast({ type: "error", description: "Please enter a connection string first." });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(buildPath("/api/copilots/test-connection"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbType: data.dbType,
          dbConnectionString: data.dbConnectionString,
          sshHost: data.sshHost || null,
          sshPort: data.sshPort,
          sshUsername: data.sshUsername || null,
          sshPrivateKey: data.sshPrivateKey || null,
        }),
      });
      const json = await res.json();
      setResult(json);
      if (json.success) {
        toast({ type: "success", description: "Connection successful!" });
      } else {
        toast({ type: "error", description: json.error ?? "Connection failed." });
      }
    } catch {
      setResult({ success: false, error: "Request failed." });
      toast({ type: "error", description: "Connection test request failed." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
        {testing ? "Testing…" : "Test Connection"}
      </Button>
      {result && (
        <span className={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
          {result.success ? "✓ Connected" : `✗ ${result.error}`}
        </span>
      )}
    </div>
  );
}
