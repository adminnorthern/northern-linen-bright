// Shared display labels and colors for order statuses.
export type OrderStatus = "pending" | "picked_up" | "washing" | "out_for_delivery" | "delivered" | "cancelled";

export const STATUS_META: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  pending:          { label: "Pending Pickup",   bg: "#F59E0B", fg: "#FFFFFF" },
  picked_up:        { label: "Picked Up",        bg: "#5B9DB5", fg: "#FFFFFF" },
  washing:          { label: "At Plant",         bg: "#F97316", fg: "#FFFFFF" },
  out_for_delivery: { label: "Out for Delivery", bg: "#1B3A4B", fg: "#FFFFFF" },
  delivered:        { label: "Completed",        bg: "#10B981", fg: "#FFFFFF" },
  cancelled:        { label: "Cancelled",        bg: "#6B7280", fg: "#FFFFFF" },
};

export function statusLabel(s: string): string {
  return (STATUS_META as Record<string, { label: string }>)[s]?.label ?? s;
}

// One-tap next-step action for ops viewer. null means no button (terminal state).
export const NEXT_ACTION: Record<OrderStatus, { next: OrderStatus; label: string } | null> = {
  pending:          { next: "picked_up",        label: "Mark Picked Up" },
  picked_up:        { next: "washing",          label: "Mark At Plant" },
  washing:          { next: "out_for_delivery", label: "Mark Out for Delivery" },
  out_for_delivery: { next: "delivered",        label: "Mark Completed" },
  delivered:        null,
  cancelled:        null,
};

// Minnesota city sales-tax rates (used for capture + live calculator).
export const CITY_TAX_RATES: Record<string, number> = {
  bloomington: 0.0903,
  minneapolis: 0.0903,
  richfield: 0.0903,
  edina: 0.0853,
  "st paul": 0.09875,
  "saint paul": 0.09875,
  "st louis park": 0.0853,
  minnetonka: 0.0853,
};

export function taxRateForCity(city: string | null | undefined): number {
  const key = (city ?? "").toLowerCase().trim();
  return CITY_TAX_RATES[key] ?? 0.0903;
}
