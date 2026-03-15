import "server-only";

import OpenAI from "openai";
import { recordUsage } from "./usage";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

/**
 * Transcribes an audio file using OpenAI Whisper API.
 * Records usage with audio duration as a proxy for cost.
 */
export async function transcribeAudio(params: {
  audioFile: File;
  userId: string;
  chatId?: string | null;
}): Promise<{ text: string; durationSeconds: number }> {
  const transcription = await getOpenAI().audio.transcriptions.create({
    file: params.audioFile,
    model: "whisper-1",
    language: "en",
    response_format: "verbose_json",
  });

  const durationSeconds = Math.round(
    (transcription as { duration?: number }).duration ?? 0
  );

  // Record usage — use duration (seconds) as promptTokens proxy
  void recordUsage({
    userId: params.userId,
    chatId: params.chatId ?? null,
    modelId: "openai/whisper-1",
    promptTokens: durationSeconds,
    completionTokens: 0,
    usageType: "whisper",
  });

  return {
    text: transcription.text,
    durationSeconds,
  };
}

/**
 * Generates speech audio from text using OpenAI TTS API.
 * Returns a ReadableStream of audio data.
 * Records usage with character count as a proxy for cost.
 */
export async function generateSpeech(params: {
  text: string;
  userId: string;
  chatId?: string | null;
  voice?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const response = await getOpenAI().audio.speech.create({
    model: "tts-1",
    voice: (params.voice || "alloy") as any,
    input: params.text,
    response_format: "mp3",
  });

  const characterCount = params.text.length;

  // Record usage — use character count as promptTokens proxy
  void recordUsage({
    userId: params.userId,
    chatId: params.chatId ?? null,
    modelId: "openai/tts-1",
    promptTokens: characterCount,
    completionTokens: 0,
    usageType: "tts",
  });

  // Convert the Response body to a ReadableStream
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(uint8Array);
      controller.close();
    },
  });
}

