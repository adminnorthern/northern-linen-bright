import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listBookings, listSupplies, updateOrderStatus } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { Loader2 } from "lucide-react";
import { STATUS_META, NEXT_ACTION, type OrderStatus } from "@/lib/order-status";

export const Route = createFileRoute("/admin/")({
  component: OperationsPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";

type Booking = Awaited<ReturnType<typeof listBookings>>["bookings"][number];
type Supply = Awaited<ReturnType<typeof listSupplies>>["supplies"][number];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function OperationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const [b, s] = await Promise.all([
      listBookings({ data: await withToken({}) }),
      listSupplies({ data: await withToken({}) }),
    ]);
    setBookings(b.bookings ?? []);
    setSupplies(s.supplies ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const today = todayISO();
  const todayPickups = useMemo(() => bookings.filter((b) => b.pickup_date === today), [bookings, today]);
  const inProgress = useMemo(
    () => bookings.filter((b) => ["picked_up", "washing"].includes(b.order_status)),
    [bookings]
  );
  const outForDelivery = useMemo(() => bookings.filter((b) => b.order_status === "out_for_delivery"), [bookings]);
  const lowStock = useMemo(() => supplies.filter((s) => s.current_stock <= s.minimum_threshold), [supplies]);

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
        <p style={{ color: STEEL, fontSize: 15, marginTop: 4 }}>Today's snapshot — {today}</p>
      </div>

      <StatGrid>
        <Stat label="Today's pickups" value={todayPickups.length} />
        <Stat label="In progress" value={inProgress.length} />
        <Stat label="Out for delivery" value={outForDelivery.length} />
        <Stat label="Low stock items" value={lowStock.length} />
      </StatGrid>

      <Section title="Today's pickups">
        {todayPickups.length === 0 ? (
          <Empty text="No pickups scheduled today" />
        ) : (
          <BookingTable
            bookings={todayPickups}
            savingId={savingId}
            onStatus={async (b, status) => {
              setSavingId(b.id);
              await updateOrderStatus({ data: await withToken({ booking_id: b.id, order_status: status }) });
              await load();
              setSavingId(null);
            }}
          />
        )}
      </Section>

      <Section title="Out for delivery">
        {outForDelivery.length === 0 ? (
          <Empty text="No deliveries currently in transit" />
        ) : (
          <BookingTable
            bookings={outForDelivery}
            savingId={savingId}
            onStatus={async (b, status) => {
              setSavingId(b.id);
              await updateOrderStatus({ data: await withToken({ booking_id: b.id, order_status: status }) });
              await load();
              setSavingId(null);
            }}
          />
        )}
      </Section>

      <Section title="Low stock alerts">
        {lowStock.length === 0 ? (
          <Empty text="All supplies are above their minimum threshold" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lowStock.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: 16, border: `1.5px solid ${SOFT}`, borderRadius: 8 }}>
                <span style={{ color: NAVY, fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: STEEL }}>
                  {s.current_stock} on hand · min {s.minimum_threshold}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>{children}</div>;
}
export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 20 }}>
      <div style={{ color: STEEL, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ color: NAVY, fontSize: 32, fontWeight: 700, marginTop: 8 }}>{value}</div>
    </div>
  );
}
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ color: NAVY, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return <p style={{ color: NAVY, fontSize: 16, textAlign: "center", padding: 32, border: `1.5px dashed ${SOFT}`, borderRadius: 12, margin: 0 }}>{text}</p>;
}

type Status = OrderStatus;

export function BookingTable({
  bookings,
  savingId,
  onStatus,
}: {
  bookings: Booking[];
  savingId: string | null;
  onStatus: (b: Booking, s: Status) => Promise<void>;
}) {
  return (
    <div style={{ overflowX: "auto", border: `1.5px solid ${SOFT}`, borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
        <thead>
          <tr style={{ background: "rgba(91,157,181,0.05)" }}>
            <Th>#</Th>
            <Th>Customer</Th>
            <Th>Pickup</Th>
            <Th>Size</Th>
            <Th>Status</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const status = (b.order_status as OrderStatus);
            const meta = STATUS_META[status] ?? { label: b.order_status, bg: "#6B7280", fg: "#FFFFFF" };
            const next = NEXT_ACTION[status] ?? null;
            const saving = savingId === b.id;
            return (
              <tr key={b.id} style={{ borderTop: `1px solid ${SOFT}40` }}>
                <Td>{b.confirmation_number}</Td>
                <Td>
                  <div style={{ color: NAVY, fontWeight: 600 }}>{b.customer_name}</div>
                  <div style={{ color: STEEL, fontSize: 12 }}>{b.phone}</div>
                </Td>
                <Td>
                  {b.pickup_date}
                  <div style={{ color: STEEL, fontSize: 12 }}>{b.pickup_time}</div>
                </Td>
                <Td>{b.size_selected}</Td>
                <Td>
                  <span style={{ display: "inline-block", background: meta.bg, color: meta.fg, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    {meta.label}
                  </span>
                </Td>
                <Td>
                  {next ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onStatus(b, next.next)}
                      style={{ background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, whiteSpace: "nowrap" }}
                    >
                      {saving ? "Saving…" : next.label}
                    </button>
                  ) : (
                    <span style={{ color: STEEL, fontSize: 12 }}>—</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: 12, color: STEEL, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: 12, color: NAVY, fontSize: 14, verticalAlign: "top" }}>{children}</td>;
}
