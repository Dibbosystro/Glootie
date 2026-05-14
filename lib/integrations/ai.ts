import "server-only";

import { seedProducts } from "@/lib/seed";
import { getServerEnv } from "@/lib/server-env";
import type { AiProviderId } from "@/lib/types";
import { getStoredProductAiContext } from "@/lib/db/ai-context";

type ChatResult = { output: string; provider: Exclude<AiProviderId, "auto"> | "fallback" };

export async function generateAdCopy(productId: string, angle: string, provider: AiProviderId = "auto"): Promise<ChatResult> {
  const storedContext = await getStoredProductAiContext("Cafe Racer Garage", productId);
  const product = seedProducts.find((item) => item.id === productId) ?? seedProducts[0];
  const productTitle = storedContext?.title ?? product?.title;
  if (!productTitle) return { output: "No product selected.", provider: "fallback" };

  const prompt = [
    `Write Meta ad copy for ${productTitle}.`,
    `Angle: ${angle}.`,
    `Audience: motorcycle builders and cafe racer owners.`,
    storedContext?.contextText ?? "Stored client context from Glootie database: not available yet, use only the product name and do not invent performance claims.",
    "Return primary text, headline, hook, and CTA. Keep it concise and practical."
  ].join("\n");

  const orderedProviders: AiProviderId[] = provider === "auto" ? ["neokens", "openai"] : [provider];
  for (const selectedProvider of orderedProviders) {
    if (selectedProvider === "neokens") {
      const neokensCopy = await tryNeokensCopy(prompt);
      if (neokensCopy) return { output: neokensCopy, provider: "neokens" };
    }

    if (selectedProvider === "openai") {
      const openAiCopy = await tryOpenAiCopy(prompt);
      if (openAiCopy) return { output: openAiCopy, provider: "openai" };
    }
  }

  const urgency = angle === "sale-urgency" ? "This is the kind of part builders grab before the next batch disappears." : "This is the part that keeps the build clean, reliable, and easier to finish.";
  return {
    provider: "fallback",
    output: `Primary text:
Your cafe racer build should not be held together by guesswork. ${productTitle} gives builders a cleaner way to finish the electrical setup without turning the garage into a wiring headache.

${urgency}

Headline:
${productTitle} for cleaner custom builds

Hook:
Still fighting wiring issues on your cafe racer?

CTA:
Shop now`
  };
}

async function tryOpenAiCopy(prompt: string): Promise<string | null> {
  const apiKey = getServerEnv("OPENAI_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You write direct-response ecommerce ad copy for motorcycle parts. No hype, no false claims." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });
    if (res.ok) {
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content;
      if (content) return content;
    }
  } catch {
    return null;
  }

  return null;
}

async function tryNeokensCopy(prompt: string): Promise<string | null> {
  const apiKey = getServerEnv("NEOKENS_KEY");
  if (!apiKey) return null;

  const baseUrl = (getServerEnv("NEOKENS_BASE_URL") ?? "https://api.neokens.com/").replace(/\/+$/, "");
  const model = getServerEnv("NEOKENS_MODEL") ?? "claude-sonnet-4-6-thinking";

  try {
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        temperature: 0.7,
        system: "You write direct-response ecommerce ad copy for motorcycle parts. No hype, no false claims.",
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    return json.content?.find((item) => item.type === "text" && item.text)?.text ?? null;
  } catch {
    return null;
  }
}

export function buildImagePrompt(productId: string, scene: string): string {
  const product = seedProducts.find((item) => item.id === productId) ?? seedProducts[0];
  if (!product) return "No product selected.";

  const sceneText: Record<string, string> = {
    "garage-workbench": "on a clean garage workbench with tools, matte black parts, subtle oil-stained texture, and a premium workshop feel",
    "installed-bike": "installed on a custom cafe racer motorcycle, close-up detail, natural workshop lighting, realistic fitment",
    "exploded-kit": "as an organized exploded kit layout with labels, bolts, wires, and product components arranged neatly",
    "sale-banner": "as a bold ecommerce sale banner with product in the foreground and a clean high-contrast background"
  };

  return `Create a realistic ecommerce ad image for ${product.title}.

Scene: ${sceneText[scene] ?? sceneText["garage-workbench"]}.

Requirements:
- Preserve the real product shape and materials.
- Make it useful for a Meta ad, not a generic stock photo.
- Use a rugged cafe racer garage mood.
- Leave clean negative space for a short headline.
- No fake logos, no unreadable text, no extra product claims.`;
}
