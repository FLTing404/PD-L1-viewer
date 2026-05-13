"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, RotateCcw, Sparkles } from "lucide-react";
import { marked } from "marked";
import { Card, CardContent } from "@/components/ui/card";
import {
  useViewerStore,
  type ChatMessage,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { PREDEFINED_QUESTIONS } from "@/lib/agent/predefinedQuestions";

type GuidedQuestion = { id: string; label: string };

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface SsePart {
  choices?: Array<{ delta?: { content?: string } }>;
}

async function* iterateSse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (buffer.trim().length > 0) yield buffer;
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, "");
      buffer = buffer.slice(idx + 1);
      if (line.length > 0) yield line;
    }
  }
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const html = useMemo(() => {
    if (isUser) return null;
    try {
      return marked.parse(msg.content || "", { async: false }) as string;
    } catch {
      return msg.content;
    }
  }, [isUser, msg.content]);

  return (
    <div
      className={cn(
        "flex w-full gap-2",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {!isUser ? (
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bot className="size-3" />
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-2.5 py-1.5 text-[0.59rem] leading-snug",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted/60 text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : msg.content === "" ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
          </span>
        ) : (
          <div
            className="prose-chat"
            dangerouslySetInnerHTML={{ __html: html ?? "" }}
          />
        )}
      </div>
    </div>
  );
}

export function AiAssistantChatBody({
  className,
  hideChrome = false,
}: {
  className?: string;
  /** When true, hide header chrome (floating shell provides its own title bar). */
  hideChrome?: boolean;
}) {
  const caseId = useViewerStore((s) => s.caseId);
  const selectedPatchId = useViewerStore((s) => s.selectedPatchId);
  const threshold = useViewerStore((s) => s.threshold);
  const localRoi = useViewerStore((s) => s.localRoi);
  const messages = useViewerStore((s) => s.chatMessages);
  const status = useViewerStore((s) => s.chatStatus);
  const error = useViewerStore((s) => s.chatError);
  const append = useViewerStore((s) => s.appendChatMessage);
  const update = useViewerStore((s) => s.updateAssistantMessage);
  const setStatus = useViewerStore((s) => s.setChatStatus);
  const reset = useViewerStore((s) => s.resetChat);

  const [input, setInput] = useState("");
  const [guidedQuestions, setGuidedQuestions] = useState<GuidedQuestion[]>(() =>
    PREDEFINED_QUESTIONS.map(({ id, label }) => ({ id, label })),
  );
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/chat");
        if (!res.ok) return;
        const data = (await res.json()) as { questions?: GuidedQuestion[] };
        if (!cancelled && Array.isArray(data.questions)) {
          setGuidedQuestions(data.questions);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendGuided = useCallback(
    async (questionId: string, label: string) => {
      if (status === "streaming") return;
      if (!caseId) {
        append({
          id: makeId("u"),
          role: "user",
          content: label,
        });
        append({
          id: makeId("a"),
          role: "assistant",
          content:
            "**Note:** Load a case first — quick answers need the case manifest.",
        });
        return;
      }

      const userMsg: ChatMessage = {
        id: makeId("u"),
        role: "user",
        content: label,
      };
      const aiMsgId = makeId("a");
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
      };

      append(userMsg);
      append(aiMsg);
      setStatus("streaming");

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "guided",
            questionId,
            caseId,
            selectedPatchId,
            threshold,
            roiWorld: localRoi?.world ?? null,
          }),
          signal: ac.signal,
        });
        const rawText = await res.text();
        if (!res.ok) {
          let msg = `Request failed (${res.status})`;
          try {
            const parsed = JSON.parse(rawText) as { message?: string };
            if (parsed.message) msg = parsed.message;
          } catch {
            /* ignore */
          }
          update(aiMsgId, `**Error**: ${msg}`);
          setStatus("error", msg);
          return;
        }
        const data = JSON.parse(rawText) as { content?: string };
        update(aiMsgId, data.content ?? "_(empty response)_");
        setStatus("idle");
      } catch (err) {
        const aborted = (err as { name?: string }).name === "AbortError";
        if (aborted) {
          setStatus("idle");
        } else {
          update(aiMsgId, `**Error**: ${String(err)}`);
          setStatus("error", String(err));
        }
      } finally {
        abortRef.current = null;
      }
    },
    [
      append,
      update,
      setStatus,
      caseId,
      selectedPatchId,
      threshold,
      localRoi,
      status,
    ],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || status === "streaming") return;

      const userMsg: ChatMessage = {
        id: makeId("u"),
        role: "user",
        content: text,
      };
      const aiMsgId = makeId("a");
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
      };

      append(userMsg);
      append(aiMsg);
      setInput("");
      setStatus("streaming");

      const ac = new AbortController();
      abortRef.current = ac;

      const payload = {
        caseId,
        selectedPatchId,
        threshold,
        roiWorld: localRoi?.world ?? null,
        messages: [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          let parsed: { message?: string; error?: string } | null = null;
          try {
            parsed = JSON.parse(errText);
          } catch {
            /* ignore */
          }
          const msg =
            parsed?.message ?? parsed?.error ?? `Chat failed: ${res.status}`;
          update(
            aiMsgId,
            `**Error**: ${msg}\n\nCheck \`code/web-agent/.env.local\` and your DeepSeek API key.`,
          );
          setStatus("error", msg);
          return;
        }

        const reader = res.body.getReader();
        let acc = "";
        for await (const line of iterateSse(reader)) {
          if (!line.startsWith("data:")) continue;
          const payloadText = line.slice(5).trim();
          if (payloadText === "[DONE]") break;
          if (!payloadText) continue;
          try {
            const json = JSON.parse(payloadText) as SsePart;
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              update(aiMsgId, acc);
            }
          } catch {
            /* ignore non-JSON keepalive lines */
          }
        }
        if (acc.length === 0) {
          update(aiMsgId, "_(empty response)_");
        }
        setStatus("idle");
      } catch (err) {
        const aborted = (err as { name?: string }).name === "AbortError";
        if (aborted) {
          setStatus("idle");
        } else {
          update(aiMsgId, `**Error**: ${String(err)}`);
          setStatus("error", String(err));
        }
      } finally {
        abortRef.current = null;
      }
    },
    [
      append,
      update,
      setStatus,
      caseId,
      selectedPatchId,
      threshold,
      localRoi,
      messages,
      status,
    ],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void send(input);
    },
    [input, send],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send(input);
      }
    },
    [input, send],
  );

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const isOnline = true;
  const hasMessages = messages.length > 0;

  return (
    <Card
      className={cn(
        "flex flex-col gap-1.5 py-2.5",
        hideChrome
          ? "h-auto min-h-0 w-full shrink-0 bg-transparent shadow-none"
          : "flex h-full min-h-0 flex-1 flex-col",
        className,
      )}
    >
      <CardContent
        className={cn(
          "flex flex-col gap-1.5 px-2.5",
          hideChrome ? "h-auto min-h-0" : "h-full min-h-0",
        )}
      >
        {!hideChrome ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[0.59rem] font-semibold tracking-wide">
              <Sparkles className="size-3 text-primary" />
              Pathology Insight
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isOnline ? "bg-emerald-400" : "bg-muted-foreground",
                  )}
                />
                {isOnline ? "Online" : "Offline"}
              </span>
              {hasMessages ? (
                <button
                  type="button"
                  onClick={reset}
                  title="Clear chat"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <RotateCcw className="size-2.5" />
                </button>
              ) : null}
            </div>
          </div>
        ) : hasMessages ? (
          <div className="flex shrink-0 items-center justify-end">
            <button
              type="button"
              onClick={reset}
              title="Clear chat"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              <RotateCcw className="size-2.5" />
            </button>
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className={cn(
            "space-y-2 pr-1 text-[0.59rem] leading-snug",
            hideChrome
              ? "max-h-[calc(80vh-9rem)] min-h-[100px] shrink-0 overflow-y-auto"
              : "flex-1 min-h-0 overflow-y-auto",
          )}
        >
          {!hasMessages ? (
            <div
              className={cn(
                "flex flex-col gap-2",
                hideChrome ? "min-h-[200px]" : "h-full",
              )}
            >
              <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-2.5 text-[0.59rem] text-muted-foreground">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Bot className="size-3" />
                </div>
                <p className="leading-snug">
                  Hello. I&apos;m your TPS-Vis assistant—I can help you navigate the slide, summarize ROIs, or pull patch- and cell-level stats from the pipeline. Which case should we look at?
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Quick prompts
                </span>
                {guidedQuestions.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => void sendGuided(q.id, q.label)}
                    className="block w-full rounded-md bg-muted/40 px-2 py-1.5 text-left text-[0.59rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} msg={m} />)
          )}
        </div>

        {error && status !== "streaming" ? (
          <div className="rounded-md bg-destructive/10 px-2 py-1 text-[9px] text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="flex items-end gap-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything about this case…"
            rows={1}
            disabled={status === "streaming"}
            className="flex-1 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.59rem] leading-snug outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          {status === "streaming" ? (
            <button
              type="button"
              onClick={handleStop}
              className="rounded-md bg-destructive px-2 py-1.5 text-[0.59rem] font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              title="Stop"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-md bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              title="Send"
            >
              <Send className="size-3" />
            </button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/** Right column embedded layout; matches the original single-column card. */
export function AiAssistantPanel() {
  return <AiAssistantChatBody className="min-h-[280px]" />;
}
