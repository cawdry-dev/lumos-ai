"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

/**
 * Form to create a new organisation.
 * POSTs to /api/org and redirects to the new org on success.
 */
export function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Auto-generate slug from name. */
  const handleNameChange = (value: string) => {
    setName(value);
    const generated = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to create organisation.");
        return;
      }

      const org = await res.json();
      toast.success("Organisation created!");
      router.push(`/org/${org.slug}`);
    } catch {
      toast.error("Failed to create organisation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create new organisation</CardTitle>
        <CardDescription>
          Set up a new organisation to collaborate with your team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organisation name</Label>
            <Input
              id="org-name"
              placeholder="My Organisation"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">URL slug</Label>
            <Input
              id="org-slug"
              placeholder="my-organisation"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$"
              title="Lowercase letters, numbers, and hyphens only"
            />
            <p className="text-xs text-muted-foreground">
              Your organisation will be accessible at <code>/org/{slug || "..."}</code>
            </p>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating…" : "Create organisation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

