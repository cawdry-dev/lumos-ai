"use client";

import { type FormEvent, useState } from "react";
import { toast } from "@/components/toast";
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

export function InvitationForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({ type: "error", description: "Please enter an email address." });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          type: "error",
          description: data.error ?? "Failed to send invitation.",
        });
        return;
      }

      const link = `${window.location.origin}/register?token=${data.token}`;
      toast({
        type: "success",
        description: `Invitation sent! Link: ${link}`,
      });

      setEmail("");
      setRole("editor");
    } catch {
      toast({ type: "error", description: "Failed to send invitation." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">Email address</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-role">Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40" id="invite-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Sending…" : "Send Invitation"}
      </Button>
    </form>
  );
}

