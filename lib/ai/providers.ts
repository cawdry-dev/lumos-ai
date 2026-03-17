import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

/**
 * Shared helper to detect reasoning models by their model ID.
 * Matches models with "-thinking" suffix, "think" anywhere in the name
 * (covers Qwen's "think" and other "-thinking" variants), or "reasoning"
 * (but not "non-reasoning").
 */
export function isReasoningModel(modelId: string): boolean {
  if (modelId.includes("think")) return true;
  if (modelId.includes("reasoning") && !modelId.includes("non-reasoning"))
    return true;
  return false;
}

/**
 * Determine the correct tag name for extractReasoningMiddleware based on
 * the model provider. Qwen models emit `<think>` tags, while most others
 * (e.g. xAI/Grok) use `<thinking>`.
 */
function getReasoningTagName(modelId: string): string {
  if (modelId.startsWith("qwen/") || modelId.includes("qwen")) return "think";
  return "thinking";
}

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (isReasoningModel(modelId)) {
    const gatewayModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");

    return wrapLanguageModel({
      model: gateway.languageModel(gatewayModelId),
      middleware: extractReasoningMiddleware({
        tagName: getReasoningTagName(modelId),
      }),
    });
  }

  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return gateway.languageModel("google/gemini-2.5-flash-lite");
}

const DEFAULT_ARTIFACT_MODEL = "anthropic/claude-haiku-4.5";

export function getArtifactModel(modelId?: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return gateway.languageModel(modelId ?? DEFAULT_ARTIFACT_MODEL);
}

export function getArtifactModelId(modelId?: string): string {
  return modelId ?? DEFAULT_ARTIFACT_MODEL;
}
