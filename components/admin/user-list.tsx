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
};

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Email</th>
            <th className="pb-2 pr-4 font-medium">Display Name</th>
            <th className="pb-2 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {userList.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="py-3 pr-4">{u.email}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {u.displayName ?? "—"}
              </td>
              <td className="py-3">
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

