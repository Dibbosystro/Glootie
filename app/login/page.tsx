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
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-[#6d28d9] font-extrabold text-white">MG</div>
        <h1 className="mt-5 text-2xl font-bold">Private dashboard</h1>
        <p className="mt-2 text-sm text-[#65676b]">Enter the client dashboard password. Clerk can replace this gate later.</p>
        <label className="mt-5 block text-sm font-bold">Password</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-2 h-10 w-full rounded-md border border-[#ced0d4] px-3" />
        {error && <p className="mt-3 text-sm font-semibold text-[#6d28d9]">{error}</p>}
        <button className="mt-5 h-10 w-full rounded-md bg-[#6d28d9] font-bold text-white">Unlock</button>
      </form>
    </main>
  );
}
