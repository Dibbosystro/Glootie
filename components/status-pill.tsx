import type { RecommendationState } from "@/lib/types";

const recommendationClasses: Record<RecommendationState, string> = {
  scale: "bg-[#e7f5ec] text-[#1f7a36]",
  test: "bg-[#e0ecff] text-[#1e4dc1]",
  hold: "bg-[#fff4d6] text-[#8a5a00]",
  fix_first: "bg-[#ffe3cc] text-[#a8480c]",
  do_not_advertise: "bg-[#fde2e1] text-[#b42318]"
};

export function RecommendationPill({ state }: { state: RecommendationState }) {
  const label: Record<RecommendationState, string> = {
    scale: "Advertise this",
    test: "Test next",
    hold: "Hold",
    fix_first: "Fix first",
    do_not_advertise: "Do not advertise"
  };
  return <span className={`inline-flex max-w-[128px] shrink-0 justify-center rounded-full px-2.5 py-1 text-center text-xs font-bold leading-tight ${recommendationClasses[state]}`}>{label[state]}</span>;
}

export function DeliveryPill({ delivery }: { delivery: string }) {
  const active = delivery === "active" || delivery === "learning";
  const limited = delivery === "limited";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-[#e7f5ec] text-[#31a24c]" : limited ? "bg-[#fef3c7] text-[#b45309]" : "bg-[#fef3c7] text-[#b45309]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#31a24c]" : limited ? "bg-[#b45309]" : "bg-[#b45309]"}`} />
      {delivery}
    </span>
  );
}
