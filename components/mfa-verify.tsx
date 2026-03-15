"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";

type Factor = {
  id: string;
  factor_type: string;
  friendly_name?: string;
  status: string;
};

/**
 * MFA challenge / verification component.
 * Shown at login when the user's session is at AAL1 but requires AAL2.
 * Supports both TOTP and SMS factors.
 */
export function MfaVerify() {
  const supabase = createClient();
  const router = useRouter();

  const [factors, setFactors] = useState<Factor[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<Factor | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run once on mount
  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast({ type: "error", description: "Failed to load MFA factors." });
      setIsLoading(false);
      return;
    }

    const verified: Factor[] = [
      ...(data.totp ?? []),
      ...(data.phone ?? []),
    ]
      .filter((f) => f.status === "verified")
      .map((f) => ({
        id: f.id,
        factor_type: f.factor_type,
        friendly_name: f.friendly_name,
        status: f.status,
      }));

    setFactors(verified);

    if (verified.length > 0) {
      await startChallenge(verified[0]);
    }
    setIsLoading(false);
  };

  const startChallenge = async (factor: Factor) => {
    setSelectedFactor(factor);
    setCode("");

    const { data, error } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });

    if (error) {
      toast({ type: "error", description: error.message });
      return;
    }

    setChallengeId(data.id);

    if (factor.factor_type === "phone") {
      toast({ type: "success", description: "Verification code sent to your phone." });
    }
  };

  const handleVerify = async () => {
    if (!selectedFactor || !challengeId || !code) return;

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: selectedFactor.id,
        challengeId,
        code,
      });

      if (error) {
        toast({ type: "error", description: error.message });
        return;
      }

      toast({ type: "success", description: "Verification successful!" });
      router.push("/");
      router.refresh();
    } catch {
      toast({ type: "error", description: "Verification failed." });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (factors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-muted-foreground text-sm">
          No MFA factors found. Please set up MFA first.
        </p>
        <Button onClick={() => router.push("/mfa/enrol")}>
          Set up MFA
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h4 className="font-medium text-lg">Two-Factor Authentication</h4>
      <p className="text-muted-foreground text-sm text-center">
        {selectedFactor?.factor_type === "totp"
          ? "Enter the code from your authenticator app."
          : "Enter the code sent to your phone."}
      </p>

      {factors.length > 1 && (
        <div className="flex gap-2">
          {factors.map((f) => (
            <Button
              key={f.id}
              variant={selectedFactor?.id === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => startChallenge(f)}
            >
              {f.factor_type === "totp" ? "Authenticator" : "SMS"}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Label htmlFor="mfa-code">Verification code</Label>
        <Input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        <Button
          onClick={handleVerify}
          disabled={isVerifying || code.length !== 6}
        >
          {isVerifying ? "Verifying…" : "Verify"}
        </Button>
        <Button
          variant="link"
          className="text-sm"
          onClick={() => router.push("/mfa/recovery")}
        >
          Use a recovery code instead
        </Button>
      </div>
    </div>
  );
}

