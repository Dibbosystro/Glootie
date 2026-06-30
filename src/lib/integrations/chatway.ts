import "server-only";

import { getServerEnv } from "@/lib/server-env";

// Read + write client for CRG's Chatway (website live-chat widget).
// API: https://developers.chatway.app/api/v1  (X-API-KEY header, JSON:API style).
// The conversation list does NOT say who spoke last (latest_message is only
// {content, url}), and pages are tiny (per_page 10, ~158 pages). So "who is
// waiting" needs a per-conversation last-message fetch. We bound that to the
// most recent pages and run the fetches with limited concurrency so the inbox
// route stays inside Vercel's 10s function budget.

const BASE = "https://developers.chatway.app/api/v1";
const MESSAGES_PER_PAGE = 20; // Chatway hard cap (limit > 20 returns 422).

export type ChatwaySender = "customer" | "staff" | "bot";
export type ChatwayMessageType = "message" | "note";

export interface ChatwayMessage {
  id: string;
  content: string;
  type: ChatwayMessageType;
  sender: ChatwaySender;
  agentName: string | null;
  createdAt: string;
}

export interface ChatwayConversation {
  id: string;
  contactName: string;
  contactId: string | null;
  isResolved: boolean;
  unreadMessages: number;
  createdAt: string;
  latestMessageContent: string;
}

export interface WaitingConversation extends ChatwayConversation {
  lastCustomerMessage: string;
  ageLabel: string;
}

export interface ChatwayAttachment {
  url: string;
  name?: string | null;
}

interface RawMessage {
  id: string;
  attributes: {
    content?: string | null;
    type?: string | null;
    origin?: string | null;
    created_at?: string | null;
    agent?: { id?: string; name?: string } | null;
    contact?: { id?: string; name?: string } | null;
  };
}

interface RawConversation {
  id: string;
  attributes: {
    contact_name?: string | null;
    contact_id?: string | null;
    is_resolved?: boolean;
    unread_messages?: number;
    created_at?: string | null;
    latest_message?: { content?: string | null } | null;
  };
}

interface Pagination {
  total_pages?: number;
  current_page?: number;
  total?: number;
  per_page?: number;
}

function apiKey(): string {
  const key = getServerEnv("CHATWAY_CRG_API_KEY");
  if (!key) throw new Error("CHATWAY_CRG_API_KEY is not configured (set it in Vercel env or .env.local).");
  return key;
}

function buildUrl(path: string, params?: Record<string, string | number>): string {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));
  return url.toString();
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  opts: { params?: Record<string, string | number>; body?: unknown; retries?: number } = {}
): Promise<T> {
  const { params, body, retries = 5 } = opts;
  const url = buildUrl(path, params);
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { "X-API-KEY": apiKey(), Accept: "application/json", "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store"
      });
    } catch {
      if (attempt === retries) throw new Error(`Chatway request failed (network): ${method} ${path}`);
      await sleep(Math.min(8000, 2 ** attempt * 300));
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    if ([429, 500, 502, 503, 504].includes(res.status) && attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 2 ** attempt * 300));
      continue;
    }
    const text = await res.text();
    throw new Error(`Chatway ${res.status} on ${method} ${path}: ${text.slice(0, 200)}`);
  }
  throw new Error(`Chatway request exhausted retries: ${method} ${path}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectSender(a: RawMessage["attributes"]): { sender: ChatwaySender; agentName: string | null } {
  if (a.agent && a.agent.id) return { sender: "staff", agentName: a.agent.name ?? null };
  if (a.contact && a.contact.id) return { sender: "customer", agentName: null };
  return { sender: "bot", agentName: null };
}

function mapMessage(raw: RawMessage): ChatwayMessage {
  const a = raw.attributes;
  const { sender, agentName } = detectSender(a);
  return {
    id: raw.id,
    content: (a.content ?? "").trim(),
    type: a.type === "note" ? "note" : "message",
    sender,
    agentName,
    createdAt: a.created_at ?? ""
  };
}

function mapConversation(raw: RawConversation): ChatwayConversation {
  const a = raw.attributes;
  return {
    id: raw.id,
    contactName: a.contact_name ?? "Unknown",
    contactId: a.contact_id ?? null,
    isResolved: Boolean(a.is_resolved),
    unreadMessages: a.unread_messages ?? 0,
    createdAt: a.created_at ?? "",
    latestMessageContent: (a.latest_message?.content ?? "").trim()
  };
}

// Short pleasantries that close a thread and need no reply. Ported from
// scripts/triage_chatway.py: a run of closer words with no other content.
const CLOSER_WORDS =
  "ok+|okay|thanks?|thank|thankyou|thx|ty|cheers|great|perfect|awesome|no|worries|got|it|will|do|" +
  "sounds|good|appreciate|legend|all|sweet|mate|very|much|ta|nice|brilliant|lovely|you|yep|yeah|done";
const CLOSER_RE = new RegExp(`^(${CLOSER_WORDS})([\\s.,!]+(${CLOSER_WORDS}))*[\\s.,!👍🙏❤️🙌😊]*$`, "i");

export function isCloser(text: string): boolean {
  const t = (text || "").split(/\s+/).filter(Boolean).join(" ");
  return t.length <= 40 && CLOSER_RE.test(t);
}

export function ageLabel(createdAt: string): string {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return "?";
  const delta = Date.now() - t;
  const days = Math.floor(delta / 86_400_000);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(delta / 3_600_000);
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, Math.floor(delta / 60_000))}m`;
}

