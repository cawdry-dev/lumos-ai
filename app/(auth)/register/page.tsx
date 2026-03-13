"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import {
  type RegisterActionState,
  register,
  checkIsFirstUser,
} from "../actions";

export default function Page() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  );
}

function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: "idle",
    }
  );

  // Check whether this is the first user (bootstrap scenario)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run once on mount
  useEffect(() => {
    checkIsFirstUser().then(setIsFirstUser);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: router is a stable ref
  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ type: "error", description: "Account already exists!" });
    } else if (state.status === "failed") {
      toast({ type: "error", description: "Failed to create account!" });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "invalid_token") {
      toast({
        type: "error",
        description: "Invalid or expired invitation link.",
      });
    } else if (state.status === "success") {
      toast({ type: "success", description: "Account created successfully!" });

      setIsSuccessful(true);
      router.refresh();
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  // Still loading the first-user check
  if (isFirstUser === null) {
    return null;
  }

  // No token and not the first user — registration is invitation-only
  const showForm = !!token || isFirstUser;

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign Up</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            {showForm
              ? "Create an account with your email and password"
              : "Registration is by invitation only. Please ask an administrator for an invitation link."}
          </p>
        </div>
        {showForm && (
          <AuthForm action={handleSubmit} defaultEmail={email}>
            {token && <input type="hidden" name="token" value={token} />}
            <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>
            <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
              {"Already have an account? "}
              <Link
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
                href="/login"
              >
                Sign in
              </Link>
              {" instead."}
            </p>
          </AuthForm>
        )}
      </div>
    </div>
  );
}
