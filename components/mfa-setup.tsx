"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";

/**
 * TOTP MFA enrolment component.
 * Displays a QR code for the user to scan with their authenticator app,
 * then verifies the TOTP code to complete enrolment.
 */
export function MfaSetup({ onComplete }: { onComplete: () => void }) {
  const supabase = createClient();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleEnrol = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (error) {
        toast({ type: "error", description: error.message });
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch {
      toast({ type: "error", description: "Failed to start TOTP enrolment." });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || !verifyCode) return;

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) {
        toast({ type: "error", description: challengeError.message });
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) {
        toast({ type: "error", description: verifyError.message });
        return;
      }

      toast({ type: "success", description: "Authenticator app linked successfully!" });
      onComplete();
    } catch {
      toast({ type: "error", description: "Failed to verify code." });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!qrCode) {
    return (
      <div className="flex flex-col items-center gap-4">
        <h4 className="font-medium text-lg">Authenticator App</h4>
        <p className="text-muted-foreground text-sm text-center">
          Use an authenticator app (e.g. Google Authenticator, Authy) to
          generate time-based verification codes.
        </p>
        <Button onClick={handleEnrol} disabled={isEnrolling}>
          {isEnrolling ? "Setting up…" : "Set up authenticator"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h4 className="font-medium text-lg">Scan QR Code</h4>
      <p className="text-muted-foreground text-sm text-center">
        Scan this QR code with your authenticator app, then enter the
        6-digit code below.
      </p>
      {/* biome-ignore lint: QR code is a data URI from Supabase */}
      <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />
      {secret && (
        <div className="text-center">
          <p className="text-muted-foreground text-xs mb-1">
            Or enter this secret manually:
          </p>
          <code className="text-xs bg-muted px-2 py-1 rounded select-all">
            {secret}
          </code>
        </div>
      )}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Label htmlFor="totp-code">Verification code</Label>
        <Input
          id="totp-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={verifyCode}
          onChange={(e) => setVerifyCode(e.target.value)}
          autoFocus
        />
        <Button
          onClick={handleVerify}
          disabled={isVerifying || verifyCode.length !== 6}
        >
          {isVerifying ? "Verifying…" : "Verify and enable"}
        </Button>
      </div>
    </div>
  );
}

