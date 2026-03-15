"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";

export type CopilotRow = {
  id: string;
  name: string;
  emoji: string | null;
  type: string;
  isActive: boolean;
};

export function CopilotList({ copilots }: { copilots: CopilotRow[] }) {
  const [list, setList] = useState(copilots);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/copilots/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to delete co-pilot." });
        return;
      }
      setList((prev) => prev.filter((c) => c.id !== id));
      toast({ type: "success", description: "Co-pilot deleted." });
    } catch {
      toast({ type: "error", description: "Failed to delete co-pilot." });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <span className="mr-2">{c.emoji ?? "🤖"}</span>
                {c.name}
              </td>
              <td className="py-3 pr-4">
                <Badge variant="secondary" className="capitalize">
                  {c.type}
                </Badge>
              </td>
              <td className="py-3 pr-4">
                <Badge variant={c.isActive ? "default" : "outline"}>
                  {c.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link href={`/admin/copilots/${c.id}`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={deletingId === c.id}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete co-pilot</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{c.name}&quot;?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(c.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && (
        <p className="py-4 text-center text-muted-foreground text-sm">
          No co-pilots yet. Create one to get started.
        </p>
      )}
    </div>
  );
}

