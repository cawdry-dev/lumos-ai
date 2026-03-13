import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}

