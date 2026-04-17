import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listBookings } from "@/utils/admin.functions";
import { Empty } from "./admin.index";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";

type Booking = Awaited<ReturnType<typeof listBookings>>["bookings"][number];

interface Customer {
  email: string;
  name: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
}

function CustomersPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listBookings().then((r) => {
      setBookings(r.bookings);
      setLoading(false);
    });
  }, []);

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const b of bookings) {
      const key = b.email.toLowerCase();
      const c = map.get(key);
      if (c) {
        c.totalOrders += 1;
        c.totalSpent += Number(b.final_captured_amount ?? 0);
        if (b.created_at > c.lastOrder) c.lastOrder = b.created_at;
      } else {
        map.set(key, {
          email: b.email,
          name: b.customer_name,
          phone: b.phone,
          address: `${b.street_address}, ${b.city}, ${b.state} ${b.zip}`,
          totalOrders: 1,
          totalSpent: Number(b.final_captured_amount ?? 0),
          lastOrder: b.created_at,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastOrder.localeCompare(a.lastOrder));
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
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
      <div>
        <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Customers</h1>
        <p style={{ color: STEEL, fontSize: 15, marginTop: 4 }}>{customers.length} unique customers</p>
      </div>
      <input
        type="text"
        placeholder="Search by name, email, or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: NAVY, outline: "none", maxWidth: 480 }}
      />

      {filtered.length === 0 ? (
        <Empty text="No customers found" />
      ) : (
        <div style={{ overflowX: "auto", border: `1.5px solid ${SOFT}`, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "rgba(91,157,181,0.05)" }}>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>Address</Th>
                <Th>Orders</Th>
                <Th>Lifetime spend</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.email} style={{ borderTop: `1px solid ${SOFT}40` }}>
                  <Td>
                    <div style={{ color: NAVY, fontWeight: 600 }}>{c.name}</div>
                  </Td>
                  <Td>
                    <div>{c.email}</div>
                    <div style={{ color: STEEL, fontSize: 12 }}>{c.phone}</div>
                  </Td>
                  <Td>{c.address}</Td>
                  <Td>{c.totalOrders}</Td>
                  <Td>${c.totalSpent.toFixed(2)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: 12, color: STEEL, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: 12, color: NAVY, fontSize: 14, verticalAlign: "top" }}>{children}</td>;
}
