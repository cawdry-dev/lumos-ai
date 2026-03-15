"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";

/**
 * SMS MFA enrolment component.
 * Collects the user's phone number, enrols via Supabase Auth MFA,
 * then verifies the SMS code to complete enrolment.
 */
export function MfaSmsSetup({ onComplete }: { onComplete: () => void }) {
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleEnrol = async () => {
    if (!phone.trim()) return;

    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "phone",
        phone: phone.trim(),
      });

      if (error) {
        toast({ type: "error", description: error.message });
        return;
      }

      setFactorId(data.id);

      // Immediately challenge to send the SMS
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: data.id });

      if (challengeError) {
        toast({ type: "error", description: challengeError.message });
        return;
      }

      setChallengeId(challengeData.id);
      toast({ type: "success", description: "Verification code sent to your phone." });
    } catch {
      toast({ type: "error", description: "Failed to start SMS enrolment." });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || !challengeId || !verifyCode) return;

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode,
      });

      if (error) {
        toast({ type: "error", description: error.message });
        return;
      }

      toast({ type: "success", description: "Phone number verified successfully!" });
      onComplete();
    } catch {
      toast({ type: "error", description: "Failed to verify code." });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!challengeId) {
    return (
      <div className="flex flex-col items-center gap-4">
        <h4 className="font-medium text-lg">SMS Verification</h4>
        <p className="text-muted-foreground text-sm text-center">
          We&apos;ll send a verification code to your phone number each
          time you sign in.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Label htmlFor="phone-number">Phone number</Label>
          <Input
            id="phone-number"
            type="tel"
            placeholder="+44 7700 900000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
          <Button
            onClick={handleEnrol}
            disabled={isEnrolling || !phone.trim()}
          >
            {isEnrolling ? "Sending code…" : "Send verification code"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h4 className="font-medium text-lg">Enter SMS Code</h4>
      <p className="text-muted-foreground text-sm text-center">
        Enter the 6-digit code we sent to <strong>{phone}</strong>.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Label htmlFor="sms-code">Verification code</Label>
        <Input
          id="sms-code"
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

