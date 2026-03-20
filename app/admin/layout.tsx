import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/supabase/auth";
import { LayoutDashboard, Building2, Users, ArrowLeft } from "lucide-react";

export default async function GlobalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await auth();

  if (!session || !session.user.isGlobalAdmin) {
    redirect("/org/select");
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/organisations", label: "Organisations", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: Users },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border/40 bg-muted/30">
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-4">
          <span className="font-semibold text-lg">✦ Global Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border/40 p-3">
          <Link
            href="/org/select"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

