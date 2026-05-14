import { AppShell } from "@/components/app-shell";
import { RecommendationPill } from "@/components/status-pill";
import { getDashboardData, getProductById } from "@/lib/data";

export default async function OpportunitiesPage() {
  const data = await getDashboardData();
  const ordered = [...data.recommendations].sort((a, b) => b.score - a.score);
  return (
    <AppShell data={data}>
      <div className="space-y-5">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#65676b]">Product ad recommendations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">What should we advertise next?</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#65676b]">Each recommendation is written for a client to understand: the decision, why it matters, and what the next action is.</p>
        </section>
        <div className="space-y-3">
          {ordered.map((rec) => {
            const product = getProductById(data, rec.productId);
            if (!product) return null;
            return (
              <div key={rec.id} className="card grid grid-cols-1 gap-4 p-4 lg:grid-cols-[96px_1fr_160px]">
                <img src={product.imageUrl} alt="" className="h-24 w-24 rounded-md object-cover" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{rec.headline}</h2>
                    <RecommendationPill state={rec.state} />
                  </div>
                  <p className="mt-2 text-sm text-[#1c1e21]">{rec.reason}</p>
                  <p className="mt-2 text-sm font-semibold text-[#65676b]">Next: {rec.nextAction}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rec.signals.map((signal) => <span key={signal} className="rounded-full bg-[#f2ecff] px-2.5 py-1 text-xs font-bold text-[#6d28d9]">{signal}</span>)}
                  </div>
                </div>
                <div className="flex flex-col items-start justify-center lg:items-end">
                  <div className="mono text-4xl font-bold text-[#6d28d9]">{rec.score}</div>
                  <div className="text-xs font-semibold text-[#65676b]">readiness score</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
