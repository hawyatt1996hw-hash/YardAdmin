"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import s from "../_components/shell.module.css";

type Row = {
  id: string;
  user_id: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  profiles?: { full_name: string | null }[] | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function yyyyMmDd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function hoursBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!isFinite(a) || !isFinite(b) || b <= a) return null;
  return Math.round(((b - a) / (1000 * 60 * 60)) * 100) / 100;
}

export default function TimesheetsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return yyyyMmDd(d);
  });

  const [to, setTo] = useState(() => yyyyMmDd(new Date()));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);

    // day boundaries
    const startIso = new Date(`${from}T00:00:00`).toISOString();
    const endDate = new Date(`${to}T00:00:00`);
    endDate.setDate(endDate.getDate() + 1);
    const endIso = endDate.toISOString();

    const { data, error } = await supabase
      .from("time_entries")
      .select("id,user_id,clock_in_at,clock_out_at,profiles(full_name)")
      .gte("clock_in_at", startIso)
      .lt("clock_in_at", endIso)
      .order("clock_in_at", { ascending: false });

    if (!error && data) setRows(data as any);
    setLoading(false);
  }

  function formatTime(t: string | null) {
    if (!t) return "-";
    return new Date(t).toLocaleString();
  }

  const totalsByStaff = useMemo(() => {
    const map = new Map<string, { name: string; hours: number }>();
    for (const r of rows) {
      const name = r.profiles?.[0]?.full_name ?? "Unknown";
      const hrs = hoursBetween(r.clock_in_at, r.clock_out_at);
      if (!hrs) continue;

      const key = `${r.user_id ?? r.id}`;
      const prev = map.get(key);
      if (!prev) map.set(key, { name, hours: hrs });
      else map.set(key, { name, hours: Math.round((prev.hours + hrs) * 100) / 100 });
    }
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [rows]);

  function downloadCsv() {
    // Payroll-style totals
    const header = ["Name", "Total Hours"].join(",");
    const lines = totalsByStaff.map((t) => {
      const safeName = `"${(t.name ?? "").replaceAll(`"`, `""`)}"`;
      return [safeName, t.hours.toFixed(2)].join(",");
    });

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`${s.panel} ${s.panelPad}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className={s.h1}>Timesheets</div>
          <div className={s.muted}>Filter by date range and export totals.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontWeight: 900, color: "rgba(255,255,255,0.8)" }}>
            From{" "}
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              type="date"
              style={dateStyle}
            />
          </label>

          <label style={{ fontWeight: 900, color: "rgba(255,255,255,0.8)" }}>
            To{" "}
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              type="date"
              style={dateStyle}
            />
          </label>

          <button onClick={load} className={s.signOut}>
            Apply
          </button>

          <button onClick={downloadCsv} className={s.signOut}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ height: 18 }} />

      {/* Totals summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Totals (payroll-style)</div>
          {totalsByStaff.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 750 }}>No completed shifts in this range.</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {totalsByStaff.slice(0, 8).map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 850 }}>{t.name}</div>
                  <div style={{ fontWeight: 950 }}>{t.hours.toFixed(2)} hrs</div>
                </div>
              ))}
              {totalsByStaff.length > 8 && (
                <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 750 }}>
                  + {totalsByStaff.length - 8} more…
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ fontWeight: 800 }}>Loading…</div>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const name = r.profiles?.[0]?.full_name ?? "Unknown";
              const active = r.clock_out_at === null;
              const hrs = hoursBetween(r.clock_in_at, r.clock_out_at);

              return (
                <tr key={r.id} className={s.rowHover}>
                  <td style={{ fontWeight: 950 }}>{name}</td>
                  <td>{formatTime(r.clock_in_at)}</td>
                  <td>{formatTime(r.clock_out_at)}</td>
                  <td style={{ fontWeight: 950 }}>{hrs === null ? "-" : hrs.toFixed(2)}</td>
                  <td>
                    {active ? (
                      <span style={badge("green")}>Clocked In</span>
                    ) : (
                      <span style={badge("blue")}>Completed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const dateStyle: React.CSSProperties = {
  marginLeft: 8,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.18)",
  color: "rgba(255,255,255,0.92)",
  fontWeight: 900,
};

function badge(kind: "green" | "blue") {
  const bg =
    kind === "green" ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.25)";
  const border =
    kind === "green" ? "rgba(16,185,129,0.35)" : "rgba(59,130,246,0.35)";
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 950,
    background: bg,
    border: `1px solid ${border}`,
  } as React.CSSProperties;
}