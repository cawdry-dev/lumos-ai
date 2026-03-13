import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import type {
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  SharedV3Warning,
} from "@ai-sdk/provider";
import { getResponseChunksByPrompt } from "@/tests/prompts/utils";

const mockFinishReason: LanguageModelV3FinishReason = {
  unified: "stop",
  raw: "stop",
};

const mockUsage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 20, text: 20, reasoning: 0 },
};

const mockWarnings: SharedV3Warning[] = [];

const generateResult = (text: string): LanguageModelV3GenerateResult => ({
  finishReason: mockFinishReason,
  usage: mockUsage,
  content: [{ type: "text", text }],
  warnings: mockWarnings,
});

export const chatModel = new MockLanguageModelV3({
  doGenerate: async () => generateResult("Hello, world!"),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});

export const reasoningModel = new MockLanguageModelV3({
  doGenerate: async () => generateResult("Hello, world!"),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt, true),
    }),
  }),
});

export const titleModel = new MockLanguageModelV3({
  doGenerate: async () => generateResult("This is a test title"),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: [
        { id: "1", type: "text-start" as const },
        { id: "1", type: "text-delta" as const, delta: "This is a test title" },
        { id: "1", type: "text-end" as const },
        {
          type: "finish" as const,
          finishReason: mockFinishReason,
          usage: mockUsage,
        },
      ],
    }),
  }),
});

export const artifactModel = new MockLanguageModelV3({
  doGenerate: async () => generateResult("Hello, world!"),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});
