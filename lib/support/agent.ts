import "server-only";

import { getDb } from "@/lib/db/client";
import { supportConversations, supportMessages } from "@/lib/db/schema";
import { getCredentialValue } from "@/lib/db/credentials";
import { upsertClient } from "@/lib/db/persistence";
import { seedClient } from "@/lib/seed";
import { recordActivity, type ActivityHandle } from "@/lib/support/activity";
import { searchKb, type KbHit } from "@/lib/support/tools";
import { searchProductsLive, type LiveProduct } from "@/lib/integrations/shopify";

const MAX_OUTPUT_TOKENS = 1200;
// Neokens only exposes the "-thinking" model ids, so the default must be one too.
// Latency is absorbed by maxDuration=60 (Fluid Compute) + a single grounded call.
const DEFAULT_MODEL = "claude-sonnet-4-6-thinking";

// Retrieve-then-generate: we pre-fetch the KB + live product data ourselves and
// hand it to the model, then take a single no-tools completion. This avoids the
// agentic tool loop (the Neokens gateway mis-handles tool-use for the thinking
// model, looping or leaking raw tool-call XML), and keeps latency predictable.
const SYSTEM_PROMPT = `You are a customer support reply assistant for Cafe Racer Garage (CRG), trading as Prime Moto Pty Ltd (Australian e-commerce, motorcycle electrical parts).

You will receive a customer message plus GROUNDING (knowledge-base snippets and live Shopify product/stock already retrieved for you). Draft a short reply the human agent will review and send.

Rules:
- Ground every fact in the GROUNDING. If a needed fact is not there, do NOT invent it. Instead write a brief "I will confirm that with the team and get back to you".
- No em dashes or en dashes. Use commas, full stops, parentheses. Numeric ranges use a hyphen (10-20).
- Never say "discontinued". For no stock say "currently out of stock", or "I will let you know as soon as it is back in stock" if there is no restock date.
- Never reveal the Robina address. Public address only: lvl 3, 315 E / 3 Oracle Bvd, Broadbeach QLD 4218, Australia.
- Voice: direct, plain, no exclamation marks, no emoji, no marketing fluff. Like a mechanic talking to another rider.
- Currency is AUD. Live Shopify stock and price beat any KB snapshot.

Output: reply with ONLY the message text to send the customer. Plain text. No markdown, no blockquotes, no headings, no bold, no greeting placeholder like [Your Name], no subject line, no sign-off, and do not add notes or ask whether to adjust it.

Example of the exact output style:
Hi mate, yes the X3.M is in stock and ready to ship. It is 245 AUD. Shipping within Australia takes 3 to 7 business days. Let me know if you want a hand picking the right loom for your build.`;

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicTextBlock[];
  stop_reason?: string;
}

export interface ComposeTrace {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
}

export interface ComposeResult {
  reply: string;
  raw: string;
  trace: ComposeTrace[];
  model: string;
  provider: "neokens" | "anthropic" | "error";
  errorMessage?: string;
  conversationId?: string | null;
}

async function neokensConfig() {
  const apiKey = (await getCredentialValue("neokens", "NEOKENS_KEY")) ?? null;
  const baseUrl = ((await getCredentialValue("neokens", "NEOKENS_BASE_URL")) ?? "https://api.neokens.com/").replace(/\/+$/, "");
  // Use the Neokens-configured model as-is (Neokens only recognises the "-thinking" ids).
  const model = (await getCredentialValue("neokens", "NEOKENS_MODEL")) ?? DEFAULT_MODEL;
  return { apiKey, baseUrl, model };
}

