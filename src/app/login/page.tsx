"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const [next, setNext] = useState("/");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get("next") ?? "/");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        setError("Password did not match.");
        setLoading(false);
        return;
      }
      window.location.href = next;
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 p-4 dark:bg-stone-950">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100">GLOOTIE</p>
            <p className="-mt-0.5 text-[9px] uppercase tracking-wider text-stone-500">Command Center</p>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Private dashboard</h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">Enter the dashboard password to continue.</p>

        <label className="mt-6 block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Password
        </label>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoFocus
          className="mt-2 h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 h-10 w-full rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-600 hover:to-amber-700 disabled:opacity-60"
        >
          {loading ? "Unlocking..." : "Unlock"}
        </button>
      </form>
    </main>
  );
}
