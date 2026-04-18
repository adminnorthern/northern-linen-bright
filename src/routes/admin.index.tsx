import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listBookings, updateOrderStatus } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { Loader2, Phone } from "lucide-react";
import { STATUS_META, NEXT_ACTION, type OrderStatus } from "@/lib/order-status";

export const Route = createFileRoute("/admin/")({
  component: OperationsPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const RED = "#DC2626";
const GREEN = "#10B981";

type Booking = Awaited<ReturnType<typeof listBookings>>["bookings"][number];
type Status = OrderStatus;

const ORDER: Status[] = ["pending", "picked_up", "washing", "out_for_delivery", "delivered", "cancelled"];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function formatPickup(date: string, time: string): string {
  try {
    const d = new Date(`${date}T00:00:00`);
    const day = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    return `${day} at ${time}`;
  } catch {
    return `${date} at ${time}`;
  }
}

function expiryParts(expiry: string | null): { text: string; urgent: boolean; expired: boolean } {
  if (!expiry) return { text: "No expiry set", urgent: false, expired: false };
  const ms = new Date(expiry).getTime() - Date.now();
  if (ms <= 0) return { text: "AUTHORIZATION EXPIRED", urgent: false, expired: true };
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  if (hours >= 24) {
    const remH = hours - days * 24;
    return { text: `${days} days ${remH} hours remaining`, urgent: false, expired: false };
  }
  return { text: `URGENT — ${hours} hours remaining`, urgent: true, expired: false };
}

function OperationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; msg: string } | null>(null);

  async function load() {
    const r = await listBookings({ data: await withToken({}) });
    setBookings(r.bookings ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const today = todayISO();
  const stats = useMemo(() => {
    const todayList = bookings.filter((b) => b.pickup_date === today);
    return {
      todayTotal: todayList.length,
      todayPending: todayList.filter((b) => b.order_status === "pending").length,
      pickedUp: bookings.filter((b) => b.order_status === "picked_up").length,
      completed: bookings.filter((b) => b.order_status === "delivered").length,
    };
  }, [bookings, today]);

  const grouped = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => {
      if (a.pickup_date !== b.pickup_date) return a.pickup_date.localeCompare(b.pickup_date);
      return a.created_at.localeCompare(b.created_at);
    });
    const groups: Record<Status, Booking[]> = {
      pending: [], picked_up: [], washing: [], out_for_delivery: [], delivered: [], cancelled: [],
    };
    for (const b of sorted) {
      const s = b.order_status as Status;
      if (groups[s]) groups[s].push(b);
    }
    return groups;
  }, [bookings]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 className="animate-spin" color={STEEL} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Operations</h1>
        <p style={{ color: STEEL, fontSize: 15, marginTop: 4 }}>Live view of every active order</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Stat label="Total today" value={stats.todayTotal} />
        <Stat label="Pending pickup" value={stats.todayPending} />
        <Stat label="Picked up" value={stats.pickedUp} />
        <Stat label="Completed" value={stats.completed} />
      </div>

      {ORDER.map((status) => {
        const list = grouped[status];
        if (!list || list.length === 0) return null;
        return (
          <div key={status}>
            <h2 style={{ color: NAVY, fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>
              {STATUS_META[status].label}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {list.map((b) => (
                <OrderCard
                  key={b.id}
                  booking={b}
                  saving={savingId === b.id}
                  error={errorId?.id === b.id ? errorId.msg : null}
                  onAdvance={async (next) => {
                    setSavingId(b.id);
                    setErrorId(null);
                    const r = await updateOrderStatus({
                      data: await withToken({ booking_id: b.id, order_status: next }),
                    });
                    setSavingId(null);
                    if (r?.error) {
                      setErrorId({ id: b.id, msg: r.error });
                    } else {
                      // optimistic refresh
                      await load();
                    }
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {bookings.length === 0 && (
        <p style={{ color: NAVY, fontSize: 16, textAlign: "center", padding: 32, border: `1.5px dashed ${SOFT}`, borderRadius: 12, margin: 0 }}>
          No orders yet.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
      <div style={{ color: STEEL, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ color: NAVY, fontSize: 32, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", background: "#FFFFFF", border: `1.5px solid ${SOFT}`, color: NAVY,
      fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
    }}>{children}</span>
  );
}

function CountRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: STEEL, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{label}</span>
      <span style={{ color: NAVY, fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function OrderCard({
  booking, saving, error, onAdvance,
}: {
  booking: Booking;
  saving: boolean;
  error: string | null;
  onAdvance: (next: Status) => Promise<void>;
}) {
  const status = booking.order_status as Status;
  const meta = STATUS_META[status] ?? { label: booking.order_status, bg: "#6B7280", fg: "#FFFFFF" };
  const next = NEXT_ACTION[status] ?? null;
  const exp = expiryParts(booking.auth_expiry_date);
  const sms = booking.sms_1_status;
  const smsColor = sms === "sent" ? GREEN : sms.startsWith("failed") ? RED : SOFT;

  return (
    <div style={{
      background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 20,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ color: NAVY, fontSize: 18, fontWeight: 700 }}>{booking.customer_name}</div>
      <div style={{ color: NAVY, fontSize: 14 }}>
        {booking.street_address}, {booking.city}, {booking.state} {booking.zip}
      </div>
      <a href={`tel:${booking.phone}`} style={{ color: STEEL, fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Phone size={14} /> {booking.phone}
      </a>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge>{booking.size_selected}</Badge>
        <Badge>{booking.scent_profile}</Badge>
      </div>
      <div style={{ color: NAVY, fontSize: 14, fontWeight: 500 }}>
        {formatPickup(booking.pickup_date, booking.pickup_time)}
      </div>
      {booking.dry_cleaning_items > 0 && <CountRow label="Dry cleaning" value={booking.dry_cleaning_items} />}
      {booking.comforters > 0 && <CountRow label="Comforters" value={booking.comforters} />}
      <div>
        <span style={{
          display: "inline-block", background: meta.bg, color: meta.fg, fontSize: 12, fontWeight: 600,
          padding: "6px 16px", borderRadius: 20,
        }}>{meta.label}</span>
      </div>
      <div>
        {exp.expired ? (
          <span style={{ display: "inline-block", background: "#FEF2F2", border: `1px solid ${RED}`, color: RED, padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            {exp.text}
          </span>
        ) : (
          <span style={{ color: exp.urgent ? RED : STEEL, fontSize: 13, fontWeight: exp.urgent ? 700 : 400 }}>
            {exp.text}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: smsColor }} />
        <span style={{ color: STEEL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>SMS</span>
      </div>
      {next && (
        <button
          type="button"
          disabled={saving}
          onClick={() => onAdvance(next.next)}
          style={{
            width: "100%", background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 8,
            padding: 12, fontSize: 15, fontWeight: 600, marginTop: 4,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : next.label}
        </button>
      )}
      {error && (
        <div style={{ color: RED, fontSize: 13, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}
