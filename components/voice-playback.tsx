"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useOrgPath } from "@/lib/org-url";
import { cn } from "@/lib/utils";
import { Action } from "./elements/actions";

type VoicePlaybackProps = {
  messageText: string;
  chatId?: string;
};

export function VoicePlayback({ messageText, chatId }: VoicePlaybackProps) {
  const buildPath = useOrgPath();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const startPlayback = useCallback(async () => {
    if (!messageText.trim()) {
      toast.error("No text to read aloud.");
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(buildPath("/api/voice/speak"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText, chatId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate speech.");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        audioRef.current = null;
        toast.error("Audio playback failed.");
      };

      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return; // User cancelled — no error needed
      }
      console.error("[voice-playback] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Speech generation failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [messageText, chatId]);

  const handleClick = useCallback(() => {
    if (isPlaying || isLoading) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, isLoading, startPlayback, stopPlayback]);

  return (
    <Action
      className={cn(isPlaying && "text-primary")}
      disabled={!messageText.trim()}
      onClick={handleClick}
      tooltip={isLoading ? "Loading…" : isPlaying ? "Stop playback" : "Read aloud"}
    >
      {isLoading ? (
        <SpeechLoadingIcon />
      ) : isPlaying ? (
        <SpeechStopIcon />
      ) : (
        <SpeakerIcon />
      )}
    </Action>
  );
}

/** Speaker icon for TTS. */
function SpeakerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}

/** Stop icon shown during playback. */
function SpeechStopIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="12" rx="2" width="12" x="6" y="6" />
    </svg>
  );
}

/** Loading spinner for speech generation. */
function SpeechLoadingIcon() {
  return (
    <svg
      className="size-4 animate-spin text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        fill="currentColor"
      />
    </svg>
  );
}

