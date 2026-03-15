"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SsoButtons } from "@/components/sso-buttons";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { type LoginActionState, login } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    }
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: router is a stable ref
  useEffect(() => {
    if (state.status === "failed") {
      toast({
        type: "error",
        description: "Invalid credentials!",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h1 className="font-bold text-3xl tracking-tight dark:text-zinc-50">
            ✦ Lumos
          </h1>
          <p className="text-zinc-400 text-sm italic">
            Guiding Conversations, Illuminating Insights
          </p>
          <h3 className="mt-4 font-semibold text-xl dark:text-zinc-50">
            Sign In
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            Registration is by invitation only.
          </p>
        </AuthForm>

        {/* SSO divider and buttons */}
        <div className="flex flex-col gap-4 px-4 sm:px-16">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              or continue with
            </span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <SsoButtons />
        </div>
      </div>
    </div>
  );
}
