"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MfaSetup } from "@/components/mfa-setup";
import { MfaSmsSetup } from "@/components/mfa-sms-setup";
import { Button } from "@/components/ui/button";

type MfaMethod = "totp" | "sms";

/**
 * MFA enrolment page.
 * Users are redirected here when MFA is required but no factors are enrolled.
 * Supports both TOTP (authenticator app) and SMS enrolment.
 */
export default function MfaEnrolPage() {
  const router = useRouter();
  const [method, setMethod] = useState<MfaMethod>("totp");

  const handleComplete = () => {
    // After successful enrolment, redirect to the app
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl px-4 sm:px-16">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <h3 className="font-semibold text-xl dark:text-zinc-50">
            Set Up Two-Factor Authentication
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Your organisation requires multi-factor authentication.
            Please choose a method to secure your account.
          </p>
        </div>

        <div className="flex justify-center gap-2">
          <Button
            variant={method === "totp" ? "default" : "outline"}
            size="sm"
            onClick={() => setMethod("totp")}
          >
            Authenticator App
          </Button>
          <Button
            variant={method === "sms" ? "default" : "outline"}
            size="sm"
            onClick={() => setMethod("sms")}
          >
            SMS
          </Button>
        </div>

        {method === "totp" ? (
          <MfaSetup onComplete={handleComplete} />
        ) : (
          <MfaSmsSetup onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}

