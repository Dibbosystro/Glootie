import "server-only";

import { getCredentialValue } from "@/lib/db/credentials";
import { getProductSnapshot, searchKb, type KbHit, type ProductHit } from "@/lib/support/tools";

const MAX_TURNS = 6;
const MAX_OUTPUT_TOKENS = 1500;

const SYSTEM_PROMPT = `You are a customer support reply assistant for Cafe Racer Garage (CRG), trading as Prime Moto Pty Ltd (Australian e-commerce, motorcycle electrical parts).

# How to work

You will receive a customer message. Your job: draft a reply the human agent can paste back to the customer with minor edits.

Use the tools below to ground every fact:
- search_kb(query): search the CRG knowledge base. Use this for policy questions (shipping, returns, warranty, fitment guidance, brand voice). Cite the slug of any article you draw from in a [kb: slug] tag inline.
- get_product(idOrHandleOrTitle): look up a product by SKU, handle, or partial title. Returns live price, inventory quantity, and active/draft/archived status.

Call tools when relevant. It is fine to call multiple tools before writing the reply. If a fact is not in the KB or product data, do NOT invent it. Either say "I will check with the team and get back to you" in the reply, OR flag it explicitly so the human knows to ask CRG.

# Reply rules (mandatory)

1. No em dashes (—) or en dashes (–) anywhere. Use commas, colons, full stops, parentheses.
2. Never use the word "discontinued" in customer-facing text. Out-of-stock products: say "currently out of stock" or, if a restock date is unknown, "I will let you know as soon as it is back in stock".
3. Never reveal "5 Sylvania Place, Robina QLD 4226". Public address only: lvl 3, 315 E / 3 Oracle Bvd, Broadbeach QLD 4218, Australia.
4. Brand voice: direct, plain, no exclamation points, no emoji, no marketing fluff. Speak like a mechanic talking to another rider.
5. Currency in customer-facing copy: AUD (default Shopify storefront).
6. If stock truth contradicts the KB, trust the live get_product result. The KB is an older snapshot; product data is live from Shopify.

# Output format

Respond in this exact structure:

REPLY:
<the reply text to paste back to the customer>

CITATIONS:
<list the KB slugs and product handles you used, one per line. If none, write "none">

CONFIDENCE: high | medium | low
<one-line reason. Medium or low means the human should verify before sending.>

NEEDS HUMAN INPUT:
<list any facts you did not have. If nothing missing, write "none">`;

interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const TOOLS: ToolDef[] = [
  {
    name: "search_kb",
    description: "Search the CRG knowledge base by keyword. Returns up to 5 article slugs with snippets. Use for policy, brand voice, FAQ-style questions.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search terms. Use 2 to 6 keywords like 'shipping australia' or 'TC3.P fitment'." }
      },
      required: ["query"]
    }
  },
  {
    name: "get_product",
    description: "Look up a CRG product by SKU, handle, or partial title. Returns live price, inventory quantity, and active/draft/archived status from Shopify.",
    input_schema: {
      type: "object",
      properties: {
        idOrHandleOrTitle: { type: "string", description: "SKU like 'TC3.P', a Shopify handle, or a product name fragment." }
      },
      required: ["idOrHandleOrTitle"]
    }
  }
];

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: string;
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
}

async function neokensConfig() {
  const apiKey = (await getCredentialValue("neokens", "NEOKENS_KEY")) ?? null;
  const baseUrl = ((await getCredentialValue("neokens", "NEOKENS_BASE_URL")) ?? "https://api.neokens.com/").replace(/\/+$/, "");
  const model = (await getCredentialValue("neokens", "NEOKENS_MODEL")) ?? "claude-sonnet-4-6-thinking";
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

async function runTool(name: string, input: Record<string, unknown>): Promise<{ output: unknown; serialized: string }> {
  if (name === "search_kb") {
    const query = typeof input.query === "string" ? input.query : "";
    const hits = await searchKb(query);
    return { output: hits, serialized: serializeKbHits(hits) };
  }
  if (name === "get_product") {
    const needle = typeof input.idOrHandleOrTitle === "string" ? input.idOrHandleOrTitle : "";
    const hit = await getProductSnapshot(needle);
    return { output: hit, serialized: serializeProduct(hit) };
  }
  return { output: null, serialized: `Unknown tool: ${name}` };
}

function serializeKbHits(hits: KbHit[]): string {
  if (hits.length === 0) return "No KB matches.";
  return hits.map((h) => `[${h.slug}] ${h.title}\n${h.snippet}`).join("\n\n---\n\n");
}

function serializeProduct(p: ProductHit | null): string {
  if (!p) return "No product matched.";
  const stockLine = p.inventoryQty <= 0 ? "currently out of stock" : `${p.inventoryQty} in stock`;
  return [
    `Title: ${p.title}`,
    `Handle: ${p.handle}`,
    `SKU/ShopifyId: ${p.shopifyId}`,
    `Status: ${p.status}`,
    `Price (AUD): ${p.price}`,
    `Stock: ${stockLine}`
  ].join("\n");
}

export async function composeReply(customerMessage: string): Promise<ComposeResult> {
  const trace: ComposeTrace[] = [];
  const messages: AnthropicMessage[] = [
    {
      role: "user",
      content: `A customer just sent the following message. Draft my reply.\n\nCUSTOMER MESSAGE:\n${customerMessage.trim()}`
    }
  ];

  const { model } = await neokensConfig();

  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    let response: AnthropicResponse;
    try {
      response = await callNeokens({ system: SYSTEM_PROMPT, tools: TOOLS, messages });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown Neokens error";
      return { reply: "", raw: "", trace, model, provider: "error", errorMessage: errMsg };
    }

    const toolUses = response.content.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");

    if (toolUses.length === 0 || response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("\n\n");
      return { reply: extractReply(text), raw: text, trace, model, provider: "neokens" };
    }

    // Carry the assistant's full content (text + tool_use blocks) so the next turn can reference them.
    messages.push({ role: "assistant", content: response.content });

    const toolResults: ContentBlock[] = [];
    for (const call of toolUses) {
      const { output, serialized } = await runTool(call.name, call.input);
      trace.push({ tool: call.name, input: call.input, output });
      toolResults.push({ type: "tool_result", tool_use_id: call.id, content: serialized });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "",
    raw: "",
    trace,
    model,
    provider: "error",
    errorMessage: `Stopped after ${MAX_TURNS} turns without a final reply.`
  };
}

function extractReply(raw: string): string {
  const replyMatch = raw.match(/REPLY:\s*\n?([\s\S]*?)(?:\n\s*CITATIONS:|$)/i);
  return (replyMatch?.[1] ?? raw).trim();
}
