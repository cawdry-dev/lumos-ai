import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import {
  getOrganizationById,
  updateOrganization,
} from "@/lib/db/queries";

async function requireGlobalAdmin() {
  const session = await auth();
  if (!session || !session.user.isGlobalAdmin) {
    return null;
  }
  return session;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const session = await requireGlobalAdmin();
  if (!session) {
    return NextResponse.json(
      { error: "Global admin access required." },
      { status: 403 },
    );
  }

  const { orgId } = await params;
  const org = await getOrganizationById(orgId);

  if (!org) {
    return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  }

  return NextResponse.json(org);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const session = await requireGlobalAdmin();
  if (!session) {
    return NextResponse.json(
      { error: "Global admin access required." },
      { status: 403 },
    );
  }

  const { orgId } = await params;
  const body = await request.json();
  const { name, slug, billingModel } = body;

  const updated = await updateOrganization(orgId, {
    ...(name !== undefined ? { name } : {}),
    ...(slug !== undefined ? { slug } : {}),
    ...(billingModel !== undefined ? { billingModel } : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

