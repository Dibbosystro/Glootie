"use client";

import { useState } from "react";
import { BookOpen, Loader2, Package, RefreshCcw, Send, Sparkles } from "lucide-react";

interface ComposeTrace {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
}

interface ComposeResult {
  reply: string;
  raw: string;
  trace: ComposeTrace[];
  model: string;
  provider: string;
}

const SAMPLES = [
  "Hi, is the TC3.P in stock? I'm building a 1978 CB550 cafe racer and want to know if I can order today.",
  "I ordered last week and tracking says \"awaiting details from customer\". What do I do?",
  "Do you ship to the UK? And how long does it take?",
  "Is the X3.M Electrical Control Hub compatible with a 1990 Honda Shadow 600?"
];

export function ReplyComposer() {
  const [customerMessage, setCustomerMessage] = useState("");
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (!customerMessage.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/support/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerMessage })
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Compose failed.");
      } else {
        setResult(body as ComposeResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function copyReply() {
    if (!result?.reply) return;
    try {
      await navigator.clipboard.writeText(result.reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard not available
    }
  }

  function reset() {
    setCustomerMessage("");
    setResult(null);
    setError(null);
    setCopied(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Left: customer message input */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <label htmlFor="customer-message" className="text-sm font-bold text-[#1c1917]">
            Customer message
          </label>
          {customerMessage && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#78716c] hover:text-[#1c1917]"
            >
              <RefreshCcw className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-[#78716c]">Paste what the customer said. The agent will draft a reply grounded in the KB and live Shopify stock.</p>

        <textarea
          id="customer-message"
          value={customerMessage}
          onChange={(e) => setCustomerMessage(e.target.value)}
          placeholder="Paste customer message here..."
          rows={10}
          className="mt-3 w-full resize-y rounded-md border border-[#e7e5e4] bg-white p-3 text-sm text-[#1c1917] focus:border-[#b45309] focus:outline-none"
          disabled={loading}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={loading || !customerMessage.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-[#b45309] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#92400e] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Drafting reply..." : "Draft reply"}
          </button>
          <span className="text-[10px] text-[#78716c]">{customerMessage.length} / 4000 chars</span>
        </div>

        <div className="mt-4 border-t border-[#e7e5e4] pt-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78716c]">Try a sample</div>
          <div className="mt-2 space-y-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCustomerMessage(s)}
                className="block w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-left text-[11px] text-[#57534e] transition hover:border-[#fbbf24] hover:bg-[#fffbeb]"
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: generated reply */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <label htmlFor="reply-output" className="text-sm font-bold text-[#1c1917]">
            Generated reply
          </label>
          {result?.reply && (
            <button
              type="button"
              onClick={copyReply}
              className="inline-flex items-center gap-1 rounded-md border border-[#e7e5e4] bg-white px-2 py-1 text-[11px] font-bold text-[#1c1917] transition hover:border-[#fbbf24] hover:bg-[#fffbeb]"
            >
              <Send className="h-3 w-3" />
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>

        {loading && !result && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-[#e7e5e4] bg-[#fafaf9] p-4 text-sm text-[#78716c]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching KB and Shopify stock...
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-bold">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {result && (
          <>
            <textarea
              id="reply-output"
              value={result.reply}
              onChange={(e) => setResult({ ...result, reply: e.target.value })}
              rows={10}
              className="mt-3 w-full resize-y rounded-md border border-[#e7e5e4] bg-white p-3 text-sm text-[#1c1917] focus:border-[#b45309] focus:outline-none"
            />

            {result.raw && result.raw !== result.reply && (
              <details className="mt-3 rounded-md border border-[#e7e5e4] bg-[#fafaf9] p-3 text-xs text-[#57534e]">
                <summary className="cursor-pointer font-bold text-[#1c1917]">Citations, confidence, and gaps</summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] text-[#57534e]">{stripReplySection(result.raw)}</pre>
              </details>
            )}

            {result.trace.length > 0 && (
              <details className="mt-3 rounded-md border border-[#e7e5e4] bg-[#fafaf9] p-3 text-xs text-[#57534e]">
                <summary className="cursor-pointer font-bold text-[#1c1917]">
                  Tools used ({result.trace.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {result.trace.map((t, i) => (
                    <div key={i} className="rounded-md border border-[#e7e5e4] bg-white p-2">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-[#1c1917]">
                        {t.tool === "search_kb" ? <BookOpen className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                        {t.tool}
                      </div>
                      <div className="mono mt-1 text-[10px] text-[#78716c]">input: {JSON.stringify(t.input)}</div>
                      <pre className="mono mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-[#57534e]">
                        {summarizeToolOutput(t.output)}
                      </pre>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="mt-3 text-[10px] text-[#78716c]">
              Model: {result.model} · Provider: {result.provider}
            </div>
          </>
        )}

        {!loading && !error && !result && (
          <p className="mt-3 rounded-md border border-dashed border-[#e7e5e4] bg-[#fafaf9] p-4 text-sm text-[#78716c]">
            Paste a customer message and click Draft reply. The output will appear here grounded in KB articles and current Shopify stock.
          </p>
        )}
      </div>
    </div>
  );
}

function stripReplySection(raw: string): string {
  return raw.replace(/^REPLY:\s*[\s\S]*?(?=\nCITATIONS:|$)/i, "").trim();
}

function summarizeToolOutput(output: unknown): string {
  if (output === null || output === undefined) return "no result";
  if (Array.isArray(output)) {
    if (output.length === 0) return "no matches";
    return output.map((row, i) => `${i + 1}. ${JSON.stringify(row)}`).join("\n");
  }
  return JSON.stringify(output, null, 2);
}
