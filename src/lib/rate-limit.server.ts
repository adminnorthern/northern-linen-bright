// Database-backed rate limiter. Works correctly across serverless worker
// instances because state lives in Postgres, not in-process memory.
//
// Each "scope" + "ip" pair gets a sliding 60-minute window. Once the count
// reaches `limit`, further attempts within the window are rejected. The
// counter resets when the window expires, or via clearRateLimit() on success.
//
// Server-only — never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

export async function checkRateLimit(opts: {
  scope: string;
  ip: string;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  const key = `${opts.scope}:${opts.ip}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - opts.windowMs);

  try {
    const { data: row } = await supabaseAdmin
      .from("rate_limits")
      .select("attempts, window_started_at")
      .eq("key", key)
      .maybeSingle();

    let attempts = 0;
    let windowStartedAt = now.toISOString();

    if (row && new Date(row.window_started_at) > windowStart) {
      // Still inside the existing window
      attempts = row.attempts;
      windowStartedAt = row.window_started_at;
    }

    if (attempts >= opts.limit) {
      return { allowed: false, remaining: 0 };
    }

    const newAttempts = attempts + 1;
    await supabaseAdmin.from("rate_limits").upsert(
      {
        key,
        attempts: newAttempts,
        window_started_at: windowStartedAt,
        updated_at: now.toISOString(),
      },
      { onConflict: "key" }
    );

    return { allowed: true, remaining: Math.max(0, opts.limit - newAttempts) };
  } catch (e) {
    // Fail-open: never block real traffic because of a DB hiccup.
    console.error("rate-limit check failed:", e);
    return { allowed: true, remaining: opts.limit };
  }
}

export async function clearRateLimit(scope: string, ip: string): Promise<void> {
  try {
    await supabaseAdmin.from("rate_limits").delete().eq("key", `${scope}:${ip}`);
  } catch (e) {
    console.error("rate-limit clear failed:", e);
  }
}
