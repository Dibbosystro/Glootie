import type { RecommendationState } from "@/lib/types";

const recommendationClasses: Record<RecommendationState, string> = {
  scale: "bg-[#e7f5ec] text-[#31a24c]",
  test: "bg-[#f2ecff] text-[#6d28d9]",
  hold: "bg-[#f2ecff] text-[#6d28d9]",
  fix_first: "bg-[#f2ecff] text-[#6d28d9]",
  do_not_advertise: "bg-[#f2ecff] text-[#6d28d9]"
};

export function RecommendationPill({ state }: { state: RecommendationState }) {
  const label: Record<RecommendationState, string> = {
    scale: "Advertise this",
    test: "Test next",
    hold: "Hold",
    fix_first: "Fix first",
    do_not_advertise: "Do not advertise"
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${recommendationClasses[state]}`}>{label[state]}</span>;
}

export function DeliveryPill({ delivery }: { delivery: string }) {
  const active = delivery === "active" || delivery === "learning";
  const limited = delivery === "limited";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-[#e7f5ec] text-[#31a24c]" : limited ? "bg-[#f2ecff] text-[#6d28d9]" : "bg-[#f2ecff] text-[#6d28d9]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#31a24c]" : limited ? "bg-[#6d28d9]" : "bg-[#6d28d9]"}`} />
      {delivery}
    </span>
  );
}
