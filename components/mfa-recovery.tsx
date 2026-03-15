"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";

/**
 * MFA recovery code entry component.
 * Allows users to bypass TOTP/SMS verification using a recovery code.
 */
export function MfaRecovery() {
  const supabase = createClient();
  const router = useRouter();

  const [recoveryCode, setRecoveryCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run once on mount
  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast({ type: "error", description: "Failed to load MFA factors." });
      return;
    }

    // Use the first verified TOTP factor for recovery
    const totpFactor = (data.totp ?? []).find(
      (f) => f.status === "verified"
    );
    if (totpFactor) {
      setFactorId(totpFactor.id);
    }
  };

  const handleRecover = async () => {
    if (!factorId || !recoveryCode.trim()) return;

    setIsVerifying(true);
    try {
      // Challenge the factor, then verify with the recovery code
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) {
        toast({ type: "error", description: challengeError.message });
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: recoveryCode.trim(),
      });

      if (verifyError) {
        toast({ type: "error", description: "Invalid recovery code. Please try again." });
        return;
      }

      toast({ type: "success", description: "Recovery successful!" });
      router.push("/");
      router.refresh();
    } catch {
      toast({ type: "error", description: "Recovery failed." });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <h4 className="font-medium text-lg">Recovery Code</h4>
      <p className="text-muted-foreground text-sm text-center max-w-sm">
        Enter one of the recovery codes you saved when setting up
        two-factor authentication. Each recovery code can only be used once.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Label htmlFor="recovery-code">Recovery code</Label>
        <Input
          id="recovery-code"
          type="text"
          placeholder="xxxx-xxxx-xxxx"
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value)}
          autoFocus
        />
        <Button
          onClick={handleRecover}
          disabled={isVerifying || !recoveryCode.trim()}
        >
          {isVerifying ? "Verifying…" : "Use recovery code"}
        </Button>
        <Button
          variant="link"
          className="text-sm"
          onClick={() => router.push("/mfa/verify")}
        >
          Back to verification
        </Button>
      </div>
    </div>
  );
}

