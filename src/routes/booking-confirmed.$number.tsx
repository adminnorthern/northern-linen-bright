import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/booking-confirmed/$number")({
  head: ({ params }) => ({
    meta: [
      { title: `Booking Confirmed ${params.number} — Northern Linen` },
      { name: "description", content: "Your laundry pickup is confirmed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmedPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";

type Booking = {
  confirmation_number: string;
  customer_name: string;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  size_selected: string;
  scent_profile: string;
  dry_cleaning_items: number;
  comforters: number;
  pickup_date: string;
  pickup_time: string;
};

function ConfirmedPage() {
  const { number } = Route.useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.rpc("get_booking_by_confirmation", {
        _confirmation_number: number,
      });
      if (!active) return;
      const row = Array.isArray(data) && data.length > 0 ? (data[0] as Booking) : null;
      setBooking(row);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [number]);

  return (
    <section className="bg-background px-4 py-12 md:py-20">
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <div className="text-center">
          <img src="/northern-linen-logo.png" alt="Northern Linen" style={{ height: 80, width: "auto", margin: "0 auto", objectFit: "contain" }} />
          <h1 style={{ color: NAVY, fontSize: 32, fontWeight: 700, marginTop: 32 }}>Booking Confirmed</h1>
          <div style={{ color: STEEL, fontSize: 28, fontWeight: 700, marginTop: 8 }}>{number}</div>
          <p style={{ color: NAVY, fontSize: 16, lineHeight: 1.7, maxWidth: 500, margin: "16px auto 0" }}>
            Your pickup is confirmed. We will arrive between 7 and 9am on your selected date. You will receive an SMS confirmation shortly.
          </p>
        </div>

        {loading ? (
          <p style={{ color: STEEL, textAlign: "center", marginTop: 32 }}>Loading your details…</p>
        ) : booking ? (
          <div
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${SOFT}`,
              borderRadius: 12,
              padding: 32,
              maxWidth: 500,
              margin: "32px auto 0",
            }}
          >
            <Row label="Name" value={booking.customer_name} />
            <Row
              label="Address"
              value={`${booking.street_address}, ${booking.city}, ${booking.state} ${booking.zip}`}
            />
            <Row label="Size" value={booking.size_selected} />
            <Row label="Scent" value={booking.scent_profile} />
            <Row label="Pickup date" value={booking.pickup_date} />
            <Row label="Pickup time" value={booking.pickup_time} />
            {booking.dry_cleaning_items > 0 && (
              <Row label="Dry cleaning" value={String(booking.dry_cleaning_items)} />
            )}
            {booking.comforters > 0 && <Row label="Comforters" value={String(booking.comforters)} />}
          </div>
        ) : (
          <p style={{ color: NAVY, textAlign: "center", marginTop: 32 }}>
            We couldn't find that booking. Please check your confirmation number.
          </p>
        )}

        <div className="text-center" style={{ marginTop: 32 }}>
          <Link
            to="/"
            style={{
              display: "inline-block",
              background: STEEL,
              color: "#FFFFFF",
              borderRadius: 8,
              padding: "14px 32px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: `1px solid ${SOFT}30` }}>
      <span style={{ color: STEEL, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <span style={{ color: NAVY, fontSize: 15, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}
