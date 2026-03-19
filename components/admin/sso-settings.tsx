"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";
import { Trash2 } from "lucide-react";

type AllowedDomainRow = {
  id: string;
  domain: string;
  defaultRole: string;
  ssoProvider: string;
  createdAt: string;
};

export function SsoSettings({
  initialDomains,
}: {
  initialDomains: AllowedDomainRow[];
}) {
  const [domains, setDomains] = useState<AllowedDomainRow[]>(initialDomains);
  const [newDomain, setNewDomain] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const [newProvider, setNewProvider] = useState("any");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newDomain.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: newDomain.trim().toLowerCase(),
          defaultRole: newRole,
          ssoProvider: newProvider,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to add domain." });
        return;
      }

      const created = await res.json();
      setDomains((prev) => [...prev, created]);
      setNewDomain("");
      toast({ type: "success", description: "Domain added successfully." });
    } catch {
      toast({ type: "error", description: "Failed to add domain." });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch("/api/admin/sso", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        toast({ type: "error", description: "Failed to remove domain." });
        return;
      }

      setDomains((prev) => prev.filter((d) => d.id !== id));
      toast({ type: "success", description: "Domain removed." });
    } catch {
      toast({ type: "error", description: "Failed to remove domain." });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Setup instructions */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <p className="mb-2 font-medium">SSO Provider Setup</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Azure AD:</strong> Register an app in the Azure Portal, configure the
            redirect URI to{" "}
            <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">
              {typeof window !== "undefined" ? window.location.origin : "https://your-domain"}/auth/callback
            </code>
            , then add the Client ID and Secret to the Supabase Dashboard under
            Authentication → Providers → Azure.
          </li>
          <li>
            <strong>GitLab:</strong> Register an application in GitLab Settings →
            Applications, set the redirect URI to the same callback URL, then add the
            credentials to Supabase under Authentication → Providers → GitLab.
          </li>
        </ul>
      </div>

      {/* Add domain form */}
      <div className="flex flex-col gap-3">
        <h3 className="font-medium text-sm text-muted-foreground">
          Add Whitelisted Domain
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sso-domain" className="text-xs">Domain</Label>
            <Input
              id="sso-domain"
              placeholder="yourcompany.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="glass-input w-56"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sso-role" className="text-xs">Default Role</Label>
            <select
              id="sso-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="glass-input h-9 rounded-md px-3 text-sm"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sso-provider" className="text-xs">Provider</Label>
            <select
              id="sso-provider"
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className="glass-input h-9 rounded-md px-3 text-sm"
            >
              <option value="any">Any</option>
              <option value="azure">Azure AD only</option>
              <option value="gitlab">GitLab only</option>
            </select>
          </div>
          <Button onClick={handleAdd} disabled={loading || !newDomain.trim()}>
            {loading ? "Adding…" : "Add Domain"}
          </Button>
        </div>
      </div>


      {/* Existing domains list */}
      <div className="flex flex-col gap-3">
        <h3 className="font-medium text-sm text-muted-foreground">
          Whitelisted Domains
        </h3>
        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No domains whitelisted yet. Users signing in via SSO will need an
            invitation to access the application.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="glass-table-header border-b text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Domain</th>
                  <th className="px-4 py-2.5 font-medium">Default Role</th>
                  <th className="px-4 py-2.5 font-medium">Provider</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d.id} className="glass-table-row border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{d.domain}</td>
                    <td className="px-4 py-2 capitalize">{d.defaultRole}</td>
                    <td className="px-4 py-2 capitalize">
                      {d.ssoProvider === "any" ? "Any" : d.ssoProvider === "azure" ? "Azure AD" : "GitLab"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(d.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
