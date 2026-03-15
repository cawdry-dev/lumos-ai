"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

type AccessUser = {
  userId: string;
  email: string;
  displayName: string | null;
  grantedAt: string;
};

type AvailableUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export function CopilotAccess({
  copilotId,
  allUsers,
}: {
  copilotId: string;
  allUsers: AvailableUser[];
}) {
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    try {
      const res = await fetch(`/api/copilots/${copilotId}/access`);
      if (!res.ok) {
        toast({ type: "error", description: "Failed to load access list." });
        return;
      }
      const data = await res.json();
      setAccessUsers(data.users);
    } catch {
      toast({ type: "error", description: "Failed to load access list." });
    } finally {
      setLoading(false);
    }
  }, [copilotId]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const handleGrant = async () => {
    if (!selectedUserId) return;
    setGranting(true);
    try {
      const res = await fetch(`/api/copilots/${copilotId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to grant access." });
        return;
      }
      toast({ type: "success", description: "Access granted." });
      setSelectedUserId("");
      await fetchAccess();
    } catch {
      toast({ type: "error", description: "Failed to grant access." });
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    setRevokingId(userId);
    try {
      const res = await fetch(`/api/copilots/${copilotId}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to revoke access." });
        return;
      }
      setAccessUsers((prev) => prev.filter((u) => u.userId !== userId));
      toast({ type: "success", description: "Access revoked." });
    } catch {
      toast({ type: "error", description: "Failed to revoke access." });
    } finally {
      setRevokingId(null);
    }
  };

  // Users not yet granted access
  const accessUserIds = new Set(accessUsers.map((u) => u.userId));
  const availableForGrant = allUsers.filter((u) => !accessUserIds.has(u.id));

  if (loading) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        Loading access list…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {accessUsers.length === 0
          ? "No explicit access restrictions — all users can access this co-pilot."
          : `${accessUsers.length} user(s) have explicit access. Other users will not see this co-pilot.`}
      </p>

      {/* Add user */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a user to grant access…" />
            </SelectTrigger>
            <SelectContent>
              {availableForGrant.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.email}{u.displayName ? ` (${u.displayName})` : ""}
                </SelectItem>
              ))}
              {availableForGrant.length === 0 && (
                <SelectItem value="__none" disabled>
                  All users already have access
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          disabled={!selectedUserId || granting}
          onClick={handleGrant}
        >
          {granting ? "Granting…" : "Grant Access"}
        </Button>
      </div>

      {/* Access list */}
      {accessUsers.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accessUsers.map((u) => (
              <tr key={u.userId} className="border-b last:border-0">
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {u.displayName ?? "—"}
                </td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={revokingId === u.userId}
                    onClick={() => handleRevoke(u.userId)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

