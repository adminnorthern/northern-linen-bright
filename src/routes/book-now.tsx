import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Info, Loader2 } from "lucide-react";
import { z } from "zod";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  createBookingPaymentIntent,
  finalizeBooking,
  getStripePublishableKey,
  updateBookingPaymentIntent,
} from "@/utils/stripe.functions";

export const Route = createFileRoute("/book-now")({
  head: () => ({
    meta: [
      { title: "Book Now — Northern Linen" },
      { name: "description", content: "Schedule your premium laundry pickup and delivery in Bloomington, MN." },
      { property: "og:title", content: "Book Now — Northern Linen" },
      { property: "og:description", content: "Schedule your premium laundry pickup and delivery." },
    ],
  }),
  component: BookNowPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const ERR = "#DC2626";

const SIZES = [
  { value: "Regular", weight: "Starting at 25lbs", desc: "Perfect for one person or a single week of laundry", min: 25 },
  { value: "Big", weight: "Starting at 40lbs", desc: "Great for couples or heavier laundry weeks", min: 40 },
  { value: "Jumbo", weight: "Starting at 60lbs", desc: "Large loads families and heavy weeks", min: 60 },
] as const;

const SCENTS = ["Classic", "Fresh", "Gentle"] as const;
const TIMES = ["7:00am", "7:30am", "8:00am", "8:30am", "9:00am"] as const;
const STATES = ["MN", "WI", "IA", "ND", "SD"];

const PRICE_PER_LB = 2.5;
const DRY_CLEAN_PRICE = 10;
const COMFORTER_PRICE = 40;

const schema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20),
  street_address: z.string().trim().min(1, "Please enter your street address").max(200),
  city: z.string().trim().min(1, "Please enter your city").max(100),
  state: z.string().trim().min(1, "Please select your state").max(2),
  zip: z.string().trim().regex(/^\d{5}$/, "Please enter a valid ZIP code"),
  size_selected: z.enum(["Regular", "Big", "Jumbo"], { message: "Please select a service size" }),
  scent_profile: z.enum(["Classic", "Fresh", "Gentle"], { message: "Please select a scent preference" }),
  dry_cleaning_items: z.number().int().min(0),
  comforters: z.number().int().min(0),
  pickup_date: z.string().min(1, "Please select a pickup date"),
  pickup_time: z.string().min(1, "Please select a pickup time"),
});

type FormData = z.infer<typeof schema>;
type Errors = Partial<Record<keyof FormData, string>> & { card?: string; submit?: string };

// 8-char alphanumeric tail (uppercase, no ambiguous chars) → ~2.8 trillion combos.
// Combined with the DB unique constraint, collisions are effectively impossible.
function generateConfirmation() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) tail += alphabet[bytes[i] % alphabet.length];
  return `NL-${tail}`;
}

function normalizePhoneE164(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  return `+1${cleaned.replace(/^1/, "")}`;
}

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

const DEFAULT_DATA: FormData = {
  customer_name: "",
  email: "",
  phone: "",
  street_address: "",
  city: "",
  state: "MN",
  zip: "",
  size_selected: "Regular",
  scent_profile: "Classic",
  dry_cleaning_items: 0,
  comforters: 0,
  pickup_date: "",
  pickup_time: "",
};

