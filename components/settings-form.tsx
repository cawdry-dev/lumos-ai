"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { AccentColourPicker } from "@/components/accent-colour-picker";
import { useAccentColour } from "@/components/accent-colour-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const VOICES = [
  { id: "alloy", label: "Alloy", description: "Neutral and balanced" },
  { id: "ash", label: "Ash", description: "Soft and thoughtful" },
  { id: "coral", label: "Coral", description: "Warm and friendly" },
  { id: "sage", label: "Sage", description: "Calm and measured" },
  { id: "echo", label: "Echo", description: "Clear and bright" },
  { id: "shimmer", label: "Shimmer", description: "Expressive and lively" },
] as const;

type SettingsFormProps = {
  displayName: string;
  accentColour: string | null;
  ssoProvider: string | null;
  ttsVoice: string | null;
};

export function SettingsForm({
  displayName: initialDisplayName,
  accentColour: initialAccentColour,
  ssoProvider,
  ttsVoice: initialTtsVoice,
}: SettingsFormProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { accentColour, setAccentColour } = useAccentColour();

  // Display name state
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [savingName, setSavingName] = useState(false);

  // Voice state
  const [selectedVoice, setSelectedVoice] = useState(initialTtsVoice ?? "alloy");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Sync accent colour from DB on first load
  useState(() => {
    if (initialAccentColour && /^#[0-9a-fA-F]{6}$/.test(initialAccentColour)) {
      setAccentColour(initialAccentColour);
    }
  });

  const handleSaveDisplayName = async () => {
    setSavingName(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      toast.success("Display name updated");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save display name");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveAccentColour = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColour }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      toast.success("Accent colour saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save accent colour");
    }
  };

  const handleSaveVoice = async (voice: string) => {
    setSelectedVoice(voice);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttsVoice: voice }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      toast.success("Voice updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save voice");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Display Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Display Name</CardTitle>
          <CardDescription>
            Your display name is shown in the sidebar and to other users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="displayName" className="sr-only">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
            <Button onClick={handleSaveDisplayName} disabled={savingName}>
              {savingName ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accent Colour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Accent Colour</CardTitle>
          <CardDescription>
            Choose an accent colour for the interface. Save to sync across
            devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <AccentColourPicker />
            <Button onClick={handleSaveAccentColour} variant="outline">
              Save to account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      {!ssoProvider && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Change Password</CardTitle>
            <CardDescription>
              Update the password you use to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Theme</CardTitle>
          <CardDescription>
            Choose between light, dark, or system theme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "outline"}
                onClick={() => setTheme(t)}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Voice</CardTitle>
          <CardDescription>
            Choose a voice for text-to-speech playback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VOICES.map((v) => (
              <Button
                key={v.id}
                variant={selectedVoice === v.id ? "default" : "outline"}
                onClick={() => handleSaveVoice(v.id)}
                className="h-auto flex-col items-start px-3 py-2 text-left"
              >
                <span className="font-medium">{v.label}</span>
                <span className="text-xs opacity-70">{v.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

