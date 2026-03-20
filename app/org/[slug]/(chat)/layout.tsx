import { cookies } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getProfileById, getOrganizationBySlug, getOrganizationMembership } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

export default function Layout({
  children,
  params,
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
          <SidebarWrapper params={params}>{children}</SidebarWrapper>
        </Suspense>
      </DataStreamProvider>
    </>
  );
}

async function SidebarWrapper({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [supabase, cookieStore] = await Promise.all([
    createClient(),
    cookies(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  // Fetch the profile and org context for the sidebar
  const profile = user ? await getProfileById(user.id) : null;
  const org = await getOrganizationBySlug(slug);
  const membership = org && user ? await getOrganizationMembership(org.id, user.id) : null;

  const orgInfo = org ? {
    name: org.name,
    slug: org.slug,
    role: membership?.role ?? (profile?.isGlobalAdmin ? "admin" : "member"),
  } : undefined;

  return (
    <SidebarProvider defaultOpen={!isCollapsed} className="admin-shell h-screen overflow-hidden">
      <AppSidebar user={user ?? undefined} userRole={profile?.role} isGlobalAdmin={profile?.isGlobalAdmin} orgInfo={orgInfo} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
