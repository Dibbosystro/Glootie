"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImageIcon, Sparkles } from "lucide-react";
import { seedClient, seedProducts } from "@/lib/seed";
import type { AiProviderId } from "@/lib/types";

export function ImageMakerStudio() {
  const [productId, setProductId] = useState(seedProducts[0]?.id ?? "");
  const [scene, setScene] = useState("garage-workbench");
  const [provider, setProvider] = useState<AiProviderId>("neokens");
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const product = useMemo(() => seedProducts.find((item) => item.id === productId) ?? seedProducts[0], [productId]);

  async function generate() {
    setLoading(true);
    setPrompt("");
    const res = await fetch("/api/ai/image-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, scene })
    });
    const json = (await res.json()) as { prompt?: string; error?: string };
    setPrompt(json.prompt ?? json.error ?? "No prompt returned.");
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 pt-1 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-stone-950">
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.03em] text-stone-950">Image Maker</h1>
          <p className="mt-1 text-sm text-stone-500">Generate provider-ready creative prompts for {seedClient.name}.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        <section className="card p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-stone-500">
            <ImageIcon className="h-4 w-4" />
            Creative setup
          </div>
          <label className="mt-5 block text-sm font-bold">Product</label>
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-stone-300 bg-white px-3">
            {seedProducts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <label className="mt-4 block text-sm font-bold">Scene</label>
          <select value={scene} onChange={(event) => setScene(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-stone-300 bg-white px-3">
            <option value="garage-workbench">Garage workbench</option>
            <option value="installed-bike">Installed on custom bike</option>
            <option value="exploded-kit">Exploded kit layout</option>
            <option value="sale-banner">Sale banner hero</option>
          </select>
          <label className="mt-4 block text-sm font-bold">Prompt target</label>
          <select value={provider} onChange={(event) => setProvider(event.target.value as AiProviderId)} className="mt-2 h-10 w-full rounded-md border border-stone-300 bg-white px-3">
            <option value="neokens">Neokens</option>
            <option value="openai">OpenAI image model</option>
            <option value="gemini">Gemini image model</option>
            <option value="openrouter">OpenRouter image model</option>
          </select>
          {product && <img src={product.imageUrl} alt="" className="mt-5 h-56 w-full rounded-2xl object-cover" />}
          <button onClick={generate} disabled={loading} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60">
            <Sparkles className="h-4 w-4" />
            {loading ? "Building prompt..." : "Build image prompt"}
          </button>
        </section>

        <section className="card p-5">
          <h2 className="text-2xl font-bold">Provider-ready prompt</h2>
          <p className="mt-1 text-sm text-stone-500">Use this with {provider === "neokens" ? "Neokens or its routed image model" : provider} after the API provider is configured.</p>
          <pre className="mt-5 min-h-[420px] whitespace-pre-wrap rounded-2xl bg-[#191512] p-5 font-mono text-sm leading-6 text-white">
            {prompt || "Generate a prompt to see the exact creative direction."}
          </pre>
        </section>
      </div>
    </div>
  );
}