async function listConversationsPage(page: number): Promise<{ conversations: ChatwayConversation[]; totalPages: number }> {
  const data = await request<{ data: RawConversation[]; meta?: { pagination?: Pagination } }>("GET", "/conversations/all", {
    params: { page }
  });
  return {
    conversations: (data.data ?? []).map(mapConversation),
    totalPages: data.meta?.pagination?.total_pages ?? 1
  };
}

// Newest message in a thread (cheap: page 1, then last page if paginated).
async function getLastMessage(conversationId: string): Promise<ChatwayMessage | null> {
  const first = await request<{ data: RawMessage[]; meta?: { pagination?: Pagination } }>(
    "GET",
    `/conversations/${conversationId}/messages`,
    { params: { page: 1, limit: MESSAGES_PER_PAGE } }
  );
  let rows = first.data ?? [];
  const totalPages = first.meta?.pagination?.total_pages ?? 1;
  if (totalPages > 1) {
    const last = await request<{ data: RawMessage[] }>("GET", `/conversations/${conversationId}/messages`, {
      params: { page: totalPages, limit: MESSAGES_PER_PAGE }
    });
    rows = last.data ?? [];
  }
  if (rows.length === 0) return null;
  const mapped = rows.map(mapMessage).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return mapped[mapped.length - 1] ?? null;
}

// Full thread, oldest -> newest, capped so a runaway thread cannot blow the budget.
export async function getThread(conversationId: string, maxPages = 10): Promise<ChatwayMessage[]> {
  const first = await request<{ data: RawMessage[]; meta?: { pagination?: Pagination } }>(
    "GET",
    `/conversations/${conversationId}/messages`,
    { params: { page: 1, limit: MESSAGES_PER_PAGE } }
  );
  const totalPages = Math.min(first.meta?.pagination?.total_pages ?? 1, maxPages);
  const all: RawMessage[] = [...(first.data ?? [])];
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await request<{ data: RawMessage[] }>("GET", `/conversations/${conversationId}/messages`, {
      params: { page, limit: MESSAGES_PER_PAGE }
    });
    all.push(...(next.data ?? []));
  }
  return all.map(mapMessage).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Run async tasks with bounded concurrency (keeps Chatway happy + fits 10s).
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface ListWaitingOptions {
  pages?: number; // how many conversation-list pages (10 convs each) to scan
  concurrency?: number;
  includeClosers?: boolean;
}

// Open conversations where the customer spoke last (and it is not a closer).
// Scans the most recent `pages` of conversations only.
export async function listOpenWaiting(opts: ListWaitingOptions = {}): Promise<WaitingConversation[]> {
  const { pages = 3, concurrency = 6, includeClosers = false } = opts;

  const candidates: ChatwayConversation[] = [];
  let totalPages = 1;
  for (let page = 1; page <= pages; page += 1) {
    const { conversations, totalPages: tp } = await listConversationsPage(page);
    totalPages = tp;
    for (const c of conversations) if (!c.isResolved) candidates.push(c);
    if (page >= totalPages) break;
  }

  const waiting = await mapLimit(candidates, concurrency, async (c) => {
    const last = await getLastMessage(c.id);
    if (!last || last.sender !== "customer") return null;
    if (!includeClosers && isCloser(last.content)) return null;
    const enriched: WaitingConversation = {
      ...c,
      lastCustomerMessage: last.content,
      ageLabel: ageLabel(c.createdAt)
    };
    return enriched;
  });

  return waiting
    .filter((w): w is WaitingConversation => w !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface ConversationListItem extends ChatwayConversation {
  lastMessage: string;
  ageLabel: string;
  status: "open" | "resolved";
}

export interface ConversationsPage {
  conversations: ConversationListItem[];
  pagination: { currentPage: number; totalPages: number; total: number };
}

// Every conversation (open + resolved), newest first, one Chatway page (10) at a
// time. No per-conversation enrichment, so it is cheap and supports the full
// "all conversations" inbox with load-more pagination.
export async function listConversations(page = 1): Promise<ConversationsPage> {
  const data = await request<{ data: RawConversation[]; meta?: { pagination?: Pagination } }>(
    "GET",
    "/conversations/all",
    { params: { page } }
  );
  const conversations: ConversationListItem[] = (data.data ?? []).map((raw) => {
    const c = mapConversation(raw);
    return {
      ...c,
      lastMessage: c.latestMessageContent,
      ageLabel: ageLabel(c.createdAt),
      status: c.isResolved ? "resolved" : "open"
    };
  });
  const p = data.meta?.pagination;
  return {
    conversations,
    pagination: {
      currentPage: p?.current_page ?? page,
      totalPages: p?.total_pages ?? 1,
      total: p?.total ?? conversations.length
    }
  };
}

export interface CreateMessageInput {
  conversationId: string;
  content: string;
  type?: ChatwayMessageType; // "message" -> customer, "note" -> agent-only
  agentId?: string | null;
  attachments?: ChatwayAttachment[];
}

export async function createMessage(input: CreateMessageInput): Promise<{ id: string | null }> {
  const body: Record<string, unknown> = {
    conversation_id: input.conversationId,
    content: input.content,
    type: input.type ?? "message"
  };
  if (input.agentId) body.agent_id = input.agentId;
  if (input.attachments && input.attachments.length > 0) body.attachments = input.attachments;
  const res = await request<{ data?: { id?: string } }>("POST", "/messages", { body });
  return { id: res.data?.id ?? null };
}

export async function resolveConversation(conversationId: string): Promise<void> {
  await request("POST", `/conversations/${conversationId}/resolve`, { body: {} });
}
