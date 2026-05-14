"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function SyncButton({
  source,
  label,
  appearance = "default"
}: {
  source: "all" | "shopify" | "meta" | "google-ads";
  label: string;
  appearance?: "default" | "primary-pill";
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const buttonClass =
    appearance === "primary-pill"
      ? "inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#b45309] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#92400e] disabled:opacity-60"
      : "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#d6d3d1] bg-white px-3 text-sm font-bold text-[#1c1917] hover:bg-[#f5f5f4] disabled:opacity-60";

  async function runSync() {
    setState("loading");
    setMessage("");
    const res = await fetch(`/api/sync/${source}`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    if (!res.ok) {
      setState("error");
      setMessage(json.error ?? "Sync failed");
      return;
    }
    setState("done");
    setMessage(json.message ?? "Sync request completed");
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={runSync}
        disabled={state === "loading"}
        className={buttonClass}
      >
        <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} />
        {label}
      </button>
      {message && <span className={`text-xs ${state === "error" ? "text-[#b45309]" : "text-[#31a24c]"}`}>{message}</span>}
    </div>
  );
}
