"use client";

import { Shield, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SsoButtons } from "@/components/sso-buttons";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type LoginActionState, login } from "../actions";

const features = [
  {
    icon: Sparkles,
    title: "Intelligent Conversations",
    description:
      "Harness advanced AI to streamline your internal workflows and knowledge sharing.",
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description:
      "Your data stays protected with robust access controls and encryption at every layer.",
  },
  {
    icon: Zap,
    title: "Lightning-Fast Insights",
    description:
      "Get answers in seconds — no more digging through documents or waiting on colleagues.",
  },
];

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
    <div className="relative flex min-h-dvh w-screen flex-col overflow-hidden bg-background lg:flex-row">
      {/* Animated background orbs — smooth, subtle movement */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="animate-landing-orb absolute -left-32 -top-32 size-[500px] rounded-full opacity-20 blur-[80px]"
          style={{
            background:
              "radial-gradient(circle, rgb(var(--org-primary-rgb) / 0.4), transparent 70%)",
            animationDuration: "25s",
          }}
        />
        <div
          className="animate-landing-orb absolute -bottom-40 -right-40 size-[600px] rounded-full opacity-15 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, rgb(var(--org-secondary-rgb) / 0.35), transparent 70%)",
            animationDelay: "5s",
            animationDuration: "30s",
          }}
        />
        <div
          className="animate-landing-orb absolute left-1/2 top-1/3 size-[350px] rounded-full opacity-10 blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgb(var(--org-primary-rgb) / 0.3), transparent 70%)",
            animationDelay: "10s",
            animationDuration: "28s",
          }}
        />
      </div>

      {/* ── Hero section (left on desktop, top on mobile) ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:items-start lg:px-16 xl:px-24">
        <div className="animate-landing-fade-in max-w-lg">
          <h1 className="font-bold text-4xl tracking-tight text-foreground md:text-5xl lg:text-6xl">
            ✦ Lumos AI
          </h1>
          <p className="mt-3 text-lg italic text-muted-foreground md:text-xl">
            Guiding Conversations, Illuminating Insights
          </p>

          <div className="mt-10 flex flex-col gap-6">
            {features.map((feature, i) => (
              <div
                className="glass-subtle animate-landing-slide-up relative flex items-start gap-4 rounded-xl p-4 transition-all duration-300 hover:shadow-md"
                key={feature.title}
                style={{ animationDelay: `${(i + 1) * 150}ms` }}
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "rgb(var(--org-primary-rgb) / 0.12)",
                  }}
                >
                  <feature.icon
                    className="size-5"
                    style={{ color: "var(--org-primary)" }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Login form section (right on desktop, bottom on mobile) ── */}
      <div className="flex flex-1 items-center justify-center px-4 pb-12 lg:pb-0">
        <Card
          className="glass-elevated animate-landing-slide-up w-full max-w-md rounded-2xl border-0 shadow-xl"
          style={{ animationDelay: "200ms" }}
        >
          <CardHeader className="items-center text-center">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Use your email and password to sign in
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <AuthForm action={handleSubmit} defaultEmail={email}>
              <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Registration is by invitation only.
              </p>
            </AuthForm>

            {/* SSO divider and buttons */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <span className="text-xs text-muted-foreground">
                  or continue with
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              <SsoButtons />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
