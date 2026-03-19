"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useOrgPath } from "@/lib/org-url";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Memory = {
  id: string;
  content: string;
  createdAt: string;
};

export function ManageMemories() {
  const buildPath = useOrgPath();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Memory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch(buildPath("/api/memories"));
      if (!res.ok) throw new Error("Failed to load memories");
      const data = await res.json();
      setMemories(data);
    } catch {
      toast.error("Failed to load memories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleAdd = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const res = await fetch(buildPath("/api/memories"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save memory");
      }

      const created: Memory = await res.json();
      setMemories((prev) => [created, ...prev]);
      setNewContent("");
      setShowAddInput(false);
      toast.success("Memory saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save memory");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(buildPath("/api/memories"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!res.ok) throw new Error("Failed to delete memory");

      setMemories((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      toast.success("Memory deleted");
    } catch {
      toast.error("Failed to delete memory");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = memories.filter((m) =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={buildPath("/settings")}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="font-semibold text-2xl">Saved memories</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search memories…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Add memory */}
      {showAddInput ? (
        <div className="flex gap-2">
          <Input
            placeholder="Enter a memory…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) handleAdd();
              if (e.key === "Escape") {
                setShowAddInput(false);
                setNewContent("");
              }
            }}
            autoFocus
            disabled={saving}
          />
          <Button onClick={handleAdd} disabled={saving || !newContent.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAddInput(true)}
          className="gap-2"
        >
          <Plus className="size-4" />
          Add memory
        </Button>
      )}

      {/* Memory list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {searchQuery
            ? "No memories match your search."
            : "No saved memories yet. Lumos will automatically save important facts during your conversations."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((memory) => (
            <li
              key={memory.id}
              className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4"
            >
              <p className="flex-1 text-sm leading-relaxed">{memory.content}</p>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteTarget(memory)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this memory. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

