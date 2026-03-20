"use client";

import { useState } from "react";
import { useOrgPath } from "@/lib/org-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export interface OrgMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  joinedAt: string;
}

interface OrgMemberListProps {
  members: OrgMember[];
  currentUserId: string;
}

/**
 * Table listing all organisation members with role management and removal.
 */
export function OrgMemberList({ members: initialMembers, currentUserId }: OrgMemberListProps) {
  const buildPath = useOrgPath();
  const [members, setMembers] = useState(initialMembers);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(buildPath("/api/org/members"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update role.");
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m))
      );
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch(buildPath("/api/org/members"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to remove member.");
        return;
      }

      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success("Member removed.");
    } catch {
      toast.error("Failed to remove member.");
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
            <th className="px-3 py-2.5 font-medium">Joined</th>
            <th className="px-3 py-2.5 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId} className="glass-table-row border-b last:border-0">
              <td className="px-3 py-3">{member.email}</td>
              <td className="px-3 py-3 text-muted-foreground">
                {member.displayName ?? "—"}
              </td>
              <td className="px-3 py-3">
                {member.role === "owner" ? (
                  <Badge variant="default">Owner</Badge>
                ) : member.userId === currentUserId ? (
                  <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                ) : (
                  <Select
                    value={member.role}
                    onValueChange={(val) => handleRoleChange(member.userId, val)}
                  >
                    <SelectTrigger className="h-7 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {new Date(member.joinedAt).toLocaleDateString("en-GB")}
              </td>
              <td className="px-3 py-3 text-right">
                {member.userId !== currentUserId && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(member.userId)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

