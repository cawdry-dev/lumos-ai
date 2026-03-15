"use client";

import { MfaVerify } from "@/components/mfa-verify";

/**
 * MFA verification page.
 * Shown when a user's session is at AAL1 and needs to be upgraded to AAL2.
 */
export default function MfaVerifyPage() {
  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl px-4 sm:px-16">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <h3 className="font-semibold text-xl dark:text-zinc-50">
            Verification Required
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Please complete two-factor authentication to continue.
          </p>
        </div>

        <MfaVerify />
      </div>
    </div>
  );
}

