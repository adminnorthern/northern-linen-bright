import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listBookings } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { Loader2, X } from "lucide-react";
import { STATUS_META, type OrderStatus } from "@/lib/order-status";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const ALT = "#F8FBFC";
const RED = "#DC2626";
const GREEN = "#10B981";

type Booking = Awaited<ReturnType<typeof listBookings>>["bookings"][number];

function fmtDateShort(d: string) {
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return d; }
}
function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function OrdersPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");
  const [open, setOpen] = useState<Booking | null>(null);

  useEffect(() => {
    (async () => {
      const r = await listBookings({ data: await withToken({}) });
      setBookings(r.bookings ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.order_status !== statusFilter) return false;
      if (activeFrom && b.pickup_date < activeFrom) return false;
      if (activeTo && b.pickup_date > activeTo) return false;
      if (!q) return true;
      return (
        b.customer_name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.confirmation_number.toLowerCase().includes(q)
      );
    });
  }, [bookings, search, statusFilter, activeFrom, activeTo]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 className="animate-spin" color={STEEL} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>All Orders</h1>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, phone, or confirmation number"
        style={{ width: "100%", background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "12px 16px", fontSize: 14, color: NAVY, outline: "none" }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={lbl}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inp}>
            <option value="all">All Statuses</option>
            {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Date From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Date To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inp} />
        </div>
        <button
          type="button"
          onClick={() => { setActiveFrom(dateFrom); setActiveTo(dateTo); }}
          style={{ background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >Apply Filters</button>
        <button
          type="button"
          onClick={() => { setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); setActiveFrom(""); setActiveTo(""); }}
          style={{ background: "transparent", color: STEEL, border: "none", padding: "10px 8px", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
        >Clear Filters</button>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: NAVY, fontSize: 16, textAlign: "center", marginTop: 48 }}>No orders found.</p>
      ) : (
        <div style={{ overflowX: "auto", border: `1.5px solid ${SOFT}`, borderRadius: 12, background: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: SOFT }}>
                <Th>Confirmation</Th><Th>Customer</Th><Th>Pickup Date</Th><Th>Size</Th>
                <Th>Status</Th><Th>Hold</Th><Th>Captured</Th><Th>SMS</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const meta = STATUS_META[b.order_status as OrderStatus] ?? { label: b.order_status, bg: "#6B7280", fg: "#FFFFFF" };
                const smsColor = b.sms_1_status === "sent" ? GREEN : b.sms_1_status.startsWith("failed") ? RED : SOFT;
                return (
                  <tr key={b.id} onClick={() => setOpen(b)} style={{ background: i % 2 === 0 ? "#FFFFFF" : ALT, cursor: "pointer", borderBottom: `1px solid ${SOFT}` }}>
                    <Td bold>{b.confirmation_number}</Td>
                    <Td>{b.customer_name}</Td>
                    <Td>{fmtDateShort(b.pickup_date)}</Td>
                    <Td>{b.size_selected}</Td>
                    <Td>
                      <span style={{ display: "inline-block", background: meta.bg, color: meta.fg, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20 }}>{meta.label}</span>
                    </Td>
                    <Td>{fmtMoney(b.hold_amount)}</Td>
                    <Td>{fmtMoney(b.final_captured_amount)}</Td>
                    <Td><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: smsColor }} /></Td>
                    <Td>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(b); }} style={{ background: "none", border: "none", color: STEEL, fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}>View Details</button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal onClose={() => setOpen(null)}>
          <h2 style={{ color: NAVY, fontSize: 22, fontWeight: 700, margin: "0 0 24px" }}>Order Details</h2>
          <div>
            <Field label="Confirmation Number" value={open.confirmation_number} />
            <Field label="Customer Name" value={open.customer_name} />
            <Field label="Email" value={open.email} />
            <Field label="Phone" value={open.phone} />
            <Field label="Street Address" value={open.street_address} />
            <Field label="City" value={open.city} />
            <Field label="State" value={open.state} />
            <Field label="ZIP" value={open.zip} />
            <Field label="Size Selected" value={open.size_selected} />
            <Field label="Scent" value={open.scent_profile} />
            <Field label="Dry Cleaning Items" value={String(open.dry_cleaning_items)} />
            <Field label="Comforters" value={String(open.comforters)} />
            <Field label="Pickup Date" value={open.pickup_date} />
            <Field label="Pickup Time" value={open.pickup_time} />
            <Field label="Hold Amount" value={fmtMoney(open.hold_amount)} />
            <Field label="Auth Expiry Date" value={open.auth_expiry_date ?? "—"} />
            <Field label="Order Status" value={STATUS_META[open.order_status as OrderStatus]?.label ?? open.order_status} />
            <Field label="Actual Weight" value={open.actual_weight ? `${open.actual_weight} lbs` : "—"} />
            <Field label="Captured Amount" value={fmtMoney(open.final_captured_amount)} />
            <Field label="SMS 1 Status" value={open.sms_1_status} />
            <Field label="SMS 2 Status" value={open.sms_2_status} />
            <Field label="Receipt Email Status" value={open.receipt_email_status} />
            <Field label="Created At" value={open.created_at} />
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/admin/calculator", search: { bookingId: open.id } })}
            style={{ width: "100%", background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 600, marginTop: 24, cursor: "pointer" }}
          >Open Calculator</button>
        </Modal>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", color: STEEL, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 };
const inp: React.CSSProperties = { background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: NAVY, outline: "none" };

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "12px 16px", color: NAVY, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</th>;
}
function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return <td style={{ padding: "14px 16px", color: NAVY, fontSize: 14, fontWeight: bold ? 600 : 400, verticalAlign: "middle" }}>{children}</td>;
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${SOFT}`, gap: 12 }}>
      <span style={{ color: STEEL, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{label}</span>
      <span style={{ color: NAVY, fontSize: 15, fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

export function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(27,58,75,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 16, padding: 40, maxWidth: 620, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <button type="button" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: NAVY, fontSize: 20, cursor: "pointer", padding: 4 }}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
