"use client";

import { useState } from "react";
import { toast } from "@/components/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRow = {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  mfaExempt: boolean;
  dailyCostLimitCents?: number | null;
  monthlyCostLimitCents?: number | null;
};

/** Formats cents as pounds, or "—" if null/undefined. */
function formatLimit(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `£${(cents / 100).toFixed(2)}`;
}

export function UserList({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [userList, setUserList] = useState(users);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to update role." });
        return;
      }

      setUserList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast({ type: "success", description: "Role updated successfully." });
    } catch {
      toast({ type: "error", description: "Failed to update role." });
    }
  };

  const handleMfaExemptToggle = async (userId: string, exempt: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/mfa`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaExempt: exempt }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to update MFA exemption." });
        return;
      }

      setUserList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, mfaExempt: exempt } : u))
      );
      toast({
        type: "success",
        description: exempt
          ? "User exempted from MFA."
          : "MFA requirement restored for user.",
      });
    } catch {
      toast({ type: "error", description: "Failed to update MFA exemption." });
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Email</th>
            <th className="pb-2 pr-4 font-medium">Display Name</th>
            <th className="pb-2 pr-4 font-medium">Role</th>
            <th className="pb-2 pr-4 font-medium">Cost Limit</th>
            <th className="pb-2 font-medium">MFA Exempt</th>
          </tr>
        </thead>
        <tbody>
          {userList.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="py-3 pr-4">{u.email}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {u.displayName ?? "—"}
              </td>
              <td className="py-3 pr-4">
                {u.id === currentUserId ? (
                  <span className="text-muted-foreground capitalize">
                    {u.role}
                  </span>
                ) : (
                  <Select
                    value={u.role}
                    onValueChange={(value) => handleRoleChange(u.id, value)}
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </td>
              <td className="py-3 pr-4 text-xs text-muted-foreground tabular-nums">
                {u.dailyCostLimitCents != null || u.monthlyCostLimitCents != null
                  ? `${formatLimit(u.dailyCostLimitCents)}/day · ${formatLimit(u.monthlyCostLimitCents)}/mo`
                  : "Role default"}
              </td>
              <td className="py-3">
                {u.id === currentUserId ? (
                  <span className="text-muted-foreground text-xs">—</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleMfaExemptToggle(u.id, !u.mfaExempt)}
                    className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                      u.mfaExempt ? "bg-primary" : "bg-input"
                    }`}
                    role="switch"
                    aria-checked={u.mfaExempt}
                    aria-label={`${u.mfaExempt ? "Remove" : "Grant"} MFA exemption for ${u.email}`}
                  >
                    <span
                      className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                        u.mfaExempt ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {userList.length === 0 && (
        <p className="py-4 text-center text-muted-foreground text-sm">
          No users found.
        </p>
      )}
    </div>
  );
}

