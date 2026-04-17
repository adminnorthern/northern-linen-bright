import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { claimAdminRole } from "@/utils/admin.functions";
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

function AdminLogin() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Auto redirect if already signed in
  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated && auth.isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [auth.loading, auth.isAuthenticated, auth.isAdmin, navigate]);

  // If signed in but not admin, try to claim role (only works for owner email)
  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated && !auth.isAdmin) {
      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        claimAdminRole({ data: { access_token: token } }).then((res: { granted: boolean }) => {
          if (res.granted) {
            window.location.href = "/admin";
          }
        });
      });
    }
  }, [auth.loading, auth.isAuthenticated, auth.isAdmin]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    if (mode === "signin") {
      const { error } = await auth.signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error);
        return;
      }
      navigate({ to: "/admin" });
    } else {
      const { error } = await auth.signUp(email, password);
      setLoading(false);
      if (error) {
        setError(error);
        return;
      }
      setInfo("Check your email to confirm your account, then sign in.");
      setMode("signin");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 12, padding: 40 }}>
        <h1 style={{ color: NAVY, fontSize: 26, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Northern Linen Admin</h1>
        <p style={{ color: STEEL, fontSize: 14, marginBottom: 32, textAlign: "center" }}>
          {mode === "signin" ? "Sign in to manage your business" : "Create your admin account"}
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="info@northernlinen.com" />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
          </div>
          {error && <p style={{ color: ERR, fontSize: 13, margin: 0 }}>{error}</p>}
          {info && <p style={{ color: STEEL, fontSize: 13, margin: 0 }}>{info}</p>}
          <button type="submit" disabled={loading} style={{ background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.85 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Please wait" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          style={{ marginTop: 16, background: "transparent", border: "none", color: STEEL, fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center" }}
        >
          {mode === "signin" ? "First time? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: NAVY, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "12px 14px", fontSize: 15, color: NAVY, outline: "none" };
