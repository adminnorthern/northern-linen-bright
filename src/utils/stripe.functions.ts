import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit.server";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2023-10-16" as never });
}

const STATEMENT_DESCRIPTOR_SUFFIX = "NORTHERN LINEN"; // 14 chars, ≤ 22

function normalizePhoneE164(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  // Strip a leading "1" if present, then prefix +1 (US default).
  return `+1${cleaned.replace(/^1/, "")}`;
}

/**
 * Returns the Stripe publishable key so the browser can mount Stripe Elements.
 * Publishable keys are designed to be public and safe to expose.
 */
export const getStripePublishableKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    return { publishableKey: null as string | null };
  }
  return { publishableKey: key };
});

const createIntentSchema = z.object({
  amount_cents: z.number().int().min(50).max(100_000),
  email: z.string().email().max(255),
  customer_name: z.string().min(1).max(200),
  size_selected: z.enum(["Regular", "Big", "Jumbo"]),
  idempotency_key: z.string().min(10).max(100),
});

/**
 * Creates a manual-capture PaymentIntent for the estimated hold amount.
 * Returns the client_secret so the browser can confirm the card with Stripe Elements.
 * Auth is captured later (after weigh-in) via a separate capture flow.
 */
export const createBookingPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createIntentSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      // Rate limit: 3 booking attempts per IP per hour.
      const ip = getClientIp(new Headers(getRequestHeaders() as HeadersInit));
      const rl = await checkRateLimit({
        scope: "create_intent",
        ip,
        limit: 3,
        windowMs: 60 * 60 * 1000,
      });
      if (!rl.allowed) {
        return {
          error: "Too many booking attempts. Please try again later.",
          client_secret: null,
          payment_intent_id: null,
        };
      }

      const stripe = getStripe();
      const intent = await stripe.paymentIntents.create(
        {
          amount: data.amount_cents,
          currency: "usd",
          capture_method: "manual",
          automatic_payment_methods: { enabled: true },
          receipt_email: data.email,
          description: `Northern Linen ${data.size_selected} pickup hold`,
          statement_descriptor_suffix: STATEMENT_DESCRIPTOR_SUFFIX,
          metadata: {
            customer_name: data.customer_name,
            size_selected: data.size_selected,
            source: "booking_form",
            confirmation_number: data.idempotency_key,
          },
          payment_method_options: {
            card: { request_overcapture: "if_available" },
          },
        } as Stripe.PaymentIntentCreateParams,
        { idempotencyKey: data.idempotency_key }
      );
      if (!intent.client_secret) {
        return { error: "Stripe did not return a client secret", client_secret: null, payment_intent_id: null };
      }
      return {
        error: null as string | null,
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error creating payment hold";
      console.error("createBookingPaymentIntent failed:", msg);
      return { error: msg, client_secret: null, payment_intent_id: null };
    }
  });

const updateIntentSchema = z.object({
  payment_intent_id: z.string().min(1).max(200),
  amount_cents: z.number().int().min(50).max(100_000),
});

/**
 * Updates the hold amount on an existing PaymentIntent (e.g. user changed size or add-ons).
 */
export const updateBookingPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateIntentSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const stripe = getStripe();
      await stripe.paymentIntents.update(data.payment_intent_id, {
        amount: data.amount_cents,
        statement_descriptor_suffix: STATEMENT_DESCRIPTOR_SUFFIX,
      });
      return { error: null as string | null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error updating payment hold";
      console.error("updateBookingPaymentIntent failed:", msg);
      return { error: msg };
    }
  });

const finalizeSchema = z.object({
  payment_intent_id: z.string().min(1).max(200),
  hold_amount: z.number().min(0),
  booking: z.object({
    confirmation_number: z.string().min(1).max(20),
    customer_name: z.string().min(1).max(200),
    email: z.string().email().max(255),
    phone: z.string().min(1).max(40),
    street_address: z.string().min(1).max(300),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(2),
    zip: z.string().regex(/^\d{5}$/),
    size_selected: z.enum(["Regular", "Big", "Jumbo"]),
    scent_profile: z.enum(["Classic", "Fresh", "Gentle"]),
    dry_cleaning_items: z.number().int().min(0).max(50),
    comforters: z.number().int().min(0).max(20),
    pickup_date: z.string().min(1).max(20),
    pickup_time: z.string().min(1).max(20),
  }),
});

/**
 * Verifies the PaymentIntent is in `requires_capture` (a successful hold) and saves
 * the booking. Server-side check prevents anyone bypassing the card step.
 */
export const finalizeBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => finalizeSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(data.payment_intent_id);
      if (intent.status !== "requires_capture") {
        return {
          error: `Payment hold not confirmed (status: ${intent.status})`,
          confirmation_number: null,
        };
      }

      // Normalize all customer-entered text before persisting.
      const b = data.booking;
      const normalized = {
        ...b,
        customer_name: b.customer_name.trim(),
        email: b.email.trim().toLowerCase(),
        phone: normalizePhoneE164(b.phone.trim()),
        street_address: b.street_address.trim(),
        city: b.city.trim(),
        zip: b.zip.trim(),
      };

      const authExpiry = new Date();
      authExpiry.setDate(authExpiry.getDate() + 7);

      // Send confirmation SMS #1 (best effort, with one retry)
      let sms1Status = "pending";
      try {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE_NUMBER;
        if (sid && token && from) {
          const e164 = normalized.phone;
          const body = `Hi ${normalized.customer_name} — your Northern Linen pickup is confirmed for ${normalized.pickup_date} at ${normalized.pickup_time}. Confirmation: ${normalized.confirmation_number}. We will arrive between 7 and 9am. Please do not reply to this number. Questions? Visit northernlinen.com`;
          const auth = btoa(`${sid}:${token}`);
          const sendOnce = () =>
            fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
              method: "POST",
              headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ To: e164, From: from, Body: body }).toString(),
            });
          let res = await sendOnce();
          if (!res.ok) res = await sendOnce();
          sms1Status = res.ok ? "sent" : `failed: ${res.status}`;
        } else {
          sms1Status = "twilio_not_configured";
        }
      } catch (e) {
        sms1Status = `failed: ${e instanceof Error ? e.message : "unknown"}`.slice(0, 100);
      }

      const { error } = await supabaseAdmin.from("bookings").insert({
        ...normalized,
        stripe_payment_intent_id: data.payment_intent_id,
        hold_amount: data.hold_amount,
        auth_expiry_date: authExpiry.toISOString(),
        order_status: "pending",
        sms_1_status: sms1Status,
      });
      if (error) {
        console.error("finalizeBooking insert failed:", error);
        return { error: "Failed to save booking", confirmation_number: null };
      }
      return { error: null as string | null, confirmation_number: normalized.confirmation_number };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error finalizing booking";
      console.error("finalizeBooking failed:", msg);
      return { error: msg, confirmation_number: null };
    }
  });
