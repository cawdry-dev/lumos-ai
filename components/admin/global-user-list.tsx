"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Search, Shield } from "lucide-react";

type GlobalUser = {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  isGlobalAdmin: boolean;
  mfaExempt: boolean;
  organisations: {
    userId: string;
    orgId: string;
    orgName: string;
    orgSlug: string;
    role: string;
  }[];
};

export function GlobalUserList({
  users: initialUsers,
  currentUserId,
}: {
  users: GlobalUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggleGlobalAdmin = async (userId: string, current: boolean) => {
    if (userId === currentUserId) {
      toast.error("You cannot remove your own global admin status.");
      return;
    }

    const newValue = !current;
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, isGlobalAdmin: newValue } : u,
      ),
    );

    try {
      const res = await fetch(`/admin/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGlobalAdmin: newValue }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      toast.success(
        newValue ? "User granted global admin access." : "Global admin access revoked.",
      );
    } catch {
      // Revert
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isGlobalAdmin: current } : u,
        ),
      );
      toast.error("Failed to update global admin status.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All Users</CardTitle>
          <CardDescription>
            Manage users and toggle global admin privileges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-sm">
                      {u.displayName ?? u.email}
                    </p>
                    {u.isGlobalAdmin && (
                      <Badge variant="default" className="text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        Global Admin
                      </Badge>
                    )}
                  </div>
                  {u.displayName && (
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.organisations.map((org) => (
                      <Badge key={org.orgId} variant="outline" className="text-xs">
                        {org.orgName} ({org.role})
                      </Badge>
                    ))}
                    {u.organisations.length === 0 && (
                      <span className="text-xs text-muted-foreground">No organisations</span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Admin</span>
                  <Switch
                    checked={u.isGlobalAdmin}
                    onCheckedChange={() =>
                      handleToggleGlobalAdmin(u.id, u.isGlobalAdmin)
                    }
                    disabled={u.id === currentUserId}
                  />
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No users found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

