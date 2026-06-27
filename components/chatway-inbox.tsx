"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  Package,
  RefreshCcw,
  Send,
  Sparkles,
  StickyNote
} from "lucide-react";

interface WaitingConversation {
  id: string;
  contactName: string;
  contactId: string | null;
  isResolved: boolean;
  unreadMessages: number;
  createdAt: string;
  latestMessageContent: string;
  lastCustomerMessage: string;
  ageLabel: string;
}

interface ChatwayMessage {
  id: string;
  content: string;
  type: "message" | "note";
  sender: "customer" | "staff" | "bot";
  agentName: string | null;
  createdAt: string;
}

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

interface ProductHit {
  title: string;
  handle: string;
  shopifyId: string;
  price: string;
  inventoryQty: number;
  status: string;
  url: string;
}

export function ChatwayInbox() {
  const [conversations, setConversations] = useState<WaitingConversation[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selected, setSelected] = useState<WaitingConversation | null>(null);
  const [thread, setThread] = useState<ChatwayMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [draft, setDraft] = useState<ComposeResult | null>(null);
  const [reply, setReply] = useState("");
  const [generating, setGenerating] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const [resolveAfter, setResolveAfter] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendOk, setSendOk] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/support/chatway/conversations?pages=3", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setListError(body.error ?? "Failed to load conversations.");
      } else {
        setConversations(body.conversations as WaitingConversation[]);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  function resetDraft() {
    setDraft(null);
    setReply("");
    setComposeError(null);
    setProducts([]);
    setProductQuery("");
    setResolveAfter(false);
    setSendOk(null);
    setSendError(null);
  }

  async function selectConversation(c: WaitingConversation) {
    setSelected(c);
    resetDraft();
    setThread([]);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/support/chatway/messages?conversationId=${encodeURIComponent(c.id)}`, {
        cache: "no-store"
      });
      const body = await res.json();
      if (res.ok) setThread(body.messages as ChatwayMessage[]);
    } catch {
      // thread is best-effort; the reply can still be generated from lastCustomerMessage
    } finally {
      setThreadLoading(false);
    }
  }

  function lastCustomerText(): string {
    const fromThread = [...thread].reverse().find((m) => m.sender === "customer");
    return fromThread?.content || selected?.lastCustomerMessage || "";
  }

  async function generateReply() {
    const customerMessage = lastCustomerText();
    if (!customerMessage || generating) return;
    setGenerating(true);
    setComposeError(null);
    setDraft(null);
    setSendOk(null);
    setSendError(null);
    try {
      const res = await fetch("/api/support/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerMessage })
      });
      const body = await res.json();
      if (!res.ok) {
        setComposeError(body.error ?? "Compose failed.");
      } else {
        const result = body as ComposeResult;
        setDraft(result);
        setReply(result.reply);
      }
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setGenerating(false);
    }
  }

  async function searchProducts() {
    const q = productQuery.trim();
    if (!q || productLoading) return;
    setProductLoading(true);
    try {
      const res = await fetch(`/api/support/chatway/products?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const body = await res.json();
      if (res.ok) setProducts(body.products as ProductHit[]);
    } catch {
      // ignore; picker is optional
    } finally {
      setProductLoading(false);
    }
  }

  function insertProduct(p: ProductHit) {
    const line = `${p.title}: ${p.url}`;
    setReply((prev) => (prev.trim() ? `${prev.trim()}\n\n${line}` : line));
  }

  async function send(type: "message" | "note") {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    setSendOk(null);
    setSendError(null);
    try {
      const res = await fetch("/api/support/chatway/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selected.id,
          content: reply,
          type,
          resolve: type === "message" ? resolveAfter : false
        })
      });
      const body = await res.json();
      if (!res.ok) {
        setSendError(body.error ?? "Send failed.");
      } else {
        setSendOk(type === "note" ? "Internal note added to the thread." : "Reply sent to the customer.");
        // Drop a fully-handled thread from the waiting list.
        if (type === "message") {
          setConversations((prev) => prev.filter((c) => c.id !== selected.id));
        }
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* Left: waiting list */}
      <div className="card flex max-h-[78vh] flex-col p-0">
        <div className="flex items-center justify-between border-b border-[#e7e5e4] px-4 py-3">
          <div className="text-sm font-bold text-[#1c1917]">
            Waiting <span className="text-[#78716c]">({conversations.length})</span>
          </div>
          <button
            type="button"
            onClick={() => void loadConversations()}
            disabled={listLoading}
            className="inline-flex items-center gap-1 rounded-md border border-[#e7e5e4] bg-white px-2 py-1 text-[11px] font-bold text-[#1c1917] transition hover:border-[#fbbf24] hover:bg-[#fffbeb] disabled:opacity-50"
          >
            {listLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listError && (
            <div className="m-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">{listError}</div>
          )}
          {!listError && conversations.length === 0 && !listLoading && (
            <p className="p-4 text-sm text-[#78716c]">No customers waiting in the recent threads. Nice.</p>
          )}
          {conversations.map((c) => {
            const active = selected?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => void selectConversation(c)}
                className={`block w-full border-b border-[#f0eeec] px-4 py-3 text-left transition hover:bg-[#fffbeb] ${
                  active ? "bg-[#fffbeb]" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-[#1c1917]">{c.contactName}</span>
                  <span className="shrink-0 text-[10px] text-[#78716c]">{c.ageLabel}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-[#57534e]">{c.lastCustomerMessage}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: thread + composer */}
      <div className="card flex max-h-[78vh] flex-col p-0">
        {!selected && (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#78716c]">
            Select a conversation to view the thread and draft a reply.
          </div>
        )}

        {selected && (
          <>
            <div className="border-b border-[#e7e5e4] px-4 py-3">
              <div className="text-sm font-bold text-[#1c1917]">{selected.contactName}</div>
              <div className="text-[10px] text-[#78716c]">Conversation {selected.id}</div>
            </div>

            {/* Thread */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {threadLoading && (
                <div className="flex items-center gap-2 text-sm text-[#78716c]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading thread...
                </div>
              )}
              {thread.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-md border p-2.5 text-sm ${
                    m.sender === "customer"
                      ? "border-[#e7e5e4] bg-[#fafaf9] text-[#1c1917]"
                      : m.sender === "staff"
                        ? "ml-auto border-[#fde68a] bg-[#fffbeb] text-[#1c1917]"
                        : "mx-auto border-dashed border-[#e7e5e4] bg-white text-[#78716c]"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
                    {m.sender === "customer"
                      ? selected.contactName
                      : m.sender === "staff"
                        ? m.agentName || "CRG"
                        : "system"}
                    {m.type === "note" ? " · note" : ""}
                  </div>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="border-t border-[#e7e5e4] p-4">
              {!draft && (
                <button
                  type="button"
                  onClick={() => void generateReply()}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-md bg-[#b45309] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#92400e] disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Drafting (KB + live Shopify)..." : "Generate reply"}
                </button>
              )}

              {composeError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {composeError}
                </div>
              )}

              {draft && (
                <div className="space-y-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={7}
                    className="w-full resize-y rounded-md border border-[#e7e5e4] bg-white p-3 text-sm text-[#1c1917] focus:border-[#b45309] focus:outline-none"
                  />

                  {draft.raw && draft.raw !== draft.reply && (
                    <details className="rounded-md border border-[#e7e5e4] bg-[#fafaf9] p-3 text-xs text-[#57534e]">
                      <summary className="cursor-pointer font-bold text-[#1c1917]">Citations, confidence, gaps</summary>
                      <pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] text-[#57534e]">
                        {stripReplySection(draft.raw)}
                      </pre>
                    </details>
                  )}

                  {draft.trace.length > 0 && (
                    <details className="rounded-md border border-[#e7e5e4] bg-[#fafaf9] p-3 text-xs text-[#57534e]">
                      <summary className="cursor-pointer font-bold text-[#1c1917]">Tools used ({draft.trace.length})</summary>
                      <div className="mt-2 space-y-2">
                        {draft.trace.map((t, i) => (
                          <div key={i} className="rounded-md border border-[#e7e5e4] bg-white p-2">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-[#1c1917]">
                              {t.tool === "search_kb" ? <BookOpen className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                              {t.tool}
                            </div>
                            <div className="mt-1 text-[10px] text-[#78716c]">input: {JSON.stringify(t.input)}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Product picker */}
                  <div className="rounded-md border border-[#e7e5e4] bg-[#fafaf9] p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void searchProducts();
                          }
                        }}
                        placeholder="Find a product to link (name or SKU)..."
                        className="flex-1 rounded-md border border-[#e7e5e4] bg-white px-2 py-1.5 text-xs text-[#1c1917] focus:border-[#b45309] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void searchProducts()}
                        disabled={productLoading || !productQuery.trim()}
                        className="inline-flex items-center gap-1 rounded-md border border-[#e7e5e4] bg-white px-2 py-1.5 text-[11px] font-bold text-[#1c1917] transition hover:border-[#fbbf24] hover:bg-[#fffbeb] disabled:opacity-50"
                      >
                        {productLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                        Search
                      </button>
                    </div>
                    {products.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {products.map((p) => (
                          <button
                            key={p.shopifyId}
                            type="button"
                            onClick={() => insertProduct(p)}
                            className="flex w-full items-center justify-between gap-2 rounded-md border border-[#e7e5e4] bg-white px-2 py-1.5 text-left text-[11px] text-[#57534e] transition hover:border-[#fbbf24] hover:bg-[#fffbeb]"
                          >
                            <span className="truncate">
                              <MessageSquarePlus className="mr-1 inline h-3 w-3" />
                              {p.title}
                            </span>
                            <span className="shrink-0 text-[10px] text-[#a8a29e]">
                              {p.status === "active" && p.inventoryQty > 0 ? `${p.inventoryQty} in stock` : p.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Send controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void send("message")}
                      disabled={sending || !reply.trim()}
                      className="inline-flex items-center gap-2 rounded-md bg-[#b45309] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#92400e] disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send to customer
                    </button>
                    <button
                      type="button"
                      onClick={() => void send("note")}
                      disabled={sending || !reply.trim()}
                      className="inline-flex items-center gap-2 rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm font-bold text-[#1c1917] transition hover:border-[#fbbf24] hover:bg-[#fffbeb] disabled:opacity-50"
                    >
                      <StickyNote className="h-4 w-4" />
                      Add as note
                    </button>
                    <label className="flex items-center gap-1.5 text-xs text-[#57534e]">
                      <input type="checkbox" checked={resolveAfter} onChange={(e) => setResolveAfter(e.target.checked)} />
                      Resolve after sending
                    </label>
                    <button
                      type="button"
                      onClick={() => void generateReply()}
                      disabled={generating}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#78716c] hover:text-[#1c1917]"
                    >
                      <RefreshCcw className="h-3 w-3" /> Regenerate
                    </button>
                  </div>

                  {sendOk && (
                    <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" /> {sendOk}
                    </div>
                  )}
                  {sendError && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">
                      <AlertCircle className="h-4 w-4" /> {sendError}
                    </div>
                  )}

                  <p className="text-[10px] text-[#a8a29e]">
                    Brand rules: no em or en dashes, never &quot;discontinued&quot; (say currently out of stock), public
                    Broadbeach address only, AUD, plain mechanic tone, no emoji. Check anything the draft flags before
                    sending.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function stripReplySection(raw: string): string {
  return raw.replace(/^REPLY:\s*[\s\S]*?(?=\nCITATIONS:|$)/i, "").trim();
}
