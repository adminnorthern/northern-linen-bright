import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listSettings, listSupplies, updateSetting, updateSupplyStock } from "@/utils/admin.functions";
import { withToken } from "@/lib/admin-api";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

const NAVY = "#1B3A4B";
const STEEL = "#5B9DB5";
const SOFT = "#8BBCCC";

type Setting = Awaited<ReturnType<typeof listSettings>>["settings"][number];
type Supply = Awaited<ReturnType<typeof listSupplies>>["supplies"][number];

const SETTING_LABELS: Record<string, string> = {
  price_per_lb: "Price per pound (wash & fold)",
  price_per_dry_clean: "Price per dry cleaning item",
  price_per_comforter: "Price per comforter",
};

function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingSupply, setSavingSupply] = useState<string | null>(null);

  async function load() {
    const [s, sup] = await Promise.all([
      listSettings({ data: await withToken({}) }),
      listSupplies({ data: await withToken({}) }),
    ]);
    setSettings(s.settings ?? []);
    setSupplies(sup.supplies ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 className="animate-spin" color={STEEL} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ color: STEEL, fontSize: 15, marginTop: 4 }}>Pricing and supply inventory</p>
      </div>

      <section>
        <h2 style={{ color: NAVY, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Pricing</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {settings.map((s) => (
            <PriceRow
              key={s.key}
              setting={s}
              saving={savingKey === s.key}
              onSave={async (v) => {
                setSavingKey(s.key);
                await updateSetting({ data: await withToken({ key: s.key, value: v }) });
                await load();
                setSavingKey(null);
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ color: NAVY, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Supply inventory</h2>
        <div style={{ overflowX: "auto", border: `1.5px solid ${SOFT}`, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ background: "rgba(91,157,181,0.05)" }}>
                <Th>Item</Th>
                <Th>Current stock</Th>
                <Th>Minimum</Th>
                <Th>Status</Th>
                <Th>Update</Th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((s) => (
                <SupplyRow
                  key={s.id}
                  supply={s}
                  saving={savingSupply === s.id}
                  onSave={async (v) => {
                    setSavingSupply(s.id);
                    await updateSupplyStock({ data: await withToken({ id: s.id, current_stock: v }) });
                    await load();
                    setSavingSupply(null);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PriceRow({ setting, saving, onSave }: { setting: Setting; saving: boolean; onSave: (v: number) => Promise<void> }) {
  const [val, setVal] = useState(String(setting.value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, border: `1.5px solid ${SOFT}`, borderRadius: 8, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ color: NAVY, fontWeight: 600, fontSize: 15 }}>{SETTING_LABELS[setting.key] ?? setting.key}</div>
        <div style={{ color: STEEL, fontSize: 12 }}>{setting.key}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ color: NAVY, fontSize: 16 }}>$</span>
        <input
          type="number"
          step={0.01}
          min={0}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{ width: 100, background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 6, padding: "8px 10px", fontSize: 15, color: NAVY, outline: "none" }}
        />
      </div>
      <button
        type="button"
        disabled={saving || parseFloat(val) === Number(setting.value)}
        onClick={() => onSave(parseFloat(val))}
        style={{ background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving || parseFloat(val) === Number(setting.value) ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? "Saving" : "Save"}
      </button>
    </div>
  );
}

function SupplyRow({ supply, saving, onSave }: { supply: Supply; saving: boolean; onSave: (v: number) => Promise<void> }) {
  const [val, setVal] = useState(String(supply.current_stock));
  const low = supply.current_stock <= supply.minimum_threshold;
  return (
    <tr style={{ borderTop: `1px solid ${SOFT}40` }}>
      <Td>{supply.name}</Td>
      <Td>{supply.current_stock}</Td>
      <Td>{supply.minimum_threshold}</Td>
      <Td>
        <span style={{ color: low ? "#FFFFFF" : NAVY, background: low ? STEEL : "transparent", border: low ? "none" : `1px solid ${SOFT}`, borderRadius: 12, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
          {low ? "Low" : "OK"}
        </span>
      </Td>
      <Td>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="number"
            min={0}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            style={{ width: 80, background: "#FFFFFF", border: `1.5px solid ${SOFT}`, borderRadius: 6, padding: "6px 10px", fontSize: 14, color: NAVY, outline: "none" }}
          />
          <button
            type="button"
            disabled={saving || parseInt(val, 10) === supply.current_stock}
            onClick={() => onSave(parseInt(val, 10))}
            style={{ background: STEEL, color: "#FFFFFF", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving || parseInt(val, 10) === supply.current_stock ? 0.6 : 1, display: "flex", alignItems: "center", gap: 4 }}
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save
          </button>
        </div>
      </Td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: 12, color: STEEL, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: 12, color: NAVY, fontSize: 14, verticalAlign: "middle" }}>{children}</td>;
}
