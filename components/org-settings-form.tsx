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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface OrgSettingsFormProps {
  orgName: string;
  billingModel: string;
}

/**
 * Form to edit organisation name and billing model.
 * PATCHes to /org/[slug]/api/org/settings.
 */
export function OrgSettingsForm({ orgName, billingModel }: OrgSettingsFormProps) {
  const buildPath = useOrgPath();
  const [name, setName] = useState(orgName);
  const [billing, setBilling] = useState(billingModel);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(buildPath("/api/org/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), billingModel: billing }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update organisation.");
        return;
      }

      toast.success("Organisation settings updated.");
    } catch {
      toast.error("Failed to update organisation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Organisation Details</CardTitle>
        <CardDescription>
          Update your organisation&apos;s name and billing configuration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organisation name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-model">Billing model</Label>
            <Select value={billing} onValueChange={setBilling}>
              <SelectTrigger id="billing-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_token">Per token</SelectItem>
                <SelectItem value="per_seat">Per seat</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines how usage is billed for this organisation.
            </p>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

