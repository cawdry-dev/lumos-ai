import { cookies } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <Suspense fallback={<div className="flex h-dvh" />}>
          <SidebarWrapper>{children}</SidebarWrapper>
        </Suspense>
      </DataStreamProvider>
    </>
  );
}

async function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [supabase, cookieStore] = await Promise.all([
    createClient(),
    cookies(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={user ?? undefined} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
