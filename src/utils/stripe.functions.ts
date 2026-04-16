import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-09-30.clover" });
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
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.create({
        amount: data.amount_cents,
        currency: "usd",
        capture_method: "manual",
        receipt_email: data.email,
        description: `Northern Linen ${data.size_selected} pickup hold`,
        metadata: {
          customer_name: data.customer_name,
          size_selected: data.size_selected,
          source: "booking_form",
        },
      });
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

      const authExpiry = new Date();
      authExpiry.setDate(authExpiry.getDate() + 7);

      const { error } = await supabaseAdmin.from("bookings").insert({
        ...data.booking,
        stripe_payment_intent_id: data.payment_intent_id,
        hold_amount: data.hold_amount,
        auth_expiry_date: authExpiry.toISOString(),
        order_status: "pending",
      });
      if (error) {
        console.error("finalizeBooking insert failed:", error);
        return { error: "Failed to save booking", confirmation_number: null };
      }
      return { error: null as string | null, confirmation_number: data.booking.confirmation_number };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error finalizing booking";
      console.error("finalizeBooking failed:", msg);
      return { error: msg, confirmation_number: null };
    }
  });
