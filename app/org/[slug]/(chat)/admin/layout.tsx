import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";
import { orgPath } from "@/lib/org-url";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const [session, { slug }] = await Promise.all([auth(), params]);

  if (!session || session.user.role !== "admin") {
    redirect(orgPath(slug, "/"));
  }

  return <>{children}</>;
}

