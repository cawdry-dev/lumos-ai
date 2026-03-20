import { NextResponse } from "next/server";
import { auth } from "@/lib/supabase/auth";
import { getAllUsersGlobal } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();
  if (!session || !session.user.isGlobalAdmin) {
    return NextResponse.json(
      { error: "Global admin access required." },
      { status: 403 },
    );
  }

  const users = await getAllUsersGlobal();
  return NextResponse.json(users);
}