function BookNowPage() {
  const [stripePromise, setStripePromise] = useState<Promise<StripeJs | null> | null>(null);
  const [intent, setIntent] = useState<{ clientSecret: string; paymentIntentId: string } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Centralized form state lives here so the intent can be created with the
  // initial estimated amount (Regular = $62.50) before mounting Elements.
  const [data, setData] = useState<FormData>(DEFAULT_DATA);

  const sizeMin = useMemo(() => SIZES.find((s) => s.value === data.size_selected)?.min ?? 25, [data.size_selected]);
  const holdAmount = useMemo(() => {
    return sizeMin * PRICE_PER_LB + data.dry_cleaning_items * DRY_CLEAN_PRICE + data.comforters * COMFORTER_PRICE;
  }, [sizeMin, data.dry_cleaning_items, data.comforters]);
  const amountCents = Math.round(holdAmount * 100);

  // 1. Load Stripe.js with the publishable key
  useEffect(() => {
    getStripePublishableKey().then(({ publishableKey }) => {
      if (!publishableKey) {
        setSetupError("Stripe is not configured. Please contact support.");
        return;
      }
      setStripePromise(loadStripe(publishableKey));
    });
  }, []);

  // 2. Create the initial PaymentIntent so PaymentElement can mount
  useEffect(() => {
    if (!stripePromise || intent) return;
    let cancelled = false;
    createBookingPaymentIntent({
      data: {
        amount_cents: amountCents,
        email: "pending@northernlinen.com",
        customer_name: "Pending",
        size_selected: data.size_selected,
      },
    }).then((res) => {
      if (cancelled) return;
      if (res.error || !res.client_secret || !res.payment_intent_id) {
        setSetupError(res.error || "Could not initialize payment");
        return;
      }
      setIntent({ clientSecret: res.client_secret, paymentIntentId: res.payment_intent_id });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripePromise]);

  // 3. Keep the PaymentIntent amount in sync with the user's selection (debounced)
  useEffect(() => {
    if (!intent) return;
    const t = setTimeout(() => {
      updateBookingPaymentIntent({
        data: { payment_intent_id: intent.paymentIntentId, amount_cents: amountCents },
      });
    }, 500);
    return () => clearTimeout(t);
  }, [amountCents, intent]);

  if (setupError) {
    return (
      <section className="bg-background px-4 py-20 text-center">
        <p style={{ color: ERR }}>{setupError}</p>
      </section>
    );
  }
  if (!stripePromise || !intent) {
    return (
      <section className="bg-background px-4 py-20 text-center">
        <Loader2 className="mx-auto animate-spin" color={STEEL} />
      </section>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: intent.clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: STEEL,
            colorBackground: "#FFFFFF",
            colorText: NAVY,
            colorDanger: ERR,
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSizeBase: "16px",
            borderRadius: "8px",
            spacingUnit: "4px",
          },
          rules: {
            ".Input": {
              border: `1.5px solid ${SOFT}`,
              padding: "14px 16px",
              boxShadow: "none",
              color: NAVY,
            },
            ".Input:focus": {
              border: `1.5px solid ${STEEL}`,
              boxShadow: "none",
              outline: "none",
            },
            ".Input--invalid": {
              border: `1.5px solid ${ERR}`,
            },
            ".Label": {
              color: NAVY,
              fontWeight: "600",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            },
            ".Tab": {
              border: `1.5px solid ${SOFT}`,
              boxShadow: "none",
            },
            ".Tab--selected": {
              border: `2px solid ${STEEL}`,
              boxShadow: "none",
              color: NAVY,
            },
            ".TabIcon--selected": { fill: STEEL },
            ".TabLabel--selected": { color: NAVY },
          },
        },
      }}
    >
      <BookNowForm
        data={data}
        setData={setData}
        holdAmount={holdAmount}
        paymentIntentId={intent.paymentIntentId}
      />
    </Elements>
  );
}

