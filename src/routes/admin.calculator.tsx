import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { captureBookingPayment, listBookings, listSettings } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { Empty } from "./admin.index";
import { Loader2 } from "lucide-react";
import { taxRateForCity } from "@/lib/order-status";

export const Route = createFileRoute("/admin/calculator")({
  component: CalculatorPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const ERR = "#DC2626";

type Booking = Awaited<ReturnType<typeof listBookings>>["bookings"][number];
type Setting = Awaited<ReturnType<typeof listSettings>>["settings"][number];

function CalculatorPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [weight, setWeight] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    const [b, s] = await Promise.all([
      listBookings({ data: await withToken({}) }),
      listSettings({ data: await withToken({}) }),
    ]);
    const open = (b.bookings ?? []).filter((x) => !["delivered", "cancelled"].includes(x.order_status));
    setBookings(open);
    setSettings(Object.fromEntries((s.settings ?? []).map((row: Setting) => [row.key, Number(row.value)])));
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const booking = bookings.find((b) => b.id === selected);
  const sizeMin: Record<string, number> = { Regular: 25, Big: 40, Jumbo: 60 };

  const calc = useMemo(() => {
    if (!booking) return null;
    const min = sizeMin[booking.size_selected] ?? 25;
    const billable = Math.max(weight, min);
    const ppl = settings.price_per_lb ?? 2.5;
    const ppd = settings.price_per_dry_clean ?? 10;
    const ppc = settings.price_per_comforter ?? 40;
    const wash = billable * ppl;
    const dry = (booking.dry_cleaning_items ?? 0) * ppd;
    const comf = (booking.comforters ?? 0) * ppc;
    const total = wash + dry + comf;
    const hold = Number(booking.hold_amount ?? 0);
    return { min, billable, ppl, ppd, ppc, wash, dry, comf, total, hold, exceedsHold: total > hold };
  }, [booking, weight, settings]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 className="animate-spin" color={STEEL} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Weigh-in & Capture</h1>
        <p style={{ color: STEEL, fontSize: 15, marginTop: 4 }}>Enter actual weight to finalize and charge the customer</p>
      </div>

      {bookings.length === 0 ? (
        <Empty text="No open orders to capture" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          <div style={{ background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 24 }}>
            <Label>Order</Label>
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setResult(null);
              }}
              style={{ width: "100%", background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "12px 14px", fontSize: 15, color: NAVY, marginBottom: 16, cursor: "pointer" }}
            >
              <option value="">Select an order…</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.confirmation_number} — {b.customer_name} ({b.size_selected})
                </option>
              ))}
            </select>

            <Label>Actual weight (lbs)</Label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={weight || ""}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              style={{ width: "100%", background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "12px 14px", fontSize: 15, color: NAVY, outline: "none", marginBottom: 16 }}
              placeholder="e.g. 27.5"
            />

            <button
              type="button"
              disabled={!booking || weight <= 0 || submitting}
              onClick={async () => {
                if (!booking) return;
                setSubmitting(true);
                setResult(null);
                const r = await captureBookingPayment({ data: await withToken({ booking_id: booking.id, actual_weight: weight }) });
                setSubmitting(false);
                if (r.error) {
                  setResult({ ok: false, msg: r.error });
                } else {
                  setResult({ ok: true, msg: `Captured $${r.captured?.toFixed(2)} and emailed receipt.` });
                  setWeight(0);
                  await load();
                  setSelected("");
                }
              }}
              style={{ width: "100%", background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 600, cursor: !booking || weight <= 0 || submitting ? "not-allowed" : "pointer", opacity: !booking || weight <= 0 || submitting ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Capturing payment…" : "Capture & email receipt"}
            </button>

            {result && (
              <p style={{ marginTop: 12, padding: 12, borderRadius: 8, background: result.ok ? "rgba(91,157,181,0.1)" : "rgba(220,38,38,0.05)", color: result.ok ? NAVY : ERR, fontSize: 14 }}>{result.msg}</p>
            )}
          </div>

          <div style={{ background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ color: NAVY, fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Breakdown</h3>
            {!calc ? (
              <p style={{ color: STEEL, fontSize: 14 }}>Select an order to see the breakdown.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Row label={`Wash & fold (${calc.billable} lb @ $${calc.ppl.toFixed(2)})`} value={`$${calc.wash.toFixed(2)}`} />
                {calc.billable !== weight && weight > 0 && (
                  <p style={{ color: STEEL, fontSize: 12, margin: 0 }}>Actual {weight} lb — billed at {calc.min} lb minimum.</p>
                )}
                {(booking?.dry_cleaning_items ?? 0) > 0 && <Row label={`Dry cleaning (${booking?.dry_cleaning_items} × $${calc.ppd.toFixed(2)})`} value={`$${calc.dry.toFixed(2)}`} />}
                {(booking?.comforters ?? 0) > 0 && <Row label={`Comforters (${booking?.comforters} × $${calc.ppc.toFixed(2)})`} value={`$${calc.comf.toFixed(2)}`} />}
                <hr style={{ border: 0, borderTop: `1px solid ${SOFT}`, margin: "8px 0" }} />
                <Row label="Original hold" value={`$${calc.hold.toFixed(2)}`} muted />
                <Row label="Final total" value={`$${calc.total.toFixed(2)}`} bold />
                {calc.exceedsHold && (
                  <p style={{ color: STEEL, fontSize: 12, margin: "8px 0 0", padding: 8, background: "rgba(91,157,181,0.08)", borderRadius: 6 }}>
                    Total exceeds the original hold. We will request an incremental authorization on the customer's card before capturing.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", color: NAVY, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{children}</label>;
}
function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: muted ? STEEL : NAVY, fontSize: bold ? 16 : 14, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ color: muted ? STEEL : NAVY, fontSize: bold ? 16 : 14, fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}
