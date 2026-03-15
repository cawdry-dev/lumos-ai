"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useState } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import { resolveAttachmentUrl } from "@/lib/supabase/storage";
import { BookOpen, Database, FileTextIcon, Globe, ImageIcon, WrenchIcon } from "lucide-react";
import { SparklesIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

const PurePreviewMessage = ({
  addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  const imageAttachments = attachmentsFromMessage.filter((a) =>
    a.mediaType?.startsWith("image/")
  );
  const documentAttachments = attachmentsFromMessage.filter(
    (a) => a.mediaType && !a.mediaType.startsWith("image/")
  );

  useDataStream();

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": message.role === "user" && mode !== "edit",
          "justify-start": message.role === "assistant",
        })}
      >
        {message.role === "assistant" && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div
          className={cn("flex flex-col", {
            "gap-2 md:gap-4": message.parts?.some(
              (p) => p.type === "text" && p.text?.trim()
            ),
            "w-full":
              (message.role === "assistant" &&
                (message.parts?.some(
                  (p) => p.type === "text" && p.text?.trim()
                ) ||
                  message.parts?.some((p) => p.type.startsWith("tool-")))) ||
              mode === "edit",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
              message.role === "user" && mode !== "edit",
          })}
        >
          {imageAttachments.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {imageAttachments.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name: attachment.filename ?? "file",
                    contentType: attachment.mediaType,
                    url: resolveAttachmentUrl(attachment.url),
                  }}
                  key={attachment.url}
                />
              ))}
            </div>
          )}

          {documentAttachments.length > 0 && (
            <div
              className="flex flex-col items-end gap-2"
              data-testid={"message-document-attachments"}
            >
              {documentAttachments.map((attachment) => {
                const fileName = attachment.filename ?? "file";
                const ext = fileName.split(".").pop()?.toUpperCase() ?? "DOC";
                const downloadUrl = resolveAttachmentUrl(attachment.url);

                return (
                  <a
                    className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
                    download={fileName}
                    href={downloadUrl}
                    key={attachment.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{fileName}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {ext}
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          {message.parts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            if (type === "reasoning") {
              const hasContent = part.text?.trim().length > 0;
              if (hasContent) {
                const isStreaming =
                  "state" in part && part.state === "streaming";
                return (
                  <MessageReasoning
                    isLoading={isLoading || isStreaming}
                    key={key}
                    reasoning={part.text}
                  />
                );
              }
            }

            if (type === "text") {
              if (mode === "view") {
                return (
                  <div key={key}>
                    <MessageContent
                      className={cn({
                        "wrap-break-word w-fit rounded-2xl px-3 py-2 text-right text-white":
                          message.role === "user",
                        "bg-transparent px-0 py-0 text-left":
                          message.role === "assistant",
                      })}
                      data-testid="message-content"
                      style={
                        message.role === "user"
                          ? { backgroundColor: "#006cff" }
                          : undefined
                      }
                    >
                      <Response>{sanitizeText(part.text)}</Response>
                    </MessageContent>
                  </div>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            if (type === "tool-getWeather") {
              const { toolCallId, state } = part;
              const approvalId = (part as { approval?: { id: string } })
                .approval?.id;
              const isDenied =
                state === "output-denied" ||
                (state === "approval-responded" &&
                  (part as { approval?: { approved?: boolean } }).approval
                    ?.approved === false);
              const widthClass = "w-[min(100%,450px)]";

              if (state === "output-available") {
                return (
                  <div className={widthClass} key={toolCallId}>
                    <Weather weatherAtLocation={part.output} />
                  </div>
                );
              }

              if (isDenied) {
                return (
                  <div className={widthClass} key={toolCallId}>
                    <Tool className="w-full" defaultOpen={true}>
                      <ToolHeader
                        state="output-denied"
                        type="tool-getWeather"
                      />
                      <ToolContent>
                        <div className="px-4 py-3 text-muted-foreground text-sm">
                          Weather lookup was denied.
                        </div>
                      </ToolContent>
                    </Tool>
                  </div>
                );
              }

              if (state === "approval-responded") {
                return (
                  <div className={widthClass} key={toolCallId}>
                    <Tool className="w-full" defaultOpen={true}>
                      <ToolHeader state={state} type="tool-getWeather" />
                      <ToolContent>
                        <ToolInput input={part.input} />
                      </ToolContent>
                    </Tool>
                  </div>
                );
              }

              return (
                <div className={widthClass} key={toolCallId}>
                  <Tool className="w-full" defaultOpen={true}>
                    <ToolHeader state={state} type="tool-getWeather" />
                    <ToolContent>
                      {(state === "input-available" ||
                        state === "approval-requested") && (
                        <ToolInput input={part.input} />
                      )}
                      {state === "approval-requested" && approvalId && (
                        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                          <button
                            className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => {
                              addToolApprovalResponse({
                                id: approvalId,
                                approved: false,
                                reason: "User denied weather lookup",
                              });
                            }}
                            type="button"
                          >
                            Deny
                          </button>
                          <button
                            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                            onClick={() => {
                              addToolApprovalResponse({
                                id: approvalId,
                                approved: true,
                              });
                            }}
                            type="button"
                          >
                            Allow
                          </button>
                        </div>
                      )}
                    </ToolContent>
                  </Tool>
                </div>
              );
            }

            if (type === "tool-createDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error creating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <DocumentPreview
                  isReadonly={isReadonly}
                  key={toolCallId}
                  result={part.output}
                />
              );
            }

            if (type === "tool-updateDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error updating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <div className="relative" key={toolCallId}>
                  <DocumentPreview
                    args={{ ...part.output, isUpdate: true }}
                    isReadonly={isReadonly}
                    result={part.output}
                  />
                </div>
              );
            }

            if (type === "tool-perplexity_search") {
              const { toolCallId, state } = part;
              const isRunning =
                state === "input-available" || state === "input-streaming";

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-perplexity_search" />
                  <ToolContent>
                    {isRunning && (
                      <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground text-sm">
                        <Globe className="size-4 animate-pulse" />
                        <span>Searching the web…</span>
                      </div>
                    )}
                    {state === "output-available" && (() => {
                      const output = part.output as {
                        text?: string;
                        content?: string;
                        sources?: Array<{ title?: string; url?: string }>;
                      } | undefined;
                      const sources = Array.isArray(output?.sources) ? output.sources : [];
                      const answerText = output?.text ?? output?.content;

                      return (
                        <ToolOutput
                          errorText={undefined}
                          output={
                            <div className="space-y-2 px-2 py-1 text-sm">
                              {sources.length > 0 ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Globe className="size-4 text-blue-500" />
                                    <span className="font-medium">
                                      Found {sources.length} source{sources.length !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                  <ul className="space-y-1 pl-6">
                                    {sources.map((source, idx) => (
                                      <li key={idx}>
                                        {source.url ? (
                                          <a
                                            href={source.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:underline dark:text-blue-400"
                                          >
                                            {source.title || source.url}
                                          </a>
                                        ) : (
                                          <span>{source.title || "Untitled source"}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : answerText ? (
                                <div className="flex items-center gap-2">
                                  <Globe className="size-4 text-blue-500" />
                                  <span>Web search complete</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Globe className="size-4 text-blue-500" />
                                  <span>Web search complete</span>
                                </div>
                              )}
                            </div>
                          }
                        />
                      );
                    })()}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-image_generation") {
              const { toolCallId, state } = part;
              const isRunning =
                state === "input-available" || state === "input-streaming";

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-image_generation" />
                  <ToolContent>
                    {isRunning && (
                      <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground text-sm">
                        <ImageIcon className="size-4 animate-pulse" />
                        <span>Generating image…</span>
                      </div>
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          <div className="space-y-2 px-2 py-1">
                            {(part.output as { base64?: string; mediaType?: string })?.base64 ? (
                              <img
                                alt="Generated image"
                                className="max-w-full rounded-md"
                                src={`data:${(part.output as { base64: string; mediaType?: string }).mediaType ?? "image/png"};base64,${(part.output as { base64: string }).base64}`}
                              />
                            ) : (part.output as { url?: string })?.url ? (
                              <img
                                alt="Generated image"
                                className="max-w-full rounded-md"
                                src={(part.output as { url: string }).url}
                              />
                            ) : (
                              <div className="flex items-center gap-2 text-sm">
                                <ImageIcon className="size-4 text-green-500" />
                                <span>Image generation complete</span>
                              </div>
                            )}
                          </div>
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-searchKnowledge") {
              const { toolCallId, state } = part;
              const isRunning =
                state === "input-available" || state === "input-streaming";

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-searchKnowledge" />
                  <ToolContent>
                    {isRunning && (
                      <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground text-sm">
                        <BookOpen className="size-4 animate-pulse" />
                        <span>Searching knowledge base…</span>
                      </div>
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          <div className="flex items-center gap-2 px-2 py-1 text-sm">
                            <BookOpen className="size-4 text-green-500" />
                            <span>Knowledge base search complete</span>
                          </div>
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-queryDatabase") {
              const { toolCallId, state } = part;
              const isRunning =
                state === "input-available" || state === "input-streaming";

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-queryDatabase" />
                  <ToolContent>
                    {isRunning && (
                      <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground text-sm">
                        <Database className="size-4 animate-pulse" />
                        <span>Querying database…</span>
                      </div>
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          <div className="flex items-center gap-2 px-2 py-1 text-sm">
                            <Database className="size-4 text-green-500" />
                            <span>Database query complete</span>
                          </div>
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-requestSuggestions") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-requestSuggestions" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          "error" in part.output ? (
                            <div className="rounded border p-2 text-red-500">
                              Error: {String(part.output.error)}
                            </div>
                          ) : (
                            <DocumentToolResult
                              isReadonly={isReadonly}
                              result={part.output}
                              type="request-suggestions"
                            />
                          )
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            // Fallback for unknown / MCP tool types
            if (type.startsWith("tool-")) {
              const toolPart = part as unknown as {
                toolCallId: string;
                state: "input-streaming" | "input-available" | "output-available" | "output-error" | "output-denied" | "approval-requested" | "approval-responded";
                output?: unknown;
              };
              const toolName = type.replace(/^tool-/, "");
              const isRunning =
                toolPart.state === "input-available" || toolPart.state === "input-streaming";

              return (
                <Tool defaultOpen={true} key={toolPart.toolCallId}>
                  <ToolHeader state={toolPart.state} type={type as `tool-${string}`} title={toolName} />
                  <ToolContent>
                    {isRunning && (
                      <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground text-sm">
                        <WrenchIcon className="size-4 animate-pulse" />
                        <span>Running {toolName}…</span>
                      </div>
                    )}
                    {toolPart.state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={toolPart.output as React.ReactNode}
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}

          {!isReadonly && (
            <MessageActions
              chatId={chatId}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              setMode={setMode}
              vote={vote}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => {
  return (
    <div
      className="group/message fade-in w-full animate-in duration-300"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start justify-start gap-3">
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <div className="animate-pulse">
            <SparklesIcon size={14} />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="flex items-center gap-1 p-0 text-muted-foreground text-sm">
            <span className="animate-pulse">Thinking</span>
            <span className="inline-flex">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
