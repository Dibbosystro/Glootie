"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Link2, Trash2 } from "lucide-react";
import type { SettingsIntegrationConfig } from "@/lib/integration-config";

export interface SettingsIntegrationStatus extends SettingsIntegrationConfig {
  configured: boolean;
  fieldStatus: Array<{ key: string; configured: boolean }>;
  currentStatus?: string;
  currentMessage?: string;
  lastSynced?: string;
}

export function ApiSettingsList({ integrations }: { integrations: SettingsIntegrationStatus[] }) {
  return (
    <div className="mt-4 space-y-3">
      {integrations.map((integration) => (
        <ApiSettingsCard key={integration.id} integration={integration} />
      ))}
    </div>
  );
}

function ApiSettingsCard({ integration }: { integration: SettingsIntegrationStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "saving" | "removing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const configuredByKey = useMemo(() => new Map(integration.fieldStatus.map((field) => [field.key, field.configured])), [integration.fieldStatus]);

  async function submit(action: "save" | "remove") {
    setState(action === "save" ? "saving" : "removing");
    setMessage("");
    const res = await fetch("/api/settings/env", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "save"
          ? { action, values }
          : { action, keys: integration.fields.map((field) => field.key) }
      )
    });
    const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    if (!res.ok) {
      setState("error");
      setMessage(json.error ?? "Could not update settings.");
      return;
    }
    setValues({});
    setState("done");
    setMessage(json.message ?? "Updated.");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{integration.label}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${integration.configured ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>
              {integration.configured ? "configured" : "missing"}
            </span>
            {integration.currentStatus ? <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">{integration.currentStatus}</span> : null}
          </div>
          <p className="mt-2 text-sm text-stone-500">{integration.currentMessage ?? integration.description}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {integration.fields.map((field) => (
              <span key={field.key} className="rounded-full bg-stone-50 px-2.5 py-1 font-mono text-[11px] text-stone-500">
                {field.key} · {configuredByKey.get(field.key) ? "saved" : "empty"}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {integration.oauth ? (
            <a
              href={integration.oauth.href}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#ddd3f8] bg-[#f2ecff] px-3 text-sm font-bold text-[#6d28d9]"
            >
              <Link2 className="h-4 w-4" />
              OAuth
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 text-sm font-bold"
          >
            <KeyRound className="h-4 w-4" />
            {integration.configured ? "Replace" : "Add API"}
          </button>
          <button
            type="button"
            onClick={() => submit("remove")}
            disabled={state === "removing"}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[#ddd3f8] bg-[#f2ecff] px-3 text-sm font-bold text-[#6d28d9] disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 rounded-2xl bg-stone-50 p-4">
          {integration.oauth ? (
            <div className="mb-4 rounded-xl border border-[#ddd3f8] bg-white p-3 text-xs leading-5 text-stone-600">
              <div className="font-bold text-[#111014]">{integration.oauth.label}</div>
              <p className="mt-1">{integration.oauth.helper}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {integration.fields.map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-bold text-stone-600">{field.label}</span>
                {field.input === "select" ? (
                  <select
                    value={values[field.key] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                  >
                    <option value="">Keep current / choose model</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.secret ? "password" : "text"}
                    value={values[field.key] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder ?? field.key}
                    className="mt-1 h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => submit("save")}
              disabled={state === "saving"}
              className="inline-flex h-10 items-center rounded-full bg-[#191512] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {state === "saving" ? "Saving..." : "Save / replace API"}
            </button>
            <p className="text-xs text-stone-500">Leave a field blank to keep the current saved value. Saved values are never shown again.</p>
          </div>
        </div>
      ) : null}

      {message ? <p className={`mt-3 text-xs font-semibold ${state === "error" ? "text-[#6d28d9]" : "text-emerald-700"}`}>{message}</p> : null}
    </div>
  );
}
