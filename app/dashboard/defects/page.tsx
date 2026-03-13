"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import s from "../_components/shell.module.css";

type Defect = {
  id: string;
  vehicle_reg: string | null;
  defect_text: string | null;
  severity: string | null;
  resolved: boolean | null;
  created_at: string | null;
  profiles?: { full_name: string | null }[] | null;
};

export default function DefectsPage() {
  const [rows, setRows] = useState<Defect[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("vehicle_checks")
      .select(
        "id,vehicle_reg,defect_text,severity,resolved,created_at,profiles(full_name)"
      )
      .order("created_at", { ascending: false });

    setRows((data as any) ?? []);
  }

  async function resolve(id: string) {
    await supabase
      .from("vehicle_checks")
      .update({ resolved: true })
      .eq("id", id);

    load();
  }

  function formatTime(t: string | null) {
    if (!t) return "-";
    return new Date(t).toLocaleString();
  }

  const filtered = rows.filter((r) => {
    if (filter === "open" && r.resolved) return false;
    if (filter === "resolved" && !r.resolved) return false;

    if (search && !r.vehicle_reg?.toLowerCase().includes(search.toLowerCase()))
      return false;

    return true;
  });

  return (
    <div className={`${s.panel} ${s.panelPad}`}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className={s.h1}>Vehicle Defects</div>
          <div className={s.muted}>Manage fleet safety reports.</div>
        </div>

        <input
          placeholder="Search vehicle reg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchBox}
        />
      </div>

      <div style={{ height: 16 }} />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10 }}>
        <FilterBtn label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterBtn label="Open" active={filter === "open"} onClick={() => setFilter("open")} />
        <FilterBtn label="Resolved" active={filter === "resolved"} onClick={() => setFilter("resolved")} />
      </div>

      <div style={{ height: 16 }} />

      <table className={s.table}>
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Driver</th>
            <th>Defect</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Reported</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className={s.rowHover}>
              <td style={{ fontWeight: 900 }}>{r.vehicle_reg}</td>

              <td>{r.profiles?.[0]?.full_name ?? "Unknown"}</td>

              <td style={{ maxWidth: 350 }}>{r.defect_text}</td>

              <td>
                <span style={severityBadge(r.severity)}>
                  {r.severity ?? "minor"}
                </span>
              </td>

              <td>
                {r.resolved ? (
                  <span style={resolvedBadge}>Resolved</span>
                ) : (
                  <span style={openBadge}>Open</span>
                )}
              </td>

              <td>{formatTime(r.created_at)}</td>

              <td>
                {!r.resolved && (
                  <button
                    onClick={() => resolve(r.id)}
                    style={resolveBtn}
                  >
                    Resolve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- UI ---------- */

function FilterBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        fontWeight: 900,
        border: "none",
        cursor: "pointer",
        background: active ? "#2563eb" : "rgba(255,255,255,0.12)",
        color: "white",
      }}
    >
      {label}
    </button>
  );
}

const searchBox: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.18)",
  color: "white",
  fontWeight: 900,
};

const resolveBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const openBadge: React.CSSProperties = {
  background: "rgba(239,68,68,0.25)",
  border: "1px solid rgba(239,68,68,0.35)",
  padding: "5px 10px",
  borderRadius: 999,
  fontWeight: 900,
};

const resolvedBadge: React.CSSProperties = {
  background: "rgba(16,185,129,0.25)",
  border: "1px solid rgba(16,185,129,0.35)",
  padding: "5px 10px",
  borderRadius: 999,
  fontWeight: 900,
};

function severityBadge(level: string | null) {
  if (level === "danger")
    return {
      background: "rgba(239,68,68,0.25)",
      border: "1px solid rgba(239,68,68,0.35)",
      padding: "5px 10px",
      borderRadius: 999,
      fontWeight: 900,
    };

  if (level === "major")
    return {
      background: "rgba(245,158,11,0.25)",
      border: "1px solid rgba(245,158,11,0.35)",
      padding: "5px 10px",
      borderRadius: 999,
      fontWeight: 900,
    };

  return {
    background: "rgba(59,130,246,0.25)",
    border: "1px solid rgba(59,130,246,0.35)",
    padding: "5px 10px",
    borderRadius: 999,
    fontWeight: 900,
  };
}