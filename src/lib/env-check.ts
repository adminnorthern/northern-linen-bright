const REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "RESEND_API_KEY",
  "ADMIN_PIN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export function checkEnvVars(): { ok: boolean; missing: string[] } {
  // Only meaningful on the server. In the browser, process.env is mostly empty
  // and would produce noisy false positives.
  if (typeof window !== "undefined") return { ok: true, missing: [] };

  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.warn(
      "[Northern Linen] Missing required environment variables:",
      missing.join(", ")
    );
    console.warn(
      "[Northern Linen] These features may not work correctly until these are set."
    );
  }
  return { ok: missing.length === 0, missing };
}
