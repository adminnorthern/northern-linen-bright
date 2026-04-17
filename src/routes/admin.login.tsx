import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { verifyAdminPin } from "@/utils/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin PIN — Northern Linen" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogin,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const ERR = "#DC2626";

function AdminLogin() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated && auth.isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [auth.loading, auth.isAuthenticated, auth.isAdmin, navigate]);

  async function submitPin(value: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await verifyAdminPin({ data: { pin: value } });
      if (!res.ok || !res.token_hash) {
        setError(res.error || "Invalid PIN");
        setPin("");
        setLoading(false);
        return;
      }
      const { error: vErr } = await supabase.auth.verifyOtp({
        token_hash: res.token_hash,
        type: "magiclink",
      });
      if (vErr) {
        setError(vErr.message);
        setPin("");
        setLoading(false);
        return;
      }
      window.location.href = "/admin";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign in");
      setPin("");
      setLoading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(v);
    if (v.length === 6 && !loading) {
      submitPin(v);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
        <h1 style={{ color: NAVY, fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Northern Linen Admin</h1>
        <p style={{ color: STEEL, fontSize: 14, marginBottom: 28 }}>Enter your 6-digit PIN</p>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={pin}
          onChange={onChange}
          disabled={loading}
          maxLength={6}
          style={{
            width: "100%",
            textAlign: "center",
            letterSpacing: "16px",
            fontSize: 32,
            fontWeight: 700,
            color: NAVY,
            background: "#FFFFFF",
            border: `1.5px solid ${SOFT}`,
            borderRadius: 12,
            padding: "18px 14px",
            outline: "none",
            fontFamily: "monospace",
          }}
          placeholder="••••••"
        />

        {loading && (
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: STEEL, fontSize: 14 }}>
            <Loader2 size={16} className="animate-spin" /> Signing in…
          </div>
        )}
        {error && <p style={{ color: ERR, fontSize: 13, marginTop: 16 }}>{error}</p>}
      </div>
    </div>
  );
}
