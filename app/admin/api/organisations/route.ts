import { NextResponse } from "next/server";
import { auth } from "@/lib/supabase/auth";
import {
  getAllOrganizations,
  createOrganization,
  addOrganizationMember,
} from "@/lib/db/queries";

async function requireGlobalAdmin() {
  const session = await auth();
  if (!session || !session.user.isGlobalAdmin) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireGlobalAdmin();
  if (!session) {
    return NextResponse.json(
      { error: "Global admin access required." },
      { status: 403 },
    );
  }

  const organisations = await getAllOrganizations();
  return NextResponse.json(organisations);
}

export async function POST(request: Request) {
  const session = await requireGlobalAdmin();
  if (!session) {
    return NextResponse.json(
      { error: "Global admin access required." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { name, slug, billingModel } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Name and slug are required." },
      { status: 400 },
    );
  }

  const org = await createOrganization({ name, slug, billingModel });

  // Add the creating admin as an owner
  await addOrganizationMember({
    orgId: org.id,
    userId: session.user.id,
    role: "owner",
  });

  return NextResponse.json(org, { status: 201 });
}

