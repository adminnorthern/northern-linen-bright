import { createFileRoute, Outlet, Link, useNavigate, useLocation, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Northern Linen" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";

const TABS = [
  { to: "/admin" as const, label: "Operations", exact: true },
  { to: "/admin/orders" as const, label: "Orders" },
  { to: "/admin/customers" as const, label: "Customers" },
  { to: "/admin/calculator" as const, label: "Calculator" },
  { to: "/admin/settings" as const, label: "Settings" },
];

function AdminLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onLoginPage = location.pathname === "/admin/login";

  useEffect(() => {
    if (auth.loading) return;
    if (onLoginPage) return;
    if (!auth.isAuthenticated) {
      navigate({ to: "/admin/login" });
    }
  }, [auth.loading, auth.isAuthenticated, onLoginPage, navigate]);

  if (onLoginPage) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
        <Outlet />
      </div>
    );
  }

  if (auth.loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" color={STEEL} />
      </div>
    );
  }

  if (!auth.isAuthenticated) return null;

  if (!auth.isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ color: NAVY, fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Access denied</h1>
          <p style={{ color: NAVY, fontSize: 15, marginBottom: 24 }}>
            This account is signed in but does not have admin access.
          </p>
          <button
            onClick={async () => {
              await auth.signOut();
              navigate({ to: "/admin/login" });
            }}
            style={{ background: STEEL, color: "#FFF", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "#FFFFFF", borderBottom: `1.5px solid ${SOFT}`, padding: "16px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <Link to="/admin" style={{ color: NAVY, fontSize: 18, fontWeight: 700, textDecoration: "none" }}>
              Northern Linen Admin
            </Link>
            <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {TABS.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  activeOptions={{ exact: !!t.exact }}
                  style={{ textDecoration: "none" }}
                  activeProps={{ style: { background: STEEL, color: "#FFFFFF", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 600, textDecoration: "none" } }}
                  inactiveProps={{ style: { color: NAVY, padding: "8px 14px", fontSize: 14, fontWeight: 600, textDecoration: "none", borderRadius: 8 } }}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={async () => {
              await auth.signOut();
              navigate({ to: "/admin/login" });
            }}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", color: NAVY, border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: "32px 24px", background: "#FFFFFF" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