async function callNeokens(payload: Record<string, unknown>): Promise<AnthropicResponse> {
  const { apiKey, baseUrl, model } = await neokensConfig();
  if (!apiKey) throw new Error("NEOKENS_KEY is missing. Set it in Vercel env or via /settings.");

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, max_tokens: MAX_OUTPUT_TOKENS, ...payload })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neokens ${res.status}: ${text.slice(0, 500)}`);
  }
  return (await res.json()) as AnthropicResponse;
}

// Stop words stripped from the customer message before the live product search,
// so "is the X in stock and what is the price" searches Shopify for "X".
const PQ_STOP = new Set(
  ("is the a an in on of for with and to me my i we you it this that does do you have has got " +
    "available stock what whats price cost how much when will are there still can get order buy " +
    "would like need want please hi hello hey thanks any your")
    .split(" ")
);

function productQueryFrom(message: string): string {
  const cleaned = message
    .toLowerCase()
    .replace(/[^a-z0-9.\- ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !PQ_STOP.has(w))
    .join(" ")
    .trim();
  return cleaned || message;
}

function formatGrounding(kb: KbHit[], products: LiveProduct[]): string {
  const parts: string[] = [];
  if (kb.length > 0) {
    parts.push("KB MATCHES:\n" + kb.map((h) => `- [${h.slug}] ${h.title}: ${h.snippet}`).join("\n"));
  }
  if (products.length > 0) {
    parts.push(
      "LIVE SHOPIFY PRODUCTS:\n" +
        products
          .map((p) => {
            const stock = p.inventoryQty <= 0 ? "currently out of stock" : `${p.inventoryQty} in stock`;
            return `- ${p.title} (${p.handle}) | AUD ${p.price} | ${p.status} | ${stock}`;
          })
          .join("\n")
    );
  }
  if (parts.length === 0) {
    return "No KB or product matches were found for this message. If a fact is unavailable, say you will confirm with the team rather than guessing.";
  }
  return parts.join("\n\n");
}

export async function composeReply(customerMessage: string, opts?: { actor?: string }): Promise<ComposeResult> {
  const trace: ComposeTrace[] = [];

  // Pre-fetch grounding (KB + live Shopify) so a single model call can answer.
  const [kbHits, productHits] = await Promise.all([
    searchKb(customerMessage).catch(() => [] as KbHit[]),
    searchProductsLive(productQueryFrom(customerMessage), 3).catch(() => [] as LiveProduct[])
  ]);
  trace.push({ tool: "search_kb", input: { query: customerMessage }, output: kbHits });
  trace.push({ tool: "get_product", input: { query: productQueryFrom(customerMessage) }, output: productHits });

  const userContent =
    `A customer just sent the following message. Draft my reply.\n\nCUSTOMER MESSAGE:\n${customerMessage.trim()}` +
    `\n\nGROUNDING (already retrieved for you; use only this):\n${formatGrounding(kbHits, productHits)}`;

  const { model } = await neokensConfig();
  const actor = opts?.actor ?? "support-hire";

  const conversationId = await startConversation(customerMessage);
  const activity = await recordActivity({
    type: "compose",
    actor,
    summary: snippet(customerMessage, 120),
    detail: { conversationId }
  });
  if (conversationId) await logMessage(conversationId, "user", customerMessage, {});

  const finish = async (result: ComposeResult) => {
    if (conversationId) {
      await logMessage(conversationId, "assistant", result.reply || result.raw, {
        model,
        provider: result.provider,
        errorMessage: result.errorMessage
      });
    }
    await finalizeActivity(activity, result, conversationId);
    return { ...result, conversationId: conversationId ?? null };
  };

  let response: AnthropicResponse;
  try {
    response = await callNeokens({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }]
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown Neokens error";
    return finish({ reply: "", raw: "", trace, model, provider: "error", errorMessage: errMsg });
  }

  const text = response.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n\n");

  if (!text.trim()) {
    return finish({ reply: "", raw: "", trace, model, provider: "error", errorMessage: "Empty model response." });
  }

  return finish({ reply: sanitizeReply(text), raw: text, trace, model, provider: "neokens" });
}

async function startConversation(customerMessage: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const clientId = await upsertClient(seedClient);
    const [row] = await db
      .insert(supportConversations)
      .values({ clientId, title: snippet(customerMessage, 80), status: "open" })
      .returning({ id: supportConversations.id });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

async function logMessage(
  conversationId: string,
  role: "user" | "assistant" | "tool",
  content: string,
  extras: { toolName?: string; toolInput?: unknown; toolOutput?: unknown; model?: string; provider?: string; errorMessage?: string }
): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await db.insert(supportMessages).values({
      conversationId,
      role,
      content,
      toolName: extras.toolName ?? null,
      toolInput: (extras.toolInput ?? null) as never,
      toolOutput: (extras.toolOutput ?? null) as never,
      model: extras.model ?? null,
      provider: extras.provider ?? null,
      errorMessage: extras.errorMessage ?? null
    });
  } catch {
    // swallow logging errors so they never break the compose path
  }
}

async function finalizeActivity(handle: ActivityHandle, result: ComposeResult, conversationId: string | null): Promise<void> {
  if (result.provider === "error") {
    await handle.finish({
      status: "error",
      summary: result.errorMessage ?? "Compose failed",
      detail: { conversationId, toolCalls: result.trace.length },
      errorMessage: result.errorMessage
    });
    return;
  }
  await handle.finish({
    status: "success",
    summary: snippet(result.reply || result.raw, 120),
    detail: { conversationId, toolCalls: result.trace.length, model: result.model }
  });
}

function snippet(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? trimmed.slice(0, max - 3) + "..." : trimmed;
}

// Clean the model output into a plain, brand-compliant message, regardless of
// what the (sometimes misbehaving) gateway emits.
function sanitizeReply(text: string): string {
  let t = text;
  // 1. strip leaked tool-call syntax some gateways emit as text
  t = t.replace(/<claude:tool_call>[\s\S]*?<\/claude:tool_call>/gi, "");
  t = t.replace(/<\/?(invoke|parameter|tool_call|function_calls|antml:[a-z_]+)[^>]*>/gi, "");
  // 2. strip leftover structured-format labels from the old prompt
  t = t.replace(/^\s*(REPLY|CITATIONS|CONFIDENCE|NEEDS HUMAN INPUT)\s*:.*$/gim, "");
  // 3. strip markdown noise (do this before the Notes strip so it sees clean lines)
  t = t.replace(/^\s*-{3,}\s*$/gm, ""); // horizontal rules
  t = t.replace(/^\s*>\s?/gm, ""); // blockquote markers
  t = t.replace(/^#{1,6}\s+/gm, ""); // headings
  t = t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/(?<!\w)\*(?!\s)(.*?)(?<!\s)\*(?!\w)/g, "$1");
  t = t.replace(/__(.*?)__/g, "$1");
  t = t.replace(/\*\*|`/g, "");
  // 4. drop a trailing "Notes for you ..." personalisation block the model adds
  t = t.replace(/\n\s*notes?\b\s*(for|to|:)[\s\S]*$/i, "");
  // 5. brand hard rules
  t = t.replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2").replace(/\s*[–—]\s*/g, ", ");
  t = t.replace(/\bdiscontinued\b/gi, "currently out of stock");
  t = t.replace(
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu,
    ""
  );
  // 6. tidy whitespace
  t = t.replace(/[ \t]{2,}/g, " ").replace(/ +([.,!?;:])/g, "$1").replace(/\n{3,}/g, "\n\n").trim();
  return t;
}
