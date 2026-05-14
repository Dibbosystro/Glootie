export function currency(value: number, code = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: code,
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(value);
}

export function number(value: number): string {
  return new Intl.NumberFormat("en-AU").format(value);
}

export function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function roas(value: number): string {
  if (!Number.isFinite(value)) return "0.00x";
  return `${value.toFixed(2)}x`;
}

export function dateShort(iso: string | null): string {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
