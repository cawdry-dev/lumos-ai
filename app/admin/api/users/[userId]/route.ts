import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import { setGlobalAdminStatus } from "@/lib/db/queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session || !session.user.isGlobalAdmin) {
    return NextResponse.json(
      { error: "Global admin access required." },
      { status: 403 },
    );
  }

  const { userId } = await params;
  const body = await request.json();

  if (typeof body.isGlobalAdmin === "boolean") {
    // Prevent removing your own global admin status
    if (userId === session.user.id && !body.isGlobalAdmin) {
      return NextResponse.json(
        { error: "You cannot remove your own global admin status." },
        { status: 400 },
      );
    }

    const updated = await setGlobalAdminStatus(userId, body.isGlobalAdmin);
    if (!updated) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, isGlobalAdmin: updated.isGlobalAdmin });
  }

  return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
}

