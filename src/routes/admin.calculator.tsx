import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { captureBookingPayment, listBookings, listSettings } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { Loader2 } from "lucide-react";
import { taxRateForCity } from "@/lib/order-status";

const searchSchema = z.object({
  bookingId: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/admin/calculator")({
  validateSearch: zodValidator(searchSchema),
  component: CalculatorPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const RED = "#DC2626";
const GREEN = "#10B981";

type Booking = Awaited<ReturnType<typeof listBookings>>["bookings"][number];

const SIZE_MIN: Record<string, number> = { Regular: 25, Big: 40, Jumbo: 60 };

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

function CalculatorPage() {
  const { bookingId } = Route.useSearch();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [weight, setWeight] = useState<string>("");
  const [dry, setDry] = useState<number>(0);
  const [comf, setComf] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    (async () => {
      const [b, s] = await Promise.all([
        listBookings({ data: await withToken({}) }),
        listSettings({ data: await withToken({}) }),
      ]);
      const found = (b.bookings ?? []).find((x) => x.id === bookingId) ?? null;
      if (!found) { setNotFound(true); setLoading(false); return; }
      setBooking(found);
      setDry(found.dry_cleaning_items ?? 0);
      setComf(found.comforters ?? 0);
      setSettings(Object.fromEntries((s.settings ?? []).map((row) => [row.key, Number(row.value)])));
      setLoading(false);
    })();
  }, [bookingId]);

  const calc = useMemo(() => {
    if (!booking) return null;
    const min = SIZE_MIN[booking.size_selected] ?? 25;
    const w = parseFloat(weight) || 0;
    const billable = Math.max(w, min);
    const ppl = settings.price_per_lb ?? 2.5;
    const ppd = settings.price_per_dry_clean ?? 10;
    const ppc = settings.price_per_comforter ?? 40;
    const wash = billable * ppl;
    const dryT = dry * ppd;
    const comfT = comf * ppc;
    const subtotal = wash + dryT + comfT;
    const taxRate = taxRateForCity(booking.city);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    const hold = Number(booking.hold_amount ?? 0);
    return { min, billable, ppl, ppd, ppc, wash, dryT, comfT, subtotal, taxRate, taxAmount, total, hold, exceedsHold: total > hold };
  }, [booking, weight, dry, comf, settings]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 className="animate-spin" color={STEEL} />
      </div>
    );
  }

  if (!bookingId) {
    return (
      <p style={{ color: NAVY, fontSize: 16, textAlign: "center", marginTop: 80 }}>
        Please open the calculator from an order in the Orders page.
      </p>
    );
  }

  if (notFound || !booking) {
    return <p style={{ color: RED, fontSize: 16, textAlign: "center", marginTop: 80 }}>Order not found.</p>;
  }

  const exp = expiryParts(booking.auth_expiry_date);
  const w = parseFloat(weight) || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ color: NAVY, fontSize: 20, fontWeight: 700 }}>{booking.customer_name}</span>
        <span style={{ color: STEEL, fontSize: 16 }}>{booking.confirmation_number}</span>
      </div>

      <div style={{ background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <Field label="Original hold" value={`$${Number(booking.hold_amount ?? 0).toFixed(2)}`} />
        <Field label="Size selected" value={booking.size_selected} />
        <FieldExpiry exp={exp} />
        <Field label="Delivery city" value={booking.city} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Lbl>Actual wash and fold weight (lbs)</Lbl>
          <input
            type="number" min={0} max={500} step={0.1} value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{ ...input, width: 200 }} placeholder="e.g. 27.5"
          />
        </div>
        <div>
          <Lbl>Dry cleaning items</Lbl>
          <input type="number" min={0} max={50} value={dry}
            onChange={(e) => setDry(parseInt(e.target.value, 10) || 0)}
            style={{ ...input, width: 120 }} />
        </div>
        <div>
          <Lbl>Comforters</Lbl>
          <input type="number" min={0} max={20} value={comf}
            onChange={(e) => setComf(parseInt(e.target.value, 10) || 0)}
            style={{ ...input, width: 120 }} />
        </div>
      </div>

      {calc && (
        <div style={{ background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="Chargeable weight" value={`${calc.billable} lbs`} />
          {w > 0 && w < calc.min && (
            <p style={{ color: SOFT, fontSize: 12, margin: 0 }}>{calc.min}lb minimum enforced</p>
          )}
          <Row label="Wash and fold" value={`$${calc.wash.toFixed(2)}`} />
          {dry > 0 && <Row label="Dry cleaning" value={`$${calc.dryT.toFixed(2)}`} />}
          {comf > 0 && <Row label="Comforters" value={`$${calc.comfT.toFixed(2)}`} />}
          <hr style={{ border: 0, borderTop: `1px solid ${SOFT}`, margin: "4px 0" }} />
          <Row label="Subtotal" value={`$${calc.subtotal.toFixed(2)}`} bold />
          <Row label="City" value={booking.city} />
          <Row label="Tax rate" value={`${(calc.taxRate * 100).toFixed(2)}%`} />
          <Row label="Tax amount" value={`$${calc.taxAmount.toFixed(2)}`} />
          <hr style={{ border: 0, borderTop: `2px solid ${NAVY}`, margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: NAVY, fontSize: 16, fontWeight: 700 }}>Total to capture</span>
            <span style={{ color: NAVY, fontSize: 28, fontWeight: 700 }}>${calc.total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {calc?.exceedsHold && (
        <div style={{ background: "#FEF2F2", border: `1.5px solid ${RED}`, borderRadius: 8, padding: 16 }}>
          <p style={{ color: RED, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Warning — This order total of ${calc.total.toFixed(2)} exceeds the original hold of ${calc.hold.toFixed(2)}. An incremental authorization for the difference will be requested automatically before capture. Please confirm to proceed.
          </p>
        </div>
      )}

      <div>
        <button
          type="button"
          disabled={success !== null || submitting || w <= 0}
          onClick={async () => {
            if (!booking || w <= 0) return;
            setSubmitting(true); setError(null);
            const r = await captureBookingPayment({
              data: await withToken({ booking_id: booking.id, actual_weight: w }),
            });
            setSubmitting(false);
            if (r.error) {
              setError(r.error);
            } else {
              setSuccess({ amount: Number(r.captured ?? calc?.total ?? 0) });
            }
          }}
          style={{
            width: "100%",
            background: success ? GREEN : STEEL,
            color: "#FFFFFF", border: "none", borderRadius: 8, padding: 16,
            fontSize: 16, fontWeight: 600,
            cursor: success !== null || submitting || w <= 0 ? "not-allowed" : "pointer",
            opacity: success === null && (submitting || w <= 0) ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {success ? "Payment Captured" : submitting ? "Processing" : "Capture Payment"}
        </button>
        {success && (
          <p style={{ color: NAVY, fontSize: 16, fontWeight: 600, marginTop: 12 }}>
            ${success.amount.toFixed(2)} charged{" "}
            <span style={{ color: STEEL, fontWeight: 400, marginLeft: 8 }}>Receipt sent to {booking.email}</span>
          </p>
        )}
        {error && (
          <p style={{ color: RED, fontSize: 14, marginTop: 12 }}>{error}</p>
        )}
      </div>
    </div>
  );
}

const input: React.CSSProperties = { background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "14px 16px", fontSize: 15, color: NAVY, outline: "none" };

function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", color: NAVY, fontSize: 13, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{children}</label>;
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: STEEL, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{label}</span>
      <span style={{ color: NAVY, fontSize: 15, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
function FieldExpiry({ exp }: { exp: { text: string; urgent: boolean; expired: boolean } }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ color: STEEL, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Auth expiry countdown</span>
      <span style={{ color: exp.urgent || exp.expired ? RED : NAVY, fontSize: 15, fontWeight: exp.urgent || exp.expired ? 700 : 500 }}>{exp.text}</span>
    </div>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: STEEL, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{label}</span>
      <span style={{ color: NAVY, fontSize: 15, fontWeight: bold ? 600 : 500 }}>{value}</span>
    </div>
  );
}
