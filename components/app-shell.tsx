"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Home,
  ImageIcon,
  Inbox,
  LineChart,
  MessageSquare,
  Menu,
  Megaphone,
  Search,
  Settings,
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

const supportNav = [
  { href: "/support/inbox", label: "Chatway Inbox", icon: Inbox },
  { href: "/support", label: "Reply Composer", icon: MessageSquare, exact: true },
  { href: "/support/kb", label: "KB Articles", icon: BookOpen }
];

const workspaceNav = [
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Integrations", icon: Settings, badge: 4 }
];

export function AppShell({ data, children }: { data: DashboardData; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const connected = data.integrations.filter((item) => item.status === "connected").length;
  const attentionCount = data.recommendations.filter((rec) => rec.state === "do_not_advertise" || rec.state === "fix_first" || rec.state === "hold").length;

  return (
    <div className="min-h-screen bg-[#f5f5f4] p-2 text-[#1c1917] md:p-4">
      <div className="app-frame mx-auto flex min-h-[calc(100vh-32px)] max-w-[1600px] overflow-hidden border border-[#e7e5e4] bg-white">
        <aside className="hidden w-[244px] shrink-0 flex-col border-r border-[#292524] bg-[#1c1917] text-[#fafaf9] md:flex">
          <div className="flex items-center gap-3 px-5 pb-5 pt-6">
            <Link href="/" className="grid h-9 w-9 place-items-center rounded-md bg-[#b45309] text-[10px] font-black uppercase tracking-[0.06em] text-white" aria-label="Glootie home">
              GL
            </Link>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-[#fafaf9]">Glootie</div>
              <div className="truncate text-[10px] uppercase tracking-[0.14em] text-[#a8a29e]">{data.client.name}</div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            <NavGroup label="Pinned" items={pinnedNav} pathname={pathname} dark />
            <NavGroup label="Studio" items={studioNav} pathname={pathname} dark />
            <NavGroup label="Support" items={supportNav} pathname={pathname} dark />
            <NavGroup label="Workspace" items={workspaceNav} pathname={pathname} dark />
          </nav>

          <div className="space-y-2 border-t border-[#292524] p-3">
            <div className="rounded-lg border border-[#292524] bg-[#292524] p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a8a29e]">Sync status</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${connected > 0 ? "bg-emerald-400" : "bg-[#fbbf24]"}`} />
                <span className="text-xs font-semibold text-[#fafaf9]">{connected > 0 ? "Live sources active" : "Needs attention"}</span>
              </div>
              <div className="mt-1 text-[10px] text-[#a8a29e]">Last sync · {dateShort(data.generatedAt)}</div>
            </div>
            <div className="rounded-lg border border-[#292524] bg-[#292524] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a8a29e]">Service status</span>
                <span className="text-[10px] font-semibold text-[#fbbf24]">{attentionCount} items</span>
              </div>
              <div className="space-y-1.5">
                {data.integrations.slice(0, 6).map((item) => (
                  <div key={item.type} className="flex items-center gap-2 text-[11px] text-[#a8a29e]">
                    <span className="truncate">{item.label}</span>
                    <span className={`ml-auto h-1.5 w-1.5 rounded-full ${item.status === "connected" ? "bg-emerald-400" : item.status === "demo" ? "bg-[#fbbf24]" : "bg-[#44403c]"}`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 px-1 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#78716c]">Built by</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/morsegrid-logo-white.png" alt="MorseGrid" className="h-3 w-auto opacity-90" />
            </div>
          </div>
        </aside>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-[#1c1917]/55"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="relative flex h-full w-[282px] max-w-[86vw] flex-col border-r border-[#292524] bg-[#1c1917] text-[#fafaf9] shadow-2xl">
              <div className="flex items-center gap-3 px-5 pb-5 pt-6">
                <Link
                  href="/"
                  onClick={() => setMobileNavOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-md bg-[#b45309] text-[10px] font-black uppercase tracking-[0.06em] text-white"
                  aria-label="Glootie home"
                >
                  GL
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold tracking-tight">Glootie</div>
                  <div className="truncate text-[10px] uppercase tracking-[0.14em] text-[#a8a29e]">{data.client.name}</div>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  className="grid h-9 w-9 place-items-center rounded-md border border-[#292524] bg-[#292524] text-[#a8a29e]"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 pb-3">
                <NavGroup label="Pinned" items={pinnedNav} pathname={pathname} dark onNavigate={() => setMobileNavOpen(false)} />
                <NavGroup label="Studio" items={studioNav} pathname={pathname} dark onNavigate={() => setMobileNavOpen(false)} />
                <NavGroup label="Support" items={supportNav} pathname={pathname} dark onNavigate={() => setMobileNavOpen(false)} />
                <NavGroup label="Workspace" items={workspaceNav} pathname={pathname} dark onNavigate={() => setMobileNavOpen(false)} />
              </nav>
              <div className="flex items-center gap-2 border-t border-[#292524] px-5 py-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#78716c]">Built by</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/morsegrid-logo-white.png" alt="MorseGrid" className="h-3 w-auto opacity-90" />
              </div>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="flex flex-col gap-3 border-b border-[#e7e5e4] px-4 pb-3 pt-5 md:flex-row md:items-center md:px-6">
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-[420px]">
              <button
                type="button"
                aria-label="Open navigation"
                aria-expanded={mobileNavOpen}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#d6d3d1] bg-white text-[#1c1917] md:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c]" />
                <input
                  className="h-10 w-full rounded-md border border-[#d6d3d1] bg-white pl-11 pr-4 text-sm outline-none placeholder:text-[#a8a29e] focus:border-[#b45309] focus:ring-2 focus:ring-[#fef3c7]"
                  placeholder='Try searching "Meta ROAS"'
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-md border border-[#d6d3d1] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57534e] sm:flex">
                <CalendarDays className="h-3.5 w-3.5" />
                Last 30 days
              </div>
              <div className="hidden rounded-md bg-emerald-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700 lg:block">
                {connected || "Demo"} live sources
              </div>
              <Link href="/ad-copy" aria-label="Open AI tools" className="grid h-9 w-9 place-items-center rounded-md border border-[#d6d3d1] bg-white text-[#b45309]">
                <WandSparkles className="h-4 w-4" />
              </Link>
              <Link href="/opportunities" aria-label="Open attention items" className="relative grid h-9 w-9 place-items-center rounded-md border border-[#d6d3d1] bg-white text-[#57534e]">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#b45309]" />
              </Link>
            </div>
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto bg-[#fafaf9] px-4 pb-8 pt-5 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  dark,
  onNavigate
}: {
  label: string;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; exact?: boolean }>;
  pathname: string;
  dark?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-5">
      <div className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">{label}</div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.exact);
          if (dark) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition ${
                  active ? "bg-[#b45309] font-semibold text-white" : "text-[#d6d3d1] hover:bg-[#292524] hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-white" : "text-[#a8a29e]"}`} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white text-[#b45309]" : "bg-[#b45309] text-white"}`}>{item.badge}</span> : null}
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition ${
                active ? "bg-[#1c1917] font-semibold text-white" : "text-[#44403c] hover:bg-[#f5f5f4]"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-white" : "text-[#78716c]"}`} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? <span className="rounded-full bg-[#b45309] px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string, exact?: boolean) {
  if (href === "/") return pathname === "/";
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