function BookNowForm({
  data,
  setData,
  holdAmount,
  paymentIntentId,
}: {
  data: FormData;
  setData: React.Dispatch<React.SetStateAction<FormData>>;
  holdAmount: number;
  paymentIntentId: string;
}) {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validateExtra(d: FormData): Errors {
    const e: Errors = {};
    if (d.pickup_date) {
      if (d.pickup_date < todayISO()) e.pickup_date = "Pickup date cannot be in the past";
      else {
        const day = new Date(d.pickup_date + "T12:00:00").getDay();
        if (day === 0) e.pickup_date = "We do not pickup on Sundays. Please select another date.";
      }
    }
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const parsed = schema.safeParse(data);
    let allErrors: Errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormData;
        if (!allErrors[k]) allErrors[k] = issue.message;
      }
    }
    allErrors = { ...allErrors, ...validateExtra(data) };
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      const firstKey = Object.keys(allErrors)[0];
      const el = formRef.current?.querySelector(`[data-field="${firstKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!stripe || !elements) {
      setErrors({ card: "Payment system not ready. Please wait a moment." });
      return;
    }

    setSubmitting(true);

    // Make sure the PaymentIntent reflects the latest amount before confirming
    const updateRes = await updateBookingPaymentIntent({
      data: { payment_intent_id: paymentIntentId, amount_cents: Math.round(holdAmount * 100) },
    });
    if (updateRes.error) {
      setSubmitting(false);
      setErrors({ card: updateRes.error });
      return;
    }

    // Confirm the Payment Element (handles cards, Apple Pay, Google Pay automatically)
    const confirmed = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: data.customer_name.trim(),
            email: data.email.trim(),
            phone: data.phone.trim(),
            address: {
              line1: data.street_address.trim(),
              city: data.city.trim(),
              state: data.state,
              postal_code: data.zip.trim(),
              country: "US",
            },
          },
        },
      },
      redirect: "if_required",
    });
    if (confirmed.error) {
      setSubmitting(false);
      setErrors({ card: confirmed.error.message || "Payment was declined" });
      return;
    }

    // Finalize: server re-verifies the hold and saves the booking
    const confirmation_number = generateConfirmation();
    const finalize = await finalizeBooking({
      data: {
        payment_intent_id: paymentIntentId,
        hold_amount: holdAmount,
        booking: {
          confirmation_number,
          customer_name: data.customer_name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          street_address: data.street_address.trim(),
          city: data.city.trim(),
          state: data.state,
          zip: data.zip.trim(),
          size_selected: data.size_selected,
          scent_profile: data.scent_profile,
          dry_cleaning_items: data.dry_cleaning_items,
          comforters: data.comforters,
          pickup_date: data.pickup_date,
          pickup_time: data.pickup_time,
        },
      },
    });
    setSubmitting(false);
    if (finalize.error || !finalize.confirmation_number) {
      setErrors({ submit: finalize.error || "Could not save booking" });
      return;
    }
    navigate({ to: "/booking-confirmed/$number", params: { number: finalize.confirmation_number } });
  }

  const inputBase: React.CSSProperties = {
    background: "#FFFFFF",
    border: `1.5px solid ${SOFT}`,
    borderRadius: 8,
    color: NAVY,
    fontSize: 16,
    padding: "14px 16px",
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: NAVY,
    fontSize: 14,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: 8,
  };

  const sectionHeading: React.CSSProperties = { color: NAVY, fontSize: 18, fontWeight: 700 };

  return (
    <section className="bg-background px-4 py-12 md:px-6 md:py-20">
      <div
        className="mx-auto"
        style={{
          maxWidth: 720,
          background: "#FFFFFF",
          border: `1.5px solid ${SOFT}`,
          borderRadius: 12,
        }}
      >
        <form ref={formRef} onSubmit={onSubmit} className="p-6 md:p-12" noValidate>
          {/* Title */}
          <div className="text-center" style={{ marginBottom: 40 }}>
            <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Book Your Pickup</h1>
            <p style={{ color: STEEL, fontSize: 16 }}>Fill in your details below and we will handle the rest</p>
          </div>

          {/* Section 1 */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ ...sectionHeading, marginBottom: 24 }}>Your Details</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <Field label="Full Name" error={errors.customer_name} field="customer_name">
                <FocusInput
                  type="text"
                  value={data.customer_name}
                  onChange={(v) => set("customer_name", v)}
                  placeholder="Enter your full name"
                  style={inputBase}
                />
              </Field>
              <Field
                label="Email Address"
                note="We will send your receipt and order updates to this email"
                error={errors.email}
                field="email"
              >
                <FocusInput
                  type="email"
                  value={data.email}
                  onChange={(v) => set("email", v)}
                  placeholder="Enter your email address"
                  style={inputBase}
                />
              </Field>
              <Field
                label="Phone Number"
                note="We will send SMS confirmations to this number"
                error={errors.phone}
                field="phone"
              >
                <FocusInput
                  type="tel"
                  value={data.phone}
                  onChange={(v) => set("phone", v)}
                  placeholder="Enter your phone number"
                  style={inputBase}
                />
              </Field>

              <div data-field="street_address">
                <label style={labelStyle}>Delivery Address</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FocusInput
                    type="text"
                    value={data.street_address}
                    onChange={(v) => set("street_address", v)}
                    placeholder="Enter your street address"
                    style={inputBase}
                  />
                  {errors.street_address && <ErrorText>{errors.street_address}</ErrorText>}
                  <FocusInput
                    type="text"
                    value={data.city}
                    onChange={(v) => set("city", v)}
                    placeholder="City"
                    style={inputBase}
                  />
                  {errors.city && <ErrorText>{errors.city}</ErrorText>}
                  <select
                    value={data.state}
                    onChange={(e) => set("state", e.target.value)}
                    style={inputBase}
                  >
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s === "MN" ? "Minnesota (MN)" : s}
                      </option>
                    ))}
                  </select>
                  {errors.state && <ErrorText>{errors.state}</ErrorText>}
                  <FocusInput
                    type="text"
                    value={data.zip}
                    onChange={(v) => set("zip", v)}
                    placeholder="ZIP Code"
                    style={inputBase}
                    inputMode="numeric"
                    maxLength={5}
                  />
                  {errors.zip && <ErrorText>{errors.zip}</ErrorText>}
                </div>
              </div>
            </div>
          </div>

          <Divider />

          {/* Section 2 */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ ...sectionHeading, marginBottom: 8 }}>Choose Your Service</h2>
            <p style={{ color: STEEL, fontSize: 14, marginBottom: 24 }}>
              Select your laundry size — all orders have a 25lb minimum charge
            </p>

            <div data-field="size_selected" className="grid gap-4 md:grid-cols-3">
              {SIZES.map((s) => {
                const selected = data.size_selected === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("size_selected", s.value)}
                    style={{
                      background: selected ? "rgba(91,157,181,0.08)" : "#FFFFFF",
                      border: selected ? `2px solid ${STEEL}` : `1.5px solid ${SOFT}`,
                      borderRadius: 12,
                      padding: 24,
                      textAlign: "left",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    {selected && (
                      <Check
                        size={20}
                        color={STEEL}
                        style={{ position: "absolute", top: 16, right: 16 }}
                      />
                    )}
                    <div style={{ color: NAVY, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ color: STEEL, fontSize: 14, marginTop: 4 }}>{s.weight}</div>
                    <div style={{ color: NAVY, fontSize: 14, marginTop: 12 }}>{s.desc}</div>
                    <div style={{ color: NAVY, fontSize: 16, fontWeight: 600, marginTop: 12 }}>
                      $2.50 per lb
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.size_selected && <div style={{ marginTop: 8 }}><ErrorText>{errors.size_selected}</ErrorText></div>}

            <div style={{ marginTop: 24 }} data-field="scent_profile">
              <label style={labelStyle}>Preferred Scent</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {SCENTS.map((sc) => {
                  const selected = data.scent_profile === sc;
                  return (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => set("scent_profile", sc)}
                      style={{
                        background: selected ? STEEL : "#FFFFFF",
                        border: selected ? `1.5px solid ${STEEL}` : `1.5px solid ${SOFT}`,
                        color: selected ? "#FFFFFF" : NAVY,
                        fontSize: 14,
                        borderRadius: 20,
                        padding: "10px 24px",
                        cursor: "pointer",
                      }}
                    >
                      {sc}
                    </button>
                  );
                })}
              </div>
              <p style={{ color: SOFT, fontSize: 12, marginTop: 8 }}>No extra charge for any scent</p>
              {errors.scent_profile && <ErrorText>{errors.scent_profile}</ErrorText>}
            </div>

            <div style={{ marginTop: 24 }}>
              <label style={labelStyle}>Add Ons</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <AddOnRow
                  label="Dry Cleaning Items"
                  price="$10.00 per item"
                  value={data.dry_cleaning_items}
                  onChange={(v) => set("dry_cleaning_items", v)}
                />
                <AddOnRow
                  label="Comforters"
                  price="$40.00 each"
                  value={data.comforters}
                  onChange={(v) => set("comforters", v)}
                />
              </div>
            </div>
          </div>

          <Divider />

          {/* Section 3 */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ ...sectionHeading, marginBottom: 24 }}>Schedule Your Pickup</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <Field
                label="Preferred Pickup Date"
                note="We pickup Monday through Saturday between 7 and 9am"
                error={errors.pickup_date}
                field="pickup_date"
              >
                <FocusInput
                  type="date"
                  value={data.pickup_date}
                  onChange={(v) => set("pickup_date", v)}
                  style={inputBase}
                  min={todayISO()}
                />
              </Field>
              <Field label="Preferred Pickup Time" error={errors.pickup_time} field="pickup_time">
                <select
                  value={data.pickup_time}
                  onChange={(e) => set("pickup_time", e.target.value)}
                  style={{ ...inputBase, color: data.pickup_time ? NAVY : SOFT }}
                >
                  <option value="" disabled>Select a time</option>
                  {TIMES.map((t) => (
                    <option key={t} value={t} style={{ color: NAVY }}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <Divider />

          {/* Section 4 */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ ...sectionHeading, marginBottom: 8 }}>Payment Details</h2>
            <p style={{ color: STEEL, fontSize: 14, marginBottom: 24 }}>
              Your card will not be charged until after your laundry is weighed
            </p>

            <div
              style={{
                background: "#FFFFFF",
                border: `1.5px solid ${SOFT}`,
                borderRadius: 8,
                padding: 20,
                marginBottom: 24,
                display: "flex",
                gap: 12,
              }}
            >
              <Info size={20} color={STEEL} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ color: NAVY, fontSize: 14, lineHeight: 1.7 }}>
                A temporary hold will be placed on your card based on your selected size. You will only be charged for the actual weight of your laundry once your order is complete. The hold will be released within 5 to 7 business days if unused. If your actual weight exceeds your selected size a second temporary authorization may appear on your card. You will only ever be charged once for the final actual weight.
              </p>
            </div>

            <label style={labelStyle}>Payment Method</label>
            <div
              style={{
                background: "#FFFFFF",
                border: `1.5px solid ${SOFT}`,
                borderRadius: 8,
                padding: "14px 16px",
                width: "100%",
              }}
            >
              <PaymentElement
                options={{
                  layout: "tabs",
                  wallets: { applePay: "auto", googlePay: "auto" },
                }}
              />
            </div>
            {errors.card && <ErrorText>{errors.card}</ErrorText>}

            {/* Order summary */}
            <div
              style={{
                background: "#FFFFFF",
                border: `1.5px solid ${SOFT}`,
                borderRadius: 8,
                padding: 20,
                marginTop: 24,
                marginBottom: 24,
              }}
            >
              <div style={{ color: NAVY, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Order Summary</div>
              <div style={{ color: NAVY, fontSize: 14, lineHeight: 2 }}>
                <SummaryRow label="Size" value={data.size_selected} />
                <SummaryRow label="Estimated hold" value={`$${holdAmount.toFixed(2)}`} />
                {data.dry_cleaning_items > 0 && (
                  <SummaryRow label="Dry cleaning items" value={String(data.dry_cleaning_items)} />
                )}
                {data.comforters > 0 && <SummaryRow label="Comforters" value={String(data.comforters)} />}
                <SummaryRow label="Pickup" value={`${data.pickup_date || "—"} ${data.pickup_time || ""}`.trim()} />
              </div>
              <p style={{ color: STEEL, fontSize: 13, marginTop: 8 }}>
                Final charge based on actual weight after pickup
              </p>
            </div>
          </div>

          {errors.submit && <div style={{ marginBottom: 12 }}><ErrorText>{errors.submit}</ErrorText></div>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: STEEL,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              padding: 16,
              width: "100%",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.85 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 8,
            }}
            onMouseEnter={(e) => {
              if (!submitting) e.currentTarget.style.background = "#4A8FA8";
            }}
            onMouseLeave={(e) => {
              if (!submitting) e.currentTarget.style.background = STEEL;
            }}
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? "Processing your booking" : "Confirm Booking"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  note,
  error,
  field,
  children,
}: {
  label: string;
  note?: string;
  error?: string;
  field: string;
  children: React.ReactNode;
}) {
  return (
    <div data-field={field}>
      <label
        style={{
          color: NAVY,
          fontSize: 14,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          display: "block",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      {children}
      {note && <p style={{ color: SOFT, fontSize: 12, marginTop: 6 }}>{note}</p>}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p style={{ color: ERR, fontSize: 13, marginTop: 6 }}>{children}</p>;
}

function Divider() {
  return <hr style={{ border: 0, borderTop: `1px solid ${SOFT}`, marginBottom: 40 }} />;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: STEEL }}>{label}</span>
      <span style={{ color: NAVY, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function AddOnRow({
  label,
  price,
  value,
  onChange,
}: {
  label: string;
  price: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <label style={{ color: NAVY, fontSize: 14, minWidth: 160 }}>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))}
        style={{
          background: "#FFFFFF",
          border: `1.5px solid ${SOFT}`,
          borderRadius: 8,
          color: NAVY,
          fontSize: 16,
          padding: "10px 12px",
          width: 120,
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = STEEL)}
        onBlur={(e) => (e.currentTarget.style.borderColor = SOFT)}
      />
      <span style={{ color: STEEL, fontSize: 14 }}>{price}</span>
    </div>
  );
}

function FocusInput({
  value,
  onChange,
  style,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  style: React.CSSProperties;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "style">) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      onFocus={(e) => (e.currentTarget.style.borderColor = STEEL)}
      onBlur={(e) => (e.currentTarget.style.borderColor = SOFT)}
    />
  );
}
