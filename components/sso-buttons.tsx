"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * SSO login buttons for Azure AD (Microsoft) and GitLab.
 * Uses Supabase Auth's signInWithOAuth flow.
 */
export function SsoButtons() {
  const [loading, setLoading] = useState<"azure" | "gitlab" | null>(null);
  const supabase = createClient();

  const handleSsoLogin = async (provider: "azure" | "gitlab") => {
    setLoading(provider);

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error(`SSO login error (${provider}):`, error.message);
      setLoading(null);
    }
  };

  const btnClass =
    "glass-subtle flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3">
      {/* Azure AD (Microsoft) button */}
      <button
        className={btnClass}
        disabled={loading !== null}
        onClick={() => handleSsoLogin("azure")}
        type="button"
      >
        <MicrosoftIcon />
        {loading === "azure" ? "Redirecting…" : "Sign in with Microsoft"}
      </button>

      {/* GitLab button */}
      <button
        className={btnClass}
        disabled={loading !== null}
        onClick={() => handleSsoLogin("gitlab")}
        type="button"
      >
        <GitLabIcon />
        {loading === "gitlab" ? "Redirecting…" : "Sign in with GitLab"}
      </button>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 21 21"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#F25022" height="9" width="9" x="1" y="1" />
      <rect fill="#7FBA00" height="9" width="9" x="11" y="1" />
      <rect fill="#00A4EF" height="9" width="9" x="1" y="11" />
      <rect fill="#FFB900" height="9" width="9" x="11" y="11" />
    </svg>
  );
}

function GitLabIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 380 380"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M190 353.9L250.6 167.2H129.4L190 353.9Z" fill="#E24329" />
      <path d="M190 353.9L129.4 167.2H31.2L190 353.9Z" fill="#FC6D26" />
      <path
        d="M31.2 167.2L14.3 219.2C12.8 223.8 14.4 228.9 18.3 231.7L190 353.9L31.2 167.2Z"
        fill="#FCA326"
      />
      <path
        d="M31.2 167.2H129.4L89.6 44.6C87.9 39.6 80.9 39.6 79.2 44.6L31.2 167.2Z"
        fill="#E24329"
      />
      <path d="M190 353.9L250.6 167.2H348.8L190 353.9Z" fill="#FC6D26" />
      <path
        d="M348.8 167.2L365.7 219.2C367.2 223.8 365.6 228.9 361.7 231.7L190 353.9L348.8 167.2Z"
        fill="#FCA326"
      />
      <path
        d="M348.8 167.2H250.6L290.4 44.6C292.1 39.6 299.1 39.6 300.8 44.6L348.8 167.2Z"
        fill="#E24329"
      />
    </svg>
  );
}
