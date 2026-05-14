"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Bot,
  CalendarDays,
  Home,
  ImageIcon,
  LineChart,
  Menu,
  Megaphone,
  Search,
  Settings,
  Sparkles,
  Store,
  Target,
  WandSparkles,
  X
} from "lucide-react";
import { dateShort } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

const pinnedNav = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/products", label: "Products", icon: Store },
  { href: "/ads/meta", label: "Meta Ads", icon: Megaphone },
  { href: "/ads/google", label: "Google Ads", icon: LineChart },
  { href: "/opportunities", label: "Ad Opportunities", icon: Target }
];

const studioNav = [
  { href: "/ad-copy", label: "Ad Copy", icon: Bot },
  { href: "/image-maker", label: "Image Maker", icon: ImageIcon }
];

const workspaceNav = [{ href: "/settings", label: "Integrations", icon: Settings, badge: 4 }];

export function AppShell({ data, children }: { data: DashboardData; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const connected = data.integrations.filter((item) => item.status === "connected").length;
  const attentionCount = data.recommendations.filter((rec) => rec.state === "do_not_advertise" || rec.state === "fix_first" || rec.state === "hold").length;

  return (
    <div className="min-h-screen p-2 text-[#111014] md:p-4">
      <div className="app-frame mx-auto flex min-h-[calc(100vh-32px)] max-w-[1600px] overflow-hidden border border-white/12 bg-[#f8f7fb]">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#e8e4ef] bg-white md:flex">
          <div className="flex items-center gap-3 px-5 pb-4 pt-6">
            <Link href="/" className="grid h-9 w-9 place-items-center rounded-xl bg-[#6d28d9] text-white" aria-label="Glootie home">
              <Sparkles className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight">Glootie</div>
              <div className="truncate text-[10px] text-[#6f6b78]">{data.client.name}</div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            <NavGroup label="Pinned" items={pinnedNav} pathname={pathname} />
            <NavGroup label="Studio" items={studioNav} pathname={pathname} />
            <NavGroup label="Workspace" items={workspaceNav} pathname={pathname} />
          </nav>

          <div className="space-y-3 p-3">
            <div className="rounded-2xl border border-[#e8e4ef] bg-[#fbfafc] p-3 shadow-sm">
              <div className="text-[11px] text-[#6f6b78]">Sync status</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${connected > 0 ? "bg-emerald-600" : "bg-[#6d28d9]"}`} />
                <span className="text-xs font-semibold">{connected > 0 ? "Live sources active" : "Needs attention"}</span>
              </div>
              <div className="mt-1 text-[10px] text-[#8d8799]">Last sync · {dateShort(data.generatedAt)}</div>
            </div>
            <div className="rounded-2xl border border-[#e8e4ef] bg-[#fbfafc] p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-[#6f6b78]">Service status</span>
                <span className="text-[10px] text-[#6d28d9]">{attentionCount} items</span>
              </div>
              <div className="space-y-1.5">
                {data.integrations.slice(0, 6).map((item) => (
                  <div key={item.type} className="flex items-center gap-2 text-[11px] text-[#6f6b78]">
                    <span className="truncate">{item.label}</span>
                    <span className={`ml-auto h-1.5 w-1.5 rounded-full ${item.status === "connected" ? "bg-emerald-600" : item.status === "demo" ? "bg-[#6d28d9]" : "bg-[#d9d4e6]"}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-[#111014]/45"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="relative flex h-full w-[282px] max-w-[86vw] flex-col border-r border-[#e8e4ef] bg-white shadow-2xl">
              <div className="flex items-center gap-3 px-5 pb-4 pt-6">
                <Link
                  href="/"
                  onClick={() => setMobileNavOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-[#6d28d9] text-white"
                  aria-label="Glootie home"
                >
                  <Sparkles className="h-4 w-4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold tracking-tight">Glootie</div>
                  <div className="truncate text-[10px] text-[#6f6b78]">{data.client.name}</div>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#e8e4ef] bg-white text-[#6f6b78]"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 pb-3">
                <NavGroup label="Pinned" items={pinnedNav} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
                <NavGroup label="Studio" items={studioNav} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
                <NavGroup label="Workspace" items={workspaceNav} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
              </nav>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col bg-[#f8f7fb]">
          <header className="flex flex-col gap-3 px-4 pb-3 pt-5 md:flex-row md:items-center md:px-6">
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-[420px]">
              <button
                type="button"
                aria-label="Open navigation"
                aria-expanded={mobileNavOpen}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e8e4ef] bg-white text-[#111014] shadow-sm md:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  className="h-10 w-full rounded-full border border-[#e8e4ef] bg-white pl-11 pr-4 text-sm shadow-sm outline-none placeholder:text-[#8d8799] focus:ring-2 focus:ring-[#6d28d9]/20"
                  placeholder='Try searching "Meta ROAS"'
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-[#e8e4ef] bg-white px-3 py-2 text-xs text-[#6f6b78] shadow-sm sm:flex">
                <CalendarDays className="h-3.5 w-3.5" />
                Last 30 days
              </div>
              <div className="hidden rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 lg:block">
                {connected || "Demo"} live sources
              </div>
              <Link href="/ad-copy" aria-label="Open AI tools" className="grid h-9 w-9 place-items-center rounded-full border border-[#e8e4ef] bg-white text-[#6d28d9] shadow-sm">
                <WandSparkles className="h-4 w-4" />
              </Link>
              <Link href="/opportunities" aria-label="Open attention items" className="relative grid h-9 w-9 place-items-center rounded-full border border-[#e8e4ef] bg-white text-[#6f6b78] shadow-sm">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#6d28d9]" />
              </Link>
            </div>
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  onNavigate
}: {
  label: string;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="px-2 pb-1 pt-2 text-[11px] uppercase tracking-[0.12em] text-[#8d8799]">{label}</div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition ${
                active ? "bg-[#111014] font-semibold text-white" : "text-[#4f4a59] hover:bg-[#f1eef8]"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-white" : "text-[#6f6b78]"}`} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? <span className="rounded-full bg-[#6d28d9] px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
