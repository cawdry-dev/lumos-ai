import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/supabase/auth";
import { getOrganizationsByUserId } from "@/lib/db/queries";

/**
 * Organisation picker page.
 * Lists the user's organisations and lets them choose one (or create a new one).
 */
export default async function OrgSelectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const orgs = await getOrganizationsByUserId(session.user.id);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-semibold text-2xl">Select an organisation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose which organisation you&apos;d like to work in.
          </p>
        </div>

        {orgs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            You don&apos;t belong to any organisations yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/org/${org.slug}`}
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{org.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {org.slug}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

