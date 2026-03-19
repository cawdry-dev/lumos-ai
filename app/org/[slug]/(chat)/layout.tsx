import { cookies } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getProfileById } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <Suspense fallback={<div className="flex h-dvh items-center justify-center"><Loader size={24} /></div>}>
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

  // Fetch the profile to get the user's role for the sidebar
  const profile = user ? await getProfileById(user.id) : null;

  return (
    <SidebarProvider defaultOpen={!isCollapsed} className="admin-shell h-screen overflow-hidden">
      <AppSidebar user={user ?? undefined} userRole={profile?.role} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
