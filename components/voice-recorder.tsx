"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const MAX_RECORDING_MS = 2 * 60 * 1000; // 2 minutes

type VoiceRecorderProps = {
  onTranscription: (text: string) => void;
  chatId?: string;
  disabled?: boolean;
};

export function VoiceRecorder({
  onTranscription,
  chatId,
  disabled = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the microphone
        for (const track of stream.getTracks()) {
          track.stop();
        }

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        if (audioBlob.size === 0) {
          toast.error("No audio recorded.");
          return;
        }

        setIsTranscribing(true);

        try {
          const formData = new FormData();
          formData.append(
            "audio",
            new File([audioBlob], "recording.webm", { type: "audio/webm" }),
          );
          if (chatId) {
            formData.append("chatId", chatId);
          }

          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(
              data.error || "Transcription failed. Please try again.",
            );
          }

          const data = await response.json();
          if (data.text) {
            onTranscription(data.text);
          } else {
            toast.error("No speech detected. Please try again.");
          }
        } catch (error) {
          console.error("[voice-recorder] Transcription error:", error);
          toast.error(
            error instanceof Error ? error.message : "Transcription failed.",
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after max duration
      timeoutRef.current = setTimeout(() => {
        stopRecording();
        toast.info("Recording stopped — maximum duration reached (2 minutes).");
      }, MAX_RECORDING_MS);
    } catch (error) {
      console.error("[voice-recorder] Microphone access error:", error);
      toast.error(
        "Could not access microphone. Please check your browser permissions.",
      );
    }
  }, [chatId, onTranscription, stopRecording]);

  const handleClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent",
              isRecording && "text-red-500 hover:text-red-600",
            )}
            disabled={disabled || isTranscribing}
            onClick={(e) => {
              e.preventDefault();
              handleClick();
            }}
            variant="ghost"
          >
            {isTranscribing ? (
              <TranscribingIcon />
            ) : isRecording ? (
              <RecordingIcon />
            ) : (
              <MicrophoneIcon size={14} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isTranscribing
              ? "Transcribing…"
              : isRecording
                ? "Stop recording"
                : "Voice input"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Pulsing red dot indicating active recording. */
function RecordingIcon() {
  return (
    <span className="relative flex size-3.5 items-center justify-center">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-red-500" />
    </span>
  );
}

/** Spinner shown while transcribing. */
function TranscribingIcon() {
  return (
    <svg
      className="size-3.5 animate-spin text-muted-foreground"
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

/** Microphone SVG icon. */
function MicrophoneIcon({ size = 16 }: { size?: number }) {
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
      <rect height="12" rx="4" width="8" x="8" y="2" />
      <path d="M19 10v1a7 7 0 01-14 0v-1" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

