import { connection } from "next/server";
import { auth } from "@/lib/supabase/auth";
import { getAllUsersGlobal } from "@/lib/db/queries";
import { GlobalUserList } from "@/components/admin/global-user-list";

export default async function GlobalUsersPage() {
  await connection();
  const session = (await auth())!;

  const users = await getAllUsersGlobal();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-semibold text-3xl">Users</h1>
        <p className="text-muted-foreground">
          {users.length} user{users.length !== 1 ? "s" : ""} across all organisations
        </p>
      </div>

      <GlobalUserList users={users} currentUserId={session.user.id} />
    </div>
  );
}

