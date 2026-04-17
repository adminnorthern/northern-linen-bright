import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listBookings, updateOrderStatus } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { BookingTable, Empty, Section } from "./admin.index";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";

type Booking = Awaited<ReturnType<typeof listBookings>>["bookings"][number];

function OrdersPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    const r = await listBookings({ data: await withToken({}) });
    setBookings(r.bookings ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.order_status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.customer_name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.confirmation_number.toLowerCase().includes(q)
      );
    });
  }, [bookings, search, statusFilter]);

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
        <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Orders</h1>
        <p style={{ color: STEEL, fontSize: 15, marginTop: 4 }}>{bookings.length} total orders</p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name, email, phone, or confirmation number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240, background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: NAVY, outline: "none" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: NAVY, cursor: "pointer" }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="picked_up">Picked up</option>
          <option value="washing">Washing</option>
          <option value="out_for_delivery">Out for delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Section title="">
        {filtered.length === 0 ? (
          <Empty text="No orders found" />
        ) : (
          <BookingTable
            bookings={filtered}
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
    </div>
  );
}
