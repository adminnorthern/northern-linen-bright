import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listSettings, listSupplies, updateSetting, updateSupplyStock } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { Loader2, Check, X } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";
const RED = "#DC2626";
const GREEN = "#10B981";

type Setting = Awaited<ReturnType<typeof listSettings>>["settings"][number];
type Supply = Awaited<ReturnType<typeof listSupplies>>["supplies"][number];

const SETTING_LABELS: Record<string, string> = {
  price_per_lb: "Price per lb — Wash and Fold",
  price_per_dry_clean: "Price per item — Dry Cleaning",
  price_per_comforter: "Price per comforter",
};

function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [s, sup] = await Promise.all([
      listSettings({ data: await withToken({}) }),
      listSupplies({ data: await withToken({}) }),
    ]);
    setSettings(s.settings ?? []);
    setSupplies(sup.supplies ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 className="animate-spin" color={STEEL} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Settings</h1>

      <section>
        <h2 style={section}>Pricing</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
          {settings.map((s) => (
            <PriceRow key={s.key} setting={s} onSaved={load} />
          ))}
        </div>
        <p style={{ color: SOFT, fontSize: 13, marginTop: 16 }}>Changes take effect immediately on all new calculations</p>
      </section>

      <SuppliesSection supplies={supplies} onSaved={load} />

      <section>
        <h2 style={section}>Admin Login PIN</h2>
        <p style={{ color: NAVY, fontSize: 14, lineHeight: 1.7, marginTop: 16 }}>
          Your admin login uses a 6 digit PIN. To change your PIN go to your Lovable project settings and update the ADMIN_PIN environment variable.
        </p>
      </section>
    </div>
  );
}

const section: React.CSSProperties = { color: NAVY, fontSize: 20, fontWeight: 700, borderBottom: `1px solid ${SOFT}`, paddingBottom: 8, margin: 0 };

function PriceRow({ setting, onSaved }: { setting: Setting; onSaved: () => Promise<void> }) {
  const [val, setVal] = useState(String(setting.value));
  const [state, setState] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setState("saving"); setErr(null);
    const r = await updateSetting({ data: await withToken({ key: setting.key, value: parseFloat(val) }) });
    if (r.error) {
      setState("err"); setErr(r.error);
      setTimeout(() => setState("idle"), 3000);
    } else {
      setState("ok");
      await onSaved();
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200, color: NAVY, fontSize: 15 }}>
        {SETTING_LABELS[setting.key] ?? setting.key}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ color: NAVY, fontSize: 15 }}>$</span>
        <input
          type="number" step={0.01} min={0} value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{ width: 120, background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 8, padding: 10, fontSize: 15, color: NAVY, outline: "none" }}
        />
      </div>
      <button
        type="button" disabled={state === "saving"} onClick={save}
        style={{ background: state === "ok" ? GREEN : state === "err" ? RED : STEEL, color: "#FFFFFF", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, minWidth: 90, justifyContent: "center" }}
      >
        {state === "saving" && <Loader2 size={14} className="animate-spin" />}
        {state === "ok" && <Check size={14} />}
        {state === "err" && <X size={14} />}
        {state === "idle" || state === "saving" ? "Save" : state === "ok" ? "Saved" : "Failed"}
      </button>
      {err && <div style={{ color: RED, fontSize: 13, width: "100%" }}>{err}</div>}
    </div>
  );
}

function SuppliesSection({ supplies, onSaved }: { supplies: Supply[]; onSaved: () => Promise<void> }) {
  const [stocks, setStocks] = useState<Record<string, string>>(
    () => Object.fromEntries(supplies.map((s) => [s.id, String(s.current_stock)]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const lowAny = supplies.some((s) => s.current_stock <= s.minimum_threshold);

  useEffect(() => {
    setStocks(Object.fromEntries(supplies.map((s) => [s.id, String(s.current_stock)])));
  }, [supplies]);

  async function saveAll() {
    setSaving(true); setMsg(null);
    const errors: string[] = [];
    for (const s of supplies) {
      const v = parseInt(stocks[s.id] ?? "0", 10);
      if (v === s.current_stock) continue;
      const r = await updateSupplyStock({ data: await withToken({ id: s.id, current_stock: v }) });
      if (r.error) errors.push(`${s.name}: ${r.error}`);
    }
    setSaving(false);
    if (errors.length) setMsg({ ok: false, text: errors.join("; ") });
    else setMsg({ ok: true, text: "Stock levels saved successfully" });
    await onSaved();
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <section>
      <h2 style={section}>Supplies Inventory</h2>
      {lowAny && (
        <div style={{ background: "#FEF2F2", border: `1.5px solid ${RED}`, borderRadius: 8, padding: 16, marginTop: 16 }}>
          <p style={{ color: RED, fontSize: 14, margin: 0 }}>One or more supplies are running low. Please reorder soon.</p>
        </div>
      )}
      <div style={{ overflowX: "auto", border: `1.5px solid ${SOFT}`, borderRadius: 12, marginTop: 16, background: "#FFFFFF" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ background: SOFT }}>
              <Th>Item</Th><Th>Current Stock</Th><Th>Minimum</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {supplies.map((s) => {
              const cur = parseInt(stocks[s.id] ?? "0", 10);
              const low = cur <= s.minimum_threshold;
              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${SOFT}` }}>
                  <Td>{s.name}</Td>
                  <Td>
                    <input
                      type="number" min={0} value={stocks[s.id] ?? ""}
                      onChange={(e) => setStocks({ ...stocks, [s.id]: e.target.value })}
                      style={{ width: 80, background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 6, padding: 8, fontSize: 14, color: NAVY, outline: "none" }}
                    />
                  </Td>
                  <Td>{s.minimum_threshold}</Td>
                  <Td>
                    <span style={{ display: "inline-block", background: low ? RED : GREEN, color: "#FFFFFF", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20 }}>
                      {low ? "Low Stock" : "In Stock"}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          type="button" disabled={saving} onClick={saveAll}
          style={{ background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 15, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : "Save All Stock Levels"}
        </button>
        {msg && (
          <p style={{ color: msg.ok ? GREEN : RED, fontSize: 14, marginTop: 12 }}>{msg.text}</p>
        )}
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "12px 16px", color: NAVY, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "12px 16px", color: NAVY, fontSize: 14, verticalAlign: "middle" }}>{children}</td>;
}
