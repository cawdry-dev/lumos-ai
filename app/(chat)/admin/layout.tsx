import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}

