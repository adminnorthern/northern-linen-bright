import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2023-10-16" as never });
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden: admin role required");
}

// ---------------- TWILIO ----------------
async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { ok: false, error: "Twilio not configured" };
  // E.164 ensure
  const cleaned = to.replace(/[^\d+]/g, "");
  const e164 = cleaned.startsWith("+") ? cleaned : `+1${cleaned.replace(/^1/, "")}`;
  try {
    const auth = btoa(`${sid}:${token}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: e164, From: from, Body: body }).toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMS failed" };
  }
}

// ---------------- RESEND ----------------
async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Resend not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Northern Linen <info@northernlinen.com>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email failed" };
  }
}

// ---------------- LIST BOOKINGS ----------------
export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { error: error.message, bookings: [] };
    return { error: null as string | null, bookings: data ?? [] };
  });

// ---------------- UPDATE ORDER STATUS (with auto SMS #2 on out_for_delivery) ----------------
const updateStatusSchema = z.object({
  booking_id: z.string().uuid(),
  order_status: z.enum(["pending", "picked_up", "washing", "out_for_delivery", "delivered", "cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: booking, error: be } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (be || !booking) return { error: "Booking not found" };

    let sms2: string | undefined;
    // Auto-send SMS #2 when marked out_for_delivery
    if (data.order_status === "out_for_delivery" && booking.sms_2_status !== "sent") {
      const msg = `Northern Linen: Your laundry is out for delivery and will arrive today. Thank you for choosing us!`;
      const sms = await sendSms(booking.phone, msg);
      sms2 = sms.ok ? "sent" : `failed: ${sms.error}`.slice(0, 100);
    }

    const { error } = await supabaseAdmin
      .from("bookings")
      .update(sms2 !== undefined ? { order_status: data.order_status, sms_2_status: sms2 } : { order_status: data.order_status })
      .eq("id", data.booking_id);
    if (error) return { error: error.message };
    return { error: null as string | null };
  });

// ---------------- LIST SUPPLIES ----------------
export const listSupplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("supplies")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return { error: error.message, supplies: [] };
    return { error: null as string | null, supplies: data ?? [] };
  });

const updateSupplySchema = z.object({
  id: z.string().uuid(),
  current_stock: z.number().int().min(0).max(100000),
});

export const updateSupplyStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSupplySchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("supplies")
      .update({ current_stock: data.current_stock })
      .eq("id", data.id);
    if (error) return { error: error.message };
    return { error: null as string | null };
  });

// ---------------- LIST SETTINGS ----------------
export const listSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("app_settings").select("*").order("key");
    if (error) return { error: error.message, settings: [] };
    return { error: null as string | null, settings: data ?? [] };
  });

const updateSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.number().min(0).max(100000),
});

export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSettingSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({ value: data.value })
      .eq("key", data.key);
    if (error) return { error: error.message };
    return { error: null as string | null };
  });

// ---------------- CAPTURE PAYMENT (with incremental auth + receipt) ----------------
const captureSchema = z.object({
  booking_id: z.string().uuid(),
  actual_weight: z.number().min(0).max(500),
});

export const captureBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => captureSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: booking, error: be } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (be || !booking) return { error: "Booking not found" };
    if (!booking.stripe_payment_intent_id) return { error: "No payment intent on booking" };
    if (booking.order_status === "delivered") return { error: "Already captured" };

    // Pull pricing from settings
    const { data: settings } = await supabaseAdmin.from("app_settings").select("*");
    const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, Number(s.value)]));
    const pricePerLb = settingsMap.price_per_lb ?? 2.5;
    const pricePerDry = settingsMap.price_per_dry_clean ?? 10;
    const pricePerComf = settingsMap.price_per_comforter ?? 40;

    const sizeMin: Record<string, number> = { Regular: 25, Big: 40, Jumbo: 60 };
    const min = sizeMin[booking.size_selected] ?? 25;
    const billableWeight = Math.max(data.actual_weight, min);

    const finalTotal =
      billableWeight * pricePerLb +
      (booking.dry_cleaning_items ?? 0) * pricePerDry +
      (booking.comforters ?? 0) * pricePerComf;
    const finalCents = Math.round(finalTotal * 100);

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
    if (intent.status !== "requires_capture") {
      return { error: `Payment not capturable (status: ${intent.status})` };
    }

    // Incremental auth if final exceeds existing hold
    if (finalCents > intent.amount) {
      try {
        await stripe.paymentIntents.incrementAuthorization(booking.stripe_payment_intent_id, {
          amount: finalCents,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Incremental authorization failed";
        return { error: `Could not increase hold: ${msg}` };
      }
    }

    // Capture (cap to current authorized amount)
    const refreshed = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
    const captureAmt = Math.min(finalCents, refreshed.amount);
    try {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id, {
        amount_to_capture: captureAmt,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Capture failed";
      return { error: msg };
    }

    // Send receipt
    const html = receiptHtml({
      name: booking.customer_name,
      confirmation: booking.confirmation_number,
      weight: data.actual_weight,
      billableWeight,
      pricePerLb,
      dry: booking.dry_cleaning_items ?? 0,
      pricePerDry,
      comf: booking.comforters ?? 0,
      pricePerComf,
      total: captureAmt / 100,
    });
    const emailRes = await sendEmail(booking.email, `Your Northern Linen receipt — ${booking.confirmation_number}`, html);

    await supabaseAdmin
      .from("bookings")
      .update({
        actual_weight: data.actual_weight,
        final_captured_amount: captureAmt / 100,
        order_status: "delivered",
        receipt_email_status: emailRes.ok ? "sent" : `failed: ${emailRes.error}`.slice(0, 100),
      })
      .eq("id", data.booking_id);

    return { error: null as string | null, captured: captureAmt / 100 };
  });

function receiptHtml(p: {
  name: string;
  confirmation: string;
  weight: number;
  billableWeight: number;
  pricePerLb: number;
  dry: number;
  pricePerDry: number;
  comf: number;
  pricePerComf: number;
  total: number;
}): string {
  const NAVY = "#1B3A4B";
  const STEEL = "#5B9DB5";
  const SOFT = "#8BBCCC";
  const lines: string[] = [];
  lines.push(
    `<tr><td style="padding:8px 0;color:${STEEL}">Wash & Fold (${p.billableWeight} lb${p.weight !== p.billableWeight ? ` — actual ${p.weight} lb, billed at minimum` : ""})</td><td style="padding:8px 0;color:${NAVY};text-align:right">$${(p.billableWeight * p.pricePerLb).toFixed(2)}</td></tr>`
  );
  if (p.dry > 0) {
    lines.push(
      `<tr><td style="padding:8px 0;color:${STEEL}">Dry cleaning (${p.dry} × $${p.pricePerDry.toFixed(2)})</td><td style="padding:8px 0;color:${NAVY};text-align:right">$${(p.dry * p.pricePerDry).toFixed(2)}</td></tr>`
    );
  }
  if (p.comf > 0) {
    lines.push(
      `<tr><td style="padding:8px 0;color:${STEEL}">Comforters (${p.comf} × $${p.pricePerComf.toFixed(2)})</td><td style="padding:8px 0;color:${NAVY};text-align:right">$${(p.comf * p.pricePerComf).toFixed(2)}</td></tr>`
    );
  }

  return `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:${NAVY}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 20px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1.5px solid ${SOFT};border-radius:12px;padding:40px">
  <tr><td>
    <h1 style="color:${NAVY};margin:0 0 8px;font-size:24px">Thank you, ${p.name}!</h1>
    <p style="color:${STEEL};margin:0 0 24px;font-size:14px">Your Northern Linen order is complete.</p>
    <p style="color:${NAVY};margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Confirmation</p>
    <p style="color:${STEEL};margin:0 0 24px;font-size:18px;font-weight:700">${p.confirmation}</p>
    <hr style="border:0;border-top:1px solid ${SOFT};margin:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0">${lines.join("")}</table>
    <hr style="border:0;border-top:1px solid ${SOFT};margin:16px 0">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;color:${NAVY};font-weight:700;font-size:16px">Total charged</td><td style="padding:8px 0;color:${NAVY};font-weight:700;font-size:16px;text-align:right">$${p.total.toFixed(2)}</td></tr>
    </table>
    <p style="color:${STEEL};margin:24px 0 0;font-size:13px">Questions? Reply to this email or contact us at info@northernlinen.com</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

// ---------------- BOOTSTRAP ADMIN (one-shot self-grant) ----------------
// Allows the user logged in as info@northernlinen.com to grant themselves admin role.
// Hardened: only works for that exact email.
export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = u?.user?.email;
    if (email !== "info@northernlinen.com") {
      return { error: "Only the owner email can claim admin role", granted: false };
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) return { error: error.message, granted: false };
    return { error: null as string | null, granted: true };
  });
