"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NoAccessPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col items-center gap-8 overflow-hidden rounded-2xl px-4 text-center sm:px-16">
        <h3 className="font-semibold text-xl dark:text-zinc-50">
          No Access
        </h3>
        <p className="text-gray-500 text-sm dark:text-zinc-400">
          Your account does not have access to this application. Please contact
          an administrator for an invitation.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

