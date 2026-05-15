"use client";

import { useEffect, useState } from "react";

export default function LoginPage() {
  const [next, setNext] = useState("/");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get("next") ?? "/");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      setError("Password did not match.");
      return;
    }
    window.location.href = next;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f5f4] p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/morsegrid-logo-black.png" alt="MorseGrid" className="h-7 w-auto" />
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">Glootie</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#1c1917]">Private dashboard</h1>
        <p className="mt-2 text-sm text-[#57534e]">Enter the client dashboard password to continue.</p>
        <label className="mt-5 block text-xs font-bold uppercase tracking-[0.12em] text-[#57534e]">Password</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-2 h-10 w-full rounded-md border border-[#d6d3d1] px-3 outline-none focus:border-[#b45309] focus:ring-2 focus:ring-[#fef3c7]" />
        {error && <p className="mt-3 text-sm font-semibold text-[#b91c1c]">{error}</p>}
        <button className="mt-5 h-10 w-full rounded-md bg-[#1c1917] text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#292524]">Unlock</button>
      </form>
    </main>
  );
}
