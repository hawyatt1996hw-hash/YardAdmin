"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import s from "../_components/shell.module.css";

type Settings = {
  id: string;
  company_name: string;
  yard_name: string;
  yard_lat: number;
  yard_lng: number;
  yard_radius_m: number;
  brand_primary: string;
  brand_secondary: string;
  logo_url: string | null;
};

export default function SettingsPage() {
  const [row, setRow] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    if (!error && data) setRow(data as any);
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setRow((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!row) return;
    setBusy(true);
    try {
      const payload = {
        company_name: row.company_name.trim(),
        yard_name: row.yard_name.trim(),
        yard_lat: Number(row.yard_lat),
        yard_lng: Number(row.yard_lng),
        yard_radius_m: Number(row.yard_radius_m),
        brand_primary: row.brand_primary.trim(),
        brand_secondary: row.brand_secondary.trim(),
        logo_url: row.logo_url?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("company_settings")
        .update(payload)
        .eq("id", row.id);

      if (error) throw error;
      alert("Saved ✅");
      await load();
    } catch (e: any) {
      alert(`Save failed:\n\n${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!row) {
    return (
      <div className={`${s.panel} ${s.panelPad}`}>
        <div className={s.h1}>Settings</div>
        <div className={s.muted}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={`${s.panel} ${s.panelPad}`} style={{ display: "grid", gap: 14 }}>
      <div>
        <div className={s.h1}>Company Settings</div>
        <div className={s.muted}>Branding + yard configuration for the whole system.</div>
      </div>

      <Section title="Branding">
        <Field label="Company name">
          <input
            value={row.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            style={input}
          />
        </Field>

        <Field label="Logo URL (optional)">
          <input
            value={row.logo_url ?? ""}
            onChange={(e) => set("logo_url", e.target.value)}
            style={input}
            placeholder="https://..."
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Primary colour">
            <input
              value={row.brand_primary}
              onChange={(e) => set("brand_primary", e.target.value)}
              style={input}
              placeholder="#2563eb"
            />
          </Field>

          <Field label="Secondary colour">
            <input
              value={row.brand_secondary}
              onChange={(e) => set("brand_secondary", e.target.value)}
              style={input}
              placeholder="#003aa8"
            />
          </Field>
        </div>
      </Section>

      <Section title="Yard">
        <Field label="Yard name">
          <input
            value={row.yard_name}
            onChange={(e) => set("yard_name", e.target.value)}
            style={input}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Yard latitude">
            <input
              value={String(row.yard_lat)}
              onChange={(e) => set("yard_lat", Number(e.target.value))}
              style={input}
            />
          </Field>

          <Field label="Yard longitude">
            <input
              value={String(row.yard_lng)}
              onChange={(e) => set("yard_lng", Number(e.target.value))}
              style={input}
            />
          </Field>

          <Field label="Radius (meters)">
            <input
              value={String(row.yard_radius_m)}
              onChange={(e) => set("yard_radius_m", Number(e.target.value))}
              style={input}
            />
          </Field>
        </div>

        <div style={{ fontWeight: 850, color: "rgba(255,255,255,0.75)" }}>
          Tip: You can get lat/lng by right-clicking on Google Maps and copying the coordinates.
        </div>
      </Section>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className={s.signOut} onClick={load} disabled={busy}>
          Reload
        </button>
        <button className={s.signOut} onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.14)" }}>
      <div style={{ fontWeight: 1000, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.80)" }}>{label}</div>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.18)",
  color: "white",
  fontWeight: 900,
  outline: "none",
};