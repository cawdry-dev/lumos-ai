"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Building2, ChevronDown, Settings, Shield, Users } from "lucide-react";
import { useOrgPath, useOrgSlug } from "@/lib/org-url";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { PlusIcon, TrashIcon } from "@/components/icons";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/sidebar-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export type OrgInfo = {
  name: string;
  slug: string;
  role: string;
};

export function AppSidebar({
  user,
  userRole,
  isGlobalAdmin,
  orgInfo,
}: {
  user: User | undefined;
  userRole?: string;
  isGlobalAdmin?: boolean;
  orgInfo?: OrgInfo;
}) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { mutate } = useSWRConfig();
  const buildPath = useOrgPath();
  const orgSlug = useOrgSlug();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [otherOrgs, setOtherOrgs] = useState<OrgInfo[]>([]);

  const isOrgAdmin = orgInfo?.role === "admin" || orgInfo?.role === "owner";

  // Fetch other orgs for the switcher
  useEffect(() => {
    fetch("/api/org")
      .then((res) => res.json())
      .then((orgs: OrgInfo[]) => {
        setOtherOrgs(orgs.filter((o) => o.slug !== orgSlug));
      })
      .catch(() => {});
  }, [orgSlug]);

  const handleDeleteAll = () => {
    const deletePromise = fetch(buildPath("/api/history"), {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        setShowDeleteAllDialog(false);
        router.replace(buildPath("/"));
        router.refresh();
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-r-0">
        <SidebarHeader>
          <SidebarMenu>
            <div className="flex flex-row items-center justify-between">
              <Link
                className="flex flex-row items-center gap-3"
                href={buildPath("/")}
                onClick={() => {
                  setOpenMobile(false);
                }}
              >
                <span className="sidebar-logo-glow cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                  ✦ Lumos AI
                </span>
              </Link>
              <div className="flex flex-row gap-1">
                {user && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="sidebar-glass-ghost h-8 rounded-lg p-1 md:h-fit md:p-2"
                        onClick={() => setShowDeleteAllDialog(true)}
                        type="button"
                        variant="ghost"
                      >
                        <TrashIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      Delete All Chats
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="sidebar-glass-ghost h-8 rounded-lg p-1 md:h-fit md:p-2"
                      onClick={() => {
                        setOpenMobile(false);
                        router.push(buildPath("/"));
                        router.refresh();
                      }}
                      type="button"
                      variant="ghost"
                    >
                      <PlusIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end" className="hidden md:block">
                    New Chat
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenu>
          {/* Organisation switcher */}
          {orgInfo && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="sidebar-glass-hover flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">{orgInfo.name}</span>
                  <ChevronDown className="ml-auto h-3 w-3 shrink-0 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {otherOrgs.map((org) => (
                  <DropdownMenuItem
                    key={org.slug}
                    className="cursor-pointer"
                    onSelect={() => router.push(`/org/${org.slug}`)}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    {org.name}
                  </DropdownMenuItem>
                ))}
                {otherOrgs.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => router.push("/org/select")}
                >
                  <PlusIcon />
                  <span className="ml-2">Create new organisation</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarHeader>
        <SidebarContent>
          <SidebarHistory user={user} />
        </SidebarContent>
        {(isOrgAdmin || userRole === "admin" || isGlobalAdmin) && (
          <div className="border-t border-border/10 px-2 py-2">
            {isOrgAdmin && (
              <>
                <Link
                  href={buildPath("/admin/members")}
                  className="sidebar-glass-hover flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  <Users className="h-4 w-4" />
                  Members
                </Link>
                <Link
                  href={buildPath("/settings/organisation")}
                  className="sidebar-glass-hover flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  Organisation Settings
                </Link>
              </>
            )}
            {userRole === "admin" && (
              <Link
                href={buildPath("/admin")}
                className="sidebar-glass-hover flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Link>
            )}
            {isGlobalAdmin && (
              <Link
                href="/admin"
                className="sidebar-glass-hover flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
              >
                <Shield className="h-4 w-4" />
                Global Admin
              </Link>
            )}
          </div>
        )}
        <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
