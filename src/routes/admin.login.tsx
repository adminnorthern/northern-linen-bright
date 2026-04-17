import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Sign In — Northern Linen" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogin,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const ERR = "#DC2626";
const OWNER_EMAIL = "info@northernlinen.com";

function AdminLogin() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated && auth.isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [auth.loading, auth.isAuthenticated, auth.isAdmin, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (email.trim().toLowerCase() !== OWNER_EMAIL) {
          setError("Only the owner email can create the admin account.");
          setLoading(false);
          return;
        }
        const { error: sErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (sErr) {
          setError(sErr.message);
          setLoading(false);
          return;
        }
      }
      const { error: lErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (lErr) {
        setError(lErr.message);
        setLoading(false);
        return;
      }
      // If owner, ensure admin role exists (safe DB function — owner-only).
      if (email.trim().toLowerCase() === OWNER_EMAIL) {
        await supabase.rpc("claim_owner_admin_role");
      }
      window.location.href = "/admin";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign in");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 420, background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 40 }}>
        <h1 style={{ color: NAVY, fontSize: 26, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Northern Linen Admin</h1>
        <p style={{ color: STEEL, fontSize: 14, marginBottom: 28, textAlign: "center" }}>
          {mode === "signin" ? "Sign in to your admin account" : "Create the admin account"}
        </p>

        <label style={{ display: "block", color: NAVY, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={{
            width: "100%",
            fontSize: 15,
            color: NAVY,
            background: "#FFFFFF",
            border: `1.5px solid ${SOFT}`,
            borderRadius: 8,
            padding: "12px 14px",
            outline: "none",
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", color: NAVY, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoFocus
          minLength={8}
          required
          style={{
            width: "100%",
            fontSize: 15,
            color: NAVY,
            background: "#FFFFFF",
            border: `1.5px solid ${SOFT}`,
            borderRadius: 8,
            padding: "12px 14px",
            outline: "none",
            marginBottom: 20,
            boxSizing: "border-box",
          }}
          placeholder={mode === "signup" ? "At least 8 characters" : ""}
        />

        <button
          type="submit"
          disabled={loading || password.length < 8}
          style={{
            width: "100%",
            background: STEEL,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            padding: 14,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading || password.length < 8 ? "not-allowed" : "pointer",
            opacity: loading || password.length < 8 ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account & sign in"}
        </button>

        <p style={{ marginTop: 16, fontSize: 13, color: STEEL, textAlign: "center" }}>
          {mode === "signin" ? "First time setting up?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            style={{ background: "none", border: "none", color: NAVY, fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            {mode === "signin" ? "Create the admin account" : "Sign in"}
          </button>
        </p>

        {error && <p style={{ color: ERR, fontSize: 13, marginTop: 16, textAlign: "center" }}>{error}</p>}
      </form>
    </div>
  );
}
