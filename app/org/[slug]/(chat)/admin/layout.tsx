import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";
import { orgPath } from "@/lib/org-path";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const session = await auth(slug);

  if (!session || session.user.role !== "admin") {
    redirect(orgPath(slug, "/"));
  }

  return <>{children}</>;
}

