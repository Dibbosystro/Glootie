"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Copy, Sparkles } from "lucide-react";
import { seedClient, seedProducts } from "@/lib/seed";
import type { AiProviderId } from "@/lib/types";

export function AdCopyStudio() {
  const [productId, setProductId] = useState(seedProducts[0]?.id ?? "");
  const [angle, setAngle] = useState("problem-solution");
  const [provider, setProvider] = useState<AiProviderId>("auto");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [usedProvider, setUsedProvider] = useState("");
  const product = useMemo(() => seedProducts.find((item) => item.id === productId) ?? seedProducts[0], [productId]);

  async function generate() {
    setLoading(true);
    setOutput("");
    setUsedProvider("");
    const res = await fetch("/api/ai/ad-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, angle, provider })
    });
    const json = (await res.json()) as { output?: string; provider?: string; error?: string };
    setOutput(json.output ?? json.error ?? "No copy returned.");
    setUsedProvider(json.provider ?? "");
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <ToolHeading title="Ad Copy Maker" subtitle={`Create client-ready ad angles for ${seedClient.name}.`} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        <section className="card p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-stone-500">
            <Bot className="h-4 w-4" />
            Brief
          </div>
          <label className="mt-5 block text-sm font-bold">Product</label>
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-stone-300 bg-white px-3">
            {seedProducts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <label className="mt-4 block text-sm font-bold">Angle</label>
          <select value={angle} onChange={(event) => setAngle(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-stone-300 bg-white px-3">
            <option value="problem-solution">Problem, solution</option>
            <option value="builder-proof">Builder proof</option>
            <option value="sale-urgency">Sale urgency</option>
            <option value="comparison">Before, after comparison</option>
          </select>
          <label className="mt-4 block text-sm font-bold">AI provider</label>
          <select value={provider} onChange={(event) => setProvider(event.target.value as AiProviderId)} className="mt-2 h-10 w-full rounded-md border border-stone-300 bg-white px-3">
            <option value="auto">Auto, prefer Neokens</option>
            <option value="neokens">Neokens</option>
            <option value="openai">OpenAI</option>
          </select>
          <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
            <strong className="text-stone-950">{product?.title}</strong>
            <br />
            Inventory: {product?.inventoryQty} · Price: A${product?.price}
          </div>
          <button onClick={generate} disabled={loading} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60">
            <Sparkles className="h-4 w-4" />
            {loading ? "Generating..." : "Generate copy"}
          </button>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Output</h2>
              <p className="text-sm text-stone-500">
                Uses live AI when a provider key is configured, otherwise returns a deterministic draft.
                {usedProvider ? ` Provider used: ${usedProvider}.` : ""}
              </p>
            </div>
            <button onClick={() => navigator.clipboard.writeText(output)} className="inline-flex h-9 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 text-sm font-bold">
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
          <pre className="mt-5 min-h-[420px] whitespace-pre-wrap rounded-2xl bg-[#191512] p-5 font-mono text-sm leading-6 text-white">
            {output || "Choose a product and generate ad copy. The draft will include primary text, headline, hook, and CTA."}
          </pre>
        </section>
      </div>
    </div>
  );
}

function ToolHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="flex flex-col gap-3 pt-1 md:flex-row md:items-end md:justify-between">
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-stone-950">
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </Link>
        <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.03em] text-stone-950">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      </div>
    </section>
  );
}
