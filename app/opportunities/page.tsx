import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecommendationPill } from "@/components/status-pill";
import { getDashboardData, getProductById } from "@/lib/data";
import { currency, number } from "@/lib/format";
import type { Product, Recommendation, RecommendationState } from "@/lib/types";

type Verdict = "all" | RecommendationState;

const verdictOrder: RecommendationState[] = ["scale", "test", "hold", "fix_first", "do_not_advertise"];

const verdictLabel: Record<Verdict, string> = {
  all: "All",
  scale: "Advertise this",
  test: "Test next",
  hold: "Hold",
  fix_first: "Fix first",
  do_not_advertise: "Do not advertise"
};

type SortKey = "score" | "revenue" | "name";

type Row = { rec: Recommendation; product: Product };

export default async function OpportunitiesPage({ searchParams }: { searchParams?: Promise<{ verdict?: string | string[]; sort?: string | string[] }> }) {
  const data = await getDashboardData();
  const params = await searchParams;
  const verdict = parseVerdict(params?.verdict);
  const sort = parseSort(params?.sort);

  const counts = countByVerdict(data.recommendations);
  const filtered = verdict === "all" ? data.recommendations : data.recommendations.filter((rec) => rec.state === verdict);
  const onlineRows = filtered
    .map((rec) => ({ rec, product: getProductById(data, rec.productId) }))
    .filter((row): row is Row => Boolean(row.product));
  const onlineSorted = sortRows(onlineRows, sort);

  const draftProducts = [...data.products]
    .filter((product) => product.status === "draft")
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <AppShell data={data}>
      <div className="space-y-8">
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#65676b]">Online products</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">What should we advertise next?</h1>
              <p className="mt-2 max-w-3xl text-sm text-[#65676b]">Active products with a verdict. Filter by verdict, sort by readiness, revenue, or name.</p>
            </div>
            <SortToggle selected={sort} verdict={verdict} />
          </div>

          <VerdictFilter selected={verdict} counts={counts} total={data.recommendations.length} sort={sort} />

          <div className="space-y-2">
            {onlineSorted.length === 0 ? (
              <div className="card p-6 text-center text-sm text-[#65676b]">No online products match this verdict.</div>
            ) : (
              onlineSorted.map(({ rec, product }) => (
                <Link
                  key={rec.id}
                  href={`/products/${product.id}`}
                  className="card flex items-center gap-4 p-3 transition hover:border-[#cbbcf6] hover:bg-[#fbfaff]"
                >
                  <img src={product.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-bold text-[#111014]">{product.title}</h2>
                      <RecommendationPill state={rec.state} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-[#65676b]">{rec.reason}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8d8799]">
                      <span>{number(product.inventoryQty)} in stock</span>
                      <span>{currency(product.revenue30d)} 30d revenue</span>
                      <span>{number(product.unitsSold30d)} units sold</span>
                    </div>
                  </div>
                  <div className="hidden flex-col items-end text-right sm:flex">
                    <div className="mono text-xl font-bold text-[#6d28d9]">{rec.score}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8d8799]">readiness</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#65676b]">Drafts</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.02em]">Draft products in Shopify</h2>
              <p className="mt-1 max-w-3xl text-sm text-[#65676b]">Not yet published. Excluded from ad recommendations until they go live.</p>
            </div>
            <span className="mono rounded-full bg-[#ebe8f1] px-3 py-1 text-xs font-bold text-[#4a4658]">{draftProducts.length}</span>
          </div>

          <div className="space-y-2">
            {draftProducts.length === 0 ? (
              <div className="card p-6 text-center text-sm text-[#65676b]">No draft products in Shopify.</div>
            ) : (
              draftProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="card flex items-center gap-4 p-3 transition hover:border-[#cbbcf6] hover:bg-[#fbfaff]"
                >
                  <img src={product.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-[#111014]">{product.title}</h3>
                      <span className="inline-flex shrink-0 justify-center rounded-full bg-[#ebe8f1] px-2.5 py-1 text-xs font-bold text-[#4a4658]">Draft</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-[#65676b]">{product.productType || "Uncategorised"} · {product.vendor || "No vendor"}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8d8799]">
                      <span>{number(product.inventoryQty)} in stock</span>
                      <span>{currency(product.price)} price</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function VerdictFilter({ selected, counts, total, sort }: { selected: Verdict; counts: Record<RecommendationState, number>; total: number; sort: SortKey }) {
  const options: Verdict[] = ["all", ...verdictOrder];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected === option;
        const count = option === "all" ? total : counts[option];
        return (
          <Link
            key={option}
            href={opportunitiesHref(option, sort)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active ? "border-[#111014] bg-[#111014] text-white" : "border-[#e8e4ef] bg-white text-[#4f4a59] hover:border-[#cbbcf6] hover:bg-[#f7f3ff]"
            }`}
          >
            <span>{verdictLabel[option]}</span>
            <span className={`mono rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/15 text-white" : "bg-[#f1eef8] text-[#6d28d9]"}`}>{count}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SortToggle({ selected, verdict }: { selected: SortKey; verdict: Verdict }) {
  const options: Array<{ key: SortKey; label: string }> = [
    { key: "score", label: "Readiness" },
    { key: "revenue", label: "Revenue" },
    { key: "name", label: "Name" }
  ];
  return (
    <div className="inline-flex rounded-full border border-[#e8e4ef] bg-white p-0.5 text-xs shadow-sm">
      {options.map((option) => {
        const active = selected === option.key;
        return (
          <Link
            key={option.key}
            href={opportunitiesHref(verdict, option.key)}
            className={`rounded-full px-3 py-1.5 transition ${active ? "bg-[#111014] font-semibold text-white" : "text-[#6f6b78] hover:bg-[#f1eef8]"}`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function parseVerdict(value: string | string[] | undefined): Verdict {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && (verdictOrder as string[]).includes(raw)) return raw as RecommendationState;
  return "all";
}

function parseSort(value: string | string[] | undefined): SortKey {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "revenue" || raw === "name") return raw;
  return "score";
}

function opportunitiesHref(verdict: Verdict, sort: SortKey) {
  const params = new URLSearchParams();
  if (verdict !== "all") params.set("verdict", verdict);
  if (sort !== "score") params.set("sort", sort);
  const query = params.toString();
  return query ? `/opportunities?${query}` : "/opportunities";
}

function countByVerdict(recommendations: Recommendation[]): Record<RecommendationState, number> {
  const tally: Record<RecommendationState, number> = {
    scale: 0,
    test: 0,
    hold: 0,
    fix_first: 0,
    do_not_advertise: 0
  };
  for (const rec of recommendations) {
    tally[rec.state] += 1;
  }
  return tally;
}

function sortRows(rows: Row[], sort: SortKey): Row[] {
  const copy = [...rows];
  if (sort === "name") {
    copy.sort((a, b) => a.product.title.localeCompare(b.product.title));
    return copy;
  }
  if (sort === "revenue") {
    copy.sort((a, b) => b.product.revenue30d - a.product.revenue30d);
    return copy;
  }
  copy.sort((a, b) => b.rec.score - a.rec.score);
  return copy;
}
