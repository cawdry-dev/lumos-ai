"use client";

import { MfaRecovery } from "@/components/mfa-recovery";

/**
 * MFA recovery page.
 * Allows users to bypass TOTP/SMS verification using a recovery code.
 */
export default function MfaRecoveryPage() {
  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl px-4 sm:px-16">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <h3 className="font-semibold text-xl dark:text-zinc-50">
            Account Recovery
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Lost access to your authenticator? Use a recovery code to
            sign in.
          </p>
        </div>

        <MfaRecovery />
      </div>
    </div>
  );
}

