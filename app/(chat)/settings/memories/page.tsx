import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";
import { ManageMemories } from "@/components/manage-memories";

export default async function MemoriesPage() {
  await connection();
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <ManageMemories />
    </div>
  );
}

