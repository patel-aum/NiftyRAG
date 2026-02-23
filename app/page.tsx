"use client";

import { useState, useCallback } from "react";
import { Send, Loader2, Database, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NiftyRAGLogo } from "@/components/niftyrag-logo";

const DEMO_QUERIES = [
  "Nifty 50 forecast Feb 2026",
  "Reliance recent performance?",
  "What are the key levels for Nifty?",
  "Top gainers and losers today",
];

type Message = { id: string; role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [ingestClickCount, setIngestClickCount] = useState(0);
  const ingestButtonDisabled = ingestClickCount >= 2;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(new Error(data.error || res.statusText || "Request failed"));
          setIsLoading(false);
          return;
        }

        const content = typeof data.content === "string" ? data.content : "";
        setMessages((prev) => [
          ...prev,
          { id: `assistant-${Date.now()}`, role: "assistant", content: content || "(No response)" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Network or unexpected error"));
      } finally {
        setIsLoading(false);
      }
    },
    [input, messages, isLoading]
  );

  const handleLoadData = useCallback(async () => {
    const nextCount = ingestClickCount + 1;
    setIngestClickCount(nextCount);

    if (nextCount >= 2) {
      setIngestMessage(
        `You are Rude, it costs me in $, if you press this button ${nextCount} times`
      );
      return;
    }

    setIngestMessage(null);
    setIngestLoading(true);
    try {
      const res = await fetch("/api/ingest");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIngestMessage(data.error || res.statusText || "Ingest failed");
        return;
      }
      const msg = data.chunksCreated != null
        ? `Loaded ${data.chunksCreated} chunks (${data.sources ?? "Nifty data"}). You can ask forecast questions now.`
        : "Data loaded. You can ask forecast questions now.";
      setIngestMessage(msg);
    } catch (err) {
      setIngestMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIngestLoading(false);
    }
  }, [ingestClickCount]);

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header with logo */}
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <NiftyRAGLogo size="md" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="hidden text-xs font-medium sm:inline">NSE Nifty 50</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              RAG + OpenAI
            </span>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <strong>Error:</strong> {error.message}
            </div>
          )}

          {messages.length === 0 && !error && (
            <div className="bg-grid-subtle rounded-2xl border border-border/80 bg-card/50 p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Ask Nifty 50 anything</h2>
                  <p className="text-sm text-muted-foreground">Forecasts, key levels, stocks — powered by RAG</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                The knowledge base loads automatically on your first question. You can also load it now to use mock Nifty data, NSE RSS, and Alpha Vantage.
              </p>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10",
                  ingestButtonDisabled && "cursor-not-allowed opacity-50"
                )}
                onClick={handleLoadData}
                disabled={ingestLoading || ingestButtonDisabled}
              >
                {ingestLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                Load Nifty data
              </Button>
              {ingestMessage && (
                <p className={cn(
                  "mt-3 text-sm",
                  ingestMessage.startsWith("Loaded") ? "text-emerald-500 dark:text-emerald-400" : "text-destructive",
                  ingestMessage.startsWith("You are Rude") && "font-medium text-amber-600 dark:text-amber-400"
                )}>
                  {ingestMessage}
                </p>
              )}
              <p className="mt-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Try a demo query
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEMO_QUERIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="rounded-lg border border-border/80 bg-muted/30 px-4 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-4 rounded-2xl px-4 py-4",
                  m.role === "user"
                    ? "ml-4 mr-12 bg-primary/10"
                    : "mr-4 ml-12 border border-border/60 bg-card/80"
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  m.role === "user" ? "bg-primary/20" : "bg-primary/15"
                )}>
                  {m.role === "user" ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    {m.role === "user" ? "You" : "NiftyRAG"}
                  </span>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="mr-4 ml-12 flex gap-4 rounded-2xl border border-border/60 bg-card/80 px-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
                <div className="flex flex-1 items-center gap-2 pt-0.5">
                  <span className="text-sm text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Input area + powered by */}
      <footer className="border-t border-border/80 bg-background/95 px-4 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Nifty 50, Reliance, forecast..."
            className="min-h-12 flex-1 rounded-xl border-border/80 bg-muted/30 px-4 focus-visible:ring-primary"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-muted-foreground">
          Powered by OpenAI · Astra DB · NSE
        </p>
      </footer>
    </div>
  );
}
