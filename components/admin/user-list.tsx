"use client";

import { useState, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const [memoryDialogUserId, setMemoryDialogUserId] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<{
    memoryEnabled: boolean;
    memoryCount: number;
  } | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const openMemoryDialog = useCallback(async (userId: string) => {
    setMemoryDialogUserId(userId);
    setMemoryStatus(null);
    setMemoryLoading(true);
    setClearConfirm(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}/memory`);
      if (!res.ok) {
        toast({ type: "error", description: "Failed to fetch memory status." });
        setMemoryDialogUserId(null);
        return;
      }
      const data = await res.json();
      setMemoryStatus(data);
    } catch {
      toast({ type: "error", description: "Failed to fetch memory status." });
      setMemoryDialogUserId(null);
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  const handleMemoryToggle = async () => {
    if (!memoryDialogUserId || !memoryStatus) return;
    setMemoryLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${memoryDialogUserId}/memory`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryEnabled: !memoryStatus.memoryEnabled }),
      });
      if (!res.ok) {
        toast({ type: "error", description: "Failed to update memory setting." });
        return;
      }
      const data = await res.json();
      setMemoryStatus(data);
      toast({
        type: "success",
        description: data.memoryEnabled
          ? "Memory enabled for user."
          : "Memory disabled for user.",
      });
    } catch {
      toast({ type: "error", description: "Failed to update memory setting." });
    } finally {
      setMemoryLoading(false);
    }
  };

  const handleClearMemories = async () => {
    if (!memoryDialogUserId) return;
    setMemoryLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${memoryDialogUserId}/memory`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast({ type: "error", description: "Failed to clear memories." });
        return;
      }
      setMemoryStatus((prev) => prev ? { ...prev, memoryCount: 0 } : prev);
      setClearConfirm(false);
      toast({ type: "success", description: "All memories cleared for user." });
    } catch {
      toast({ type: "error", description: "Failed to clear memories." });
    } finally {
      setMemoryLoading(false);
    }
  };

  const [deleteDialogUser, setDeleteDialogUser] = useState<UserRow | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteUser = async () => {
    if (!deleteDialogUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteDialogUser.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to delete user." });
        return;
      }

      setUserList((prev) => prev.filter((u) => u.id !== deleteDialogUser.id));
      setDeleteDialogUser(null);
      setDeleteConfirmEmail("");
      toast({ type: "success", description: "User deleted successfully." });
    } catch {
      toast({ type: "error", description: "Failed to delete user." });
    } finally {
      setDeleteLoading(false);
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
    <div className="overflow-x-auto rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="glass-table-header border-b text-left text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">Email</th>
            <th className="px-3 py-2.5 font-medium">Display Name</th>
            <th className="px-3 py-2.5 font-medium">Role</th>
            <th className="px-3 py-2.5 font-medium">Cost Limit</th>
            <th className="px-3 py-2.5 font-medium">MFA Exempt</th>
            <th className="px-3 py-2.5 font-medium">Memory</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {userList.map((u) => (
            <tr key={u.id} className="glass-table-row border-b last:border-0">
              <td className="px-3 py-3">{u.email}</td>
              <td className="px-3 py-3 text-muted-foreground">
                {u.displayName ?? "—"}
              </td>
              <td className="px-3 py-3">
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
              <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {u.dailyCostLimitCents != null || u.monthlyCostLimitCents != null
                  ? `${formatLimit(u.dailyCostLimitCents)}/day · ${formatLimit(u.monthlyCostLimitCents)}/mo`
                  : "Role default"}
              </td>
              <td className="px-3 py-3">
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
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => openMemoryDialog(u.id)}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
                >
                  Manage
                </button>
              </td>
              <td className="px-3 py-3">
                {u.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setDeleteDialogUser(u);
                      setDeleteConfirmEmail("");
                    }}
                    aria-label={`Delete user ${u.email}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {/* Memory management dialog */}
      <Dialog
        open={memoryDialogUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemoryDialogUserId(null);
            setClearConfirm(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Memory Management</DialogTitle>
            <DialogDescription>
              Manage memory settings for{" "}
              {userList.find((u) => u.id === memoryDialogUserId)?.email ?? "this user"}.
            </DialogDescription>
          </DialogHeader>

          {memoryLoading && !memoryStatus ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading…
            </p>
          ) : memoryStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Memory</p>
                  <p className="text-xs text-muted-foreground">
                    {memoryStatus.memoryEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleMemoryToggle}
                  disabled={memoryLoading}
                  className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
                    memoryStatus.memoryEnabled ? "bg-primary" : "bg-input"
                  }`}
                  role="switch"
                  aria-checked={memoryStatus.memoryEnabled}
                  aria-label="Toggle memory"
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      memoryStatus.memoryEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Stored memories</p>
                  <p className="text-xs text-muted-foreground">
                    {memoryStatus.memoryCount}{" "}
                    {memoryStatus.memoryCount === 1 ? "memory" : "memories"}
                  </p>
                </div>
                {memoryStatus.memoryCount > 0 && !clearConfirm && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={memoryLoading}
                    onClick={() => setClearConfirm(true)}
                  >
                    Clear all
                  </Button>
                )}
                {clearConfirm && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={memoryLoading}
                      onClick={() => setClearConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={memoryLoading}
                      onClick={handleClearMemories}
                    >
                      Confirm clear
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user confirmation dialog */}
      <Dialog
        open={deleteDialogUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogUser(null);
            setDeleteConfirmEmail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This will permanently delete the user and all their data. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-email">
                Type{" "}
                <span className="font-semibold">
                  {deleteDialogUser?.email}
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="delete-confirm-email"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder={deleteDialogUser?.email ?? ""}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={
                deleteLoading ||
                deleteConfirmEmail !== deleteDialogUser?.email
              }
              onClick={handleDeleteUser}
            >
              {deleteLoading ? "Deleting…" : "Delete user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

