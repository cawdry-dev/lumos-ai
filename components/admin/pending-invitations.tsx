"use client";

import { useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  displayName?: string | null;
  expiresAt: string;
};

export function PendingInvitations({
  invitations: initialInvitations,
}: {
  invitations: InvitationRow[];
}) {
  const [invitations, setInvitations] = useState(initialInvitations);

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          type: "error",
          description: data.error ?? "Failed to revoke invitation.",
        });
        return;
      }

      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      toast({ type: "success", description: "Invitation revoked." });
    } catch {
      toast({ type: "error", description: "Failed to revoke invitation." });
    }
  };

  if (invitations.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        No pending invitations.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Email</th>
            <th className="pb-2 pr-4 font-medium">Role</th>
            <th className="pb-2 pr-4 font-medium">Expires</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <tr key={inv.id} className="border-b last:border-0">
              <td className="py-3 pr-4 text-muted-foreground">
                {inv.displayName || "—"}
              </td>
              <td className="py-3 pr-4">{inv.email}</td>
              <td className="py-3 pr-4 capitalize">{inv.role}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {new Date(inv.expiresAt).toLocaleDateString()}
              </td>
              <td className="py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleRevoke(inv.id)}
                >
                  Revoke
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

