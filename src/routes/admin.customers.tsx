import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listBookings } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { Loader2 } from "lucide-react";
import { STATUS_META, type OrderStatus } from "@/lib/order-status";
import { Modal } from "./admin.orders";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const ALT = "#F8FBFC";

type Booking = Awaited<ReturnType<typeof listBookings>>["bookings"][number];

interface Customer {
  email: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  firstOrder: string;
  lastOrder: string;
  orders: Booking[];
}

function fmtMoney(v: number) { return `$${v.toFixed(2)}`; }
function fmtLong(d: string) {
  try { return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}
function fmtShort(d: string) {
  try { return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return d; }
}

function CustomersPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);

  useEffect(() => {
    (async () => {
      const r = await listBookings({ data: await withToken({}) });
      setBookings(r.bookings ?? []);
      setLoading(false);
    })();
  }, []);

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const b of bookings) {
      const key = b.email.toLowerCase();
      const cur = map.get(key);
      const captured = Number(b.final_captured_amount ?? 0);
      if (cur) {
        cur.totalOrders += 1;
        cur.totalSpent += captured;
        if (b.pickup_date < cur.firstOrder) cur.firstOrder = b.pickup_date;
        if (b.pickup_date > cur.lastOrder) cur.lastOrder = b.pickup_date;
        cur.orders.push(b);
      } else {
        map.set(key, {
          email: b.email, name: b.customer_name, phone: b.phone,
          totalOrders: 1, totalSpent: captured,
          firstOrder: b.pickup_date, lastOrder: b.pickup_date,
          orders: [b],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastOrder.localeCompare(a.lastOrder));
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 className="animate-spin" color={STEEL} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>All Customers</h1>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or phone"
        style={{ width: "100%", background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "12px 16px", fontSize: 14, color: NAVY, outline: "none" }}
      />

      {filtered.length === 0 ? (
        <p style={{ color: NAVY, fontSize: 16, textAlign: "center", marginTop: 48 }}>No customers yet.</p>
      ) : (
        <div style={{ overflowX: "auto", border: `1.5px solid ${SOFT}`, borderRadius: 12, background: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: SOFT }}>
                <Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Orders</Th>
                <Th>Total Spent</Th><Th>First Order</Th><Th>Last Order</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.email} style={{ background: i % 2 === 0 ? "#FFFFFF" : ALT, borderBottom: `1px solid ${SOFT}` }}>
                  <Td bold>{c.name}</Td>
                  <Td>{c.email}</Td>
                  <Td>{c.phone}</Td>
                  <Td bold>{c.totalOrders}</Td>
                  <Td>{fmtMoney(c.totalSpent)}</Td>
                  <Td>{fmtLong(c.firstOrder)}</Td>
                  <Td>{fmtLong(c.lastOrder)}</Td>
                  <Td>
                    <button type="button" onClick={() => setOpen(c)} style={{ background: "none", border: "none", color: STEEL, fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}>View History</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal onClose={() => setOpen(null)}>
          <h2 style={{ color: NAVY, fontSize: 22, fontWeight: 700, margin: "0 0 24px" }}>{open.name}</h2>
          <div style={{ marginBottom: 24 }}>
            <Field label="Email" value={open.email} />
            <Field label="Phone" value={open.phone} />
            <Field label="Total Orders" value={String(open.totalOrders)} />
            <Field label="Total Spent" value={fmtMoney(open.totalSpent)} />
          </div>
          <h3 style={{ color: NAVY, fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Order History</h3>
          <div style={{ overflowX: "auto", border: `1.5px solid ${SOFT}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead>
                <tr style={{ background: SOFT }}>
                  <Th>Confirmation</Th><Th>Pickup</Th><Th>Size</Th><Th>Status</Th><Th>Captured</Th>
                </tr>
              </thead>
              <tbody>
                {[...open.orders].sort((a, b) => b.pickup_date.localeCompare(a.pickup_date)).map((b, i) => {
                  const meta = STATUS_META[b.order_status as OrderStatus] ?? { label: b.order_status, bg: "#6B7280", fg: "#FFFFFF" };
                  return (
                    <tr key={b.id} style={{ background: i % 2 === 0 ? "#FFFFFF" : ALT, borderBottom: `1px solid ${SOFT}` }}>
                      <Td bold>{b.confirmation_number}</Td>
                      <Td>{fmtShort(b.pickup_date)}</Td>
                      <Td>{b.size_selected}</Td>
                      <Td>
                        <span style={{ display: "inline-block", background: meta.bg, color: meta.fg, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{meta.label}</span>
                      </Td>
                      <Td>{b.final_captured_amount ? `$${Number(b.final_captured_amount).toFixed(2)}` : "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

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
      <span style={{ color: NAVY, fontSize: 15, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}
