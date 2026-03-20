"use client";

import { useState } from "react";
import { useOrgPath } from "@/lib/org-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface OrgInviteFormProps {
  onMemberAdded?: () => void;
}

/**
 * Form to add a user to the organisation by email.
 * POSTs to /org/[slug]/api/org/members.
 */
export function OrgInviteForm({ onMemberAdded }: OrgInviteFormProps) {
  const buildPath = useOrgPath();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(buildPath("/api/org/members"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to add member.");
        return;
      }

      toast.success("Member added to organisation.");
      setEmail("");
      setRole("member");
      onMemberAdded?.();
    } catch {
      toast.error("Failed to add member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 space-y-2">
        <Label htmlFor="invite-email">Email address</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="w-32 space-y-2">
        <Label htmlFor="invite-role">Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger id="invite-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add member"}
      </Button>
    </form>
  );
}

