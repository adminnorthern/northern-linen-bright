// ADMIN LOGIN SETUP:
// 1. Set ADMIN_PIN environment variable to a 6 digit number of your choice in Lovable settings
// 2. The admin login page at northernlinen.com/admin requires this 6 digit PIN
// 3. Enter the PIN — it issues a secure session for info@northernlinen.com
// 4. Session persists until you click Logout

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CITY_TAX_RATES } from "@/lib/order-status";
import { checkRateLimit, clearRateLimit, getClientIp } from "@/lib/rate-limit.server";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2023-10-16" as never });
}

// Verifies the access token from the request body and returns the userId,
// throwing if the user is not signed in or not an admin.
async function verifyAdmin(accessToken: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) throw new Error("Unauthorized");
  const userId = data.user.id;
  const { data: role, error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr) throw new Error("Failed to verify admin role");
  if (!role) throw new Error("Forbidden: admin role required");
  return userId;
}

const tokenOnly = z.object({ access_token: z.string().min(10).max(4000) });

// ---------------- TWILIO ----------------
async function sendSmsOnce(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { ok: false, error: "Twilio not configured" };
  const cleaned = to.replace(/[^\d+]/g, "");
  const e164 = cleaned.startsWith("+") ? cleaned : `+1${cleaned.replace(/^1/, "")}`;
  try {
    const auth = btoa(`${sid}:${token}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
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

// Send SMS with one automatic retry before giving up.
async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const first = await sendSmsOnce(to, body);
  if (first.ok) return first;
  const second = await sendSmsOnce(to, body);
  return second;
}

// ---------------- RESEND ----------------
async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Resend not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
export const listBookings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenOnly.parse(input))
  .handler(async ({ data }) => {
    try {
      await verifyAdmin(data.access_token);
      const { data: rows, error } = await supabaseAdmin
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return { error: error.message, bookings: [] as never[] };
      return { error: null as string | null, bookings: rows ?? [] };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed", bookings: [] as never[] };
    }
  });

// ---------------- UPDATE ORDER STATUS ----------------
const updateStatusSchema = tokenOnly.extend({
  booking_id: z.string().uuid(),
  order_status: z.enum(["pending", "picked_up", "washing", "out_for_delivery", "delivered", "cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateStatusSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      await verifyAdmin(data.access_token);
      const { data: booking, error: be } = await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("id", data.booking_id)
        .maybeSingle();
      if (be || !booking) return { error: "Booking not found" };

      let sms2: string | undefined;
      if (data.order_status === "delivered" && booking.sms_2_status !== "sent") {
        const msg = `Hi ${booking.customer_name} — your Northern Linen laundry has been delivered and is at your door. Fresh, clean, and folded. Thank you for choosing Northern Linen. See you next week!`;
        const sms = await sendSms(booking.phone, msg);
        sms2 = sms.ok ? "sent" : `failed: ${sms.error}`.slice(0, 100);
      }

      const { error } = await supabaseAdmin
        .from("bookings")
        .update(sms2 !== undefined ? { order_status: data.order_status, sms_2_status: sms2 } : { order_status: data.order_status })
        .eq("id", data.booking_id);
      if (error) return { error: error.message };
      return { error: null as string | null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

// ---------------- LIST SUPPLIES ----------------
export const listSupplies = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenOnly.parse(input))
  .handler(async ({ data }) => {
    try {
      await verifyAdmin(data.access_token);
      const { data: rows, error } = await supabaseAdmin
        .from("supplies")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) return { error: error.message, supplies: [] as never[] };
      return { error: null as string | null, supplies: rows ?? [] };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed", supplies: [] as never[] };
    }
  });

const updateSupplySchema = tokenOnly.extend({
  id: z.string().uuid(),
  current_stock: z.number().int().min(0).max(100000),
});

export const updateSupplyStock = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateSupplySchema.parse(input))
  .handler(async ({ data }) => {
    try {
      await verifyAdmin(data.access_token);
      const { error } = await supabaseAdmin
        .from("supplies")
        .update({ current_stock: data.current_stock })
        .eq("id", data.id);
      if (error) return { error: error.message };
      return { error: null as string | null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

// ---------------- LIST SETTINGS ----------------
export const listSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenOnly.parse(input))
  .handler(async ({ data }) => {
    try {
      await verifyAdmin(data.access_token);
      const { data: rows, error } = await supabaseAdmin.from("app_settings").select("*").order("key");
      if (error) return { error: error.message, settings: [] as never[] };
      return { error: null as string | null, settings: rows ?? [] };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed", settings: [] as never[] };
    }
  });

const updateSettingSchema = tokenOnly.extend({
  key: z.string().min(1).max(100),
  value: z.number().min(0).max(100000),
});

export const updateSetting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateSettingSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      await verifyAdmin(data.access_token);
      const { error } = await supabaseAdmin
        .from("app_settings")
        .update({ value: data.value })
        .eq("key", data.key);
      if (error) return { error: error.message };
      return { error: null as string | null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

// ---------------- CAPTURE PAYMENT ----------------
const captureSchema = tokenOnly.extend({
  booking_id: z.string().uuid(),
  actual_weight: z.number().min(0).max(500),
});

export const captureBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => captureSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      await verifyAdmin(data.access_token);

      const { data: booking, error: be } = await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("id", data.booking_id)
        .maybeSingle();
      if (be || !booking) return { error: "Booking not found" };
      if (!booking.stripe_payment_intent_id) return { error: "No payment intent on booking" };
      if (booking.order_status === "delivered") return { error: "Already captured" };

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

      const cityKey = (booking.city ?? "").toLowerCase().trim();
      const taxRate = CITY_TAX_RATES[cityKey] ?? 0.0903;
      const taxAmount = Math.round(finalTotal * taxRate * 100) / 100;
      const finalTotalWithTax = finalTotal + taxAmount;
      const finalCents = Math.round(finalTotalWithTax * 100);

      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      if (intent.status !== "requires_capture") {
        return { error: `Payment not capturable (status: ${intent.status})` };
      }

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

      const capturedDollars = captureAmt / 100;
      const deliveryAddress = `${booking.street_address}, ${booking.city}, ${booking.state} ${booking.zip}`;
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
        subtotal: finalTotal,
        taxRate,
        taxAmount,
        city: booking.city ?? "",
        pickupDate: booking.pickup_date,
        deliveryAddress,
        scent: booking.scent_profile,
        size: booking.size_selected,
        total: capturedDollars,
      });
      const emailRes = await sendEmail(booking.email, `Your Northern Linen receipt — ${booking.confirmation_number}`, html);

      await supabaseAdmin
        .from("bookings")
        .update({
          actual_weight: data.actual_weight,
          final_captured_amount: finalTotalWithTax,
          order_status: "delivered",
          receipt_email_status: emailRes.ok ? "sent" : `failed: ${emailRes.error}`.slice(0, 100),
        })
        .eq("id", data.booking_id);

      return {
        error: null as string | null,
        captured: capturedDollars,
        subtotal: finalTotal,
        taxRate,
        taxAmount,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
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
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  city: string;
  pickupDate: string;
  deliveryAddress: string;
  scent: string;
  size: string;
  total: number;
}): string {
  const NAVY = "#1B3A4B";
  const STEEL = "#5B9DB5";
  const SOFT = "#8BBCCC";
  const WHITE = "#FFFFFF";

  const ratePct = (p.taxRate * 100).toFixed(2);
  const washSubtotal = p.billableWeight * p.pricePerLb;
  const drySubtotal = p.dry * p.pricePerDry;
  const comfSubtotal = p.comf * p.pricePerComf;

  const detailRow = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${SOFT};color:${STEEL};font-size:13px;text-transform:uppercase;letter-spacing:0.5px">${label}</td>
      <td style="padding:8px 0;border-bottom:1px solid ${SOFT};color:${NAVY};font-size:15px;text-align:right">${value}</td>
    </tr>`;

  const lineRow = (label: string, sub: string, amount: number) =>
    `<tr>
      <td style="padding:6px 0;color:${STEEL};font-size:13px;text-transform:uppercase;letter-spacing:0.5px">${label}</td>
      <td style="padding:6px 0;color:${NAVY};font-size:14px">${sub}</td>
      <td style="padding:6px 0;color:${NAVY};font-size:15px;text-align:right">$${amount.toFixed(2)}</td>
    </tr>`;

  return `<!doctype html><html><body style="margin:0;padding:0;background:${WHITE};font-family:Arial,sans-serif;color:${NAVY}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${WHITE}"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:${WHITE};padding:40px">
  <tr><td align="center" style="padding-bottom:8px">
    <div style="color:${NAVY};font-size:24px;font-weight:bold">Northern Linen</div>
    <div style="color:${STEEL};font-size:14px;margin-bottom:24px">Drop the bag. Own the day.</div>
    <hr style="border:0;border-top:1px solid ${SOFT};margin:0">
  </td></tr>
  <tr><td style="padding-top:32px">
    <h1 style="color:${NAVY};font-size:20px;font-weight:bold;margin:0 0 8px">Hi ${p.name},</h1>
    <p style="color:${NAVY};font-size:15px;line-height:1.7;margin:0 0 24px">Thank you for choosing Northern Linen. Your order is complete and your laundry is on its way.</p>

    <h2 style="color:${NAVY};font-size:16px;font-weight:bold;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid ${SOFT}">Order Details</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${detailRow("CONFIRMATION", p.confirmation)}
      ${detailRow("PICKUP DATE", p.pickupDate)}
      ${detailRow("DELIVERY ADDRESS", p.deliveryAddress)}
      ${detailRow("SERVICE SIZE", p.size)}
      ${detailRow("SCENT", p.scent)}
      ${detailRow("ACTUAL WEIGHT", `${p.weight} lbs`)}
    </table>

    <hr style="border:0;border-top:1px solid ${SOFT};margin:24px 0">

    <h2 style="color:${NAVY};font-size:16px;font-weight:bold;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid ${SOFT}">Receipt</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${lineRow("WASH AND FOLD", `${p.billableWeight}lbs at $${p.pricePerLb.toFixed(2)} per lb`, washSubtotal)}
      ${p.dry > 0 ? lineRow("DRY CLEANING", `${p.dry} items at $${p.pricePerDry.toFixed(2)} each`, drySubtotal) : ""}
      ${p.comf > 0 ? lineRow("COMFORTERS", `${p.comf} at $${p.pricePerComf.toFixed(2)} each`, comfSubtotal) : ""}
    </table>

    <hr style="border:0;border-top:1px solid ${SOFT};margin:16px 0">

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:6px 0;color:${STEEL};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">SUBTOTAL</td>
        <td style="padding:6px 0;color:${NAVY};font-size:15px;font-weight:600;text-align:right">$${p.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:${STEEL};font-size:13px;text-transform:uppercase;letter-spacing:0.5px">SALES TAX (${p.city} ${ratePct}%)</td>
        <td style="padding:6px 0;color:${NAVY};font-size:15px;text-align:right">$${p.taxAmount.toFixed(2)}</td>
      </tr>
    </table>

    <hr style="border:0;border-top:2px solid ${NAVY};margin:16px 0">

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:4px 0;color:${NAVY};font-weight:bold;font-size:18px">TOTAL CHARGED</td>
        <td style="padding:4px 0;color:${NAVY};font-weight:bold;font-size:20px;text-align:right">$${p.total.toFixed(2)}</td>
      </tr>
    </table>

    <hr style="border:0;border-top:1px solid ${SOFT};margin:32px 0 0">

    <div style="text-align:center;padding-top:24px">
      <div style="color:${NAVY};font-size:14px;margin-bottom:8px">We appreciate your business and look forward to serving you again.</div>
      <div style="color:${NAVY};font-size:14px">northernlinen.com</div>
      <div style="color:${NAVY};font-size:14px">info@northernlinen.com</div>
      <div style="color:${STEEL};font-size:13px;margin-top:8px">South Loop Bloomington MN</div>
      <div style="color:${SOFT};font-size:12px;margin-top:16px">© Northern Linen 2026</div>
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

// ---------------- PIN LOGIN ----------------
const ADMIN_EMAIL = "info@northernlinen.com";

export const verifyAdminPin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ pin: z.string().regex(/^\d{6}$/) }).parse(input))
  .handler(async ({ data }) => {
    const ip = getClientIp(new Headers(getRequestHeaders() as HeadersInit));

    // Rate limit: 5 failed attempts per IP per hour. We pre-check here; if the
    // PIN is correct we clear the counter so success doesn't burn a slot.
    const rl = await checkRateLimit({
      scope: "admin_pin",
      ip,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      return {
        ok: false as const,
        error: "Too many failed login attempts. Please try again in 60 minutes.",
      };
    }

    const expected = process.env.ADMIN_PIN;
    if (!expected) return { ok: false as const, error: "ADMIN_PIN not configured" };
    if (data.pin !== expected) return { ok: false as const, error: "Invalid PIN" };

    try {
      const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: ADMIN_EMAIL,
      });
      if (error || !link?.properties?.hashed_token) {
        return { ok: false as const, error: error?.message || "Failed to issue session" };
      }
      // Successful auth — wipe the IP's failure counter so legit retries are clean.
      await clearRateLimit("admin_pin", ip);
      return {
        ok: true as const,
        token_hash: link.properties.hashed_token,
        error: null as string | null,
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
    }
  });

// ---------------- BOOTSTRAP ADMIN ----------------
export const claimAdminRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenOnly.parse(input))
  .handler(async ({ data }) => {
    try {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(data.access_token);
      if (userErr || !userData?.user) {
        return { error: "Invalid session", granted: false };
      }
      const email = userData.user.email;
      if (email !== "info@northernlinen.com") {
        return { error: "Only the owner email can claim admin role", granted: false };
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userData.user.id, role: "admin" }, { onConflict: "user_id,role" });
      if (error) return { error: error.message, granted: false };
      return { error: null as string | null, granted: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Unknown error", granted: false };
    }
  });
