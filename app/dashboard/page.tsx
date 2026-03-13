"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import s from "./_components/shell.module.css";

type TimeRow = {
  id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  profiles?: { full_name: string | null }[] | null;
};

type DefectRow = {
  id: string;
  vehicle_reg: string | null;
  created_at: string | null;
  resolved: boolean | null;
  severity: string | null;
  defect_text: string | null;
  profiles?: { full_name: string | null }[] | null;
};

type LocationRow = {
  user_id: string;
  lat: number;
  lng: number;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

const MiniMap = dynamic(() => import("./map/_map"), { ssr: false });

function formatTime(t: string | null) {
  if (!t) return "-";
  return new Date(t).toLocaleString();
}

function hoursBetween(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!isFinite(a) || !isFinite(b) || b <= a) return 0;
  return (b - a) / (1000 * 60 * 60);
}

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);

  const [clockedIn, setClockedIn] = useState(0);
  const [openDefects, setOpenDefects] = useState(0);
  const [checksToday, setChecksToday] = useState(0);
  const [hoursToday, setHoursToday] = useState(0);

  const [recentTimes, setRecentTimes] = useState<TimeRow[]>([]);
  const [recentDefects, setRecentDefects] = useState<DefectRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
  }, []);

  async function loadAll() {
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // 1) Clocked in count
    const { data: active } = await supabase
      .from("time_entries")
      .select("id")
      .is("clock_out_at", null);

    setClockedIn(active?.length ?? 0);

    // 2) Open defects count
    const { data: defects } = await supabase
      .from("vehicle_checks")
      .select("id")
      .eq("defects_found", true)
      .eq("resolved", false);

    setOpenDefects(defects?.length ?? 0);

    // 3) Vehicle checks today count
    const { data: checks } = await supabase
      .from("vehicle_checks")
      .select("id")
      .gte("checked_at", todayIso);

    setChecksToday(checks?.length ?? 0);

    // 4) Hours today (completed shifts that started today)
    const { data: todayTimes } = await supabase
      .from("time_entries")
      .select("clock_in_at,clock_out_at")
      .gte("clock_in_at", todayIso);

    const total = (todayTimes ?? []).reduce((sum: number, r: any) => {
      return sum + hoursBetween(r.clock_in_at ?? null, r.clock_out_at ?? null);
    }, 0);

    setHoursToday(Math.round(total * 10) / 10);

    // 5) Recent timesheets
    const { data: recentT } = await supabase
      .from("time_entries")
      .select("id,clock_in_at,clock_out_at,profiles(full_name)")
      .order("clock_in_at", { ascending: false })
      .limit(8);

    setRecentTimes((recentT as any) ?? []);

    // 6) Recent defects (latest)
    const { data: recentD } = await supabase
      .from("vehicle_checks")
      .select("id,vehicle_reg,created_at,resolved,severity,defect_text,profiles(full_name)")
      .eq("defects_found", true)
      .order("created_at", { ascending: false })
      .limit(6);

    setRecentDefects((recentD as any) ?? []);

    // 7) Latest location per user (mini map)
    const { data: locs } = await supabase
      .from("staff_locations")
      .select("user_id,lat,lng,created_at,profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);

    const map = new Map<string, LocationRow>();
    for (const l of (locs as any[]) ?? []) {
      if (!map.has(l.user_id)) map.set(l.user_id, l as LocationRow);
    }
    setLocations(Array.from(map.values()));

    setLastUpdated(new Date());
    setLoading(false);
  }

  const center = useMemo(() => {
    if (locations.length === 0) return { lat: 51.5074, lng: -0.1278 };
    return { lat: locations[0].lat, lng: locations[0].lng };
  }, [locations]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className={s.h1}>Dashboard</div>
          <div className={s.muted}>
            {loading ? "Updating…" : "Live overview"}{" "}
            {lastUpdated ? `• Last update ${lastUpdated.toLocaleTimeString()}` : ""}
          </div>
        </div>

        <button onClick={loadAll} className={s.signOut}>
          Refresh
        </button>
      </div>

      {/* KPI tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <Kpi title="Clocked In" value={clockedIn} sub="Right now" />
        <Kpi title="Open Defects" value={openDefects} sub="Needs attention" tone="red" />
        <Kpi title="Checks Today" value={checksToday} sub="Submitted" tone="blue" />
        <Kpi title="Hours Today" value={hoursToday} sub="Completed shifts" tone="green" />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 }}>
        {/* Mini map */}
        <div className={s.panel} style={{ overflow: "hidden" }}>
          <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.14)", display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 950 }}>Live Map Preview</div>
            <Link href="/dashboard/map" style={{ fontWeight: 950, opacity: 0.9 }}>
              Open map →
            </Link>
          </div>

          <div style={{ height: 380 }}>
            {locations.length === 0 ? (
              <div style={{ padding: 14, fontWeight: 800, color: "rgba(255,255,255,0.75)" }}>
                No location rows yet.
              </div>
            ) : (
              <MiniMap center={center} points={locations} />
            )}
          </div>
        </div>

        {/* Latest defects */}
        <div className={`${s.panel} ${s.panelPad}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 950 }}>Latest Defects</div>
            <Link href="/dashboard/defects" style={{ fontWeight: 950, opacity: 0.9 }}>
              View all →
            </Link>
          </div>

          <div style={{ height: 12 }} />

          {recentDefects.length === 0 ? (
            <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.75)" }}>
              No defects reported yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {recentDefects.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    background: "rgba(0,0,0,0.18)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 950 }}>
                      {d.vehicle_reg ?? "Vehicle"}{" "}
                      <span style={{ opacity: 0.7, fontWeight: 800 }}>
                        • {d.profiles?.[0]?.full_name ?? "Unknown"}
                      </span>
                    </div>
                    <span style={severityBadge(d.severity)}>{d.severity ?? "minor"}</span>
                  </div>

                  <div style={{ marginTop: 8, color: "rgba(255,255,255,0.78)", fontWeight: 700 }}>
                    {(d.defect_text ?? "").trim() || "No details"}
                  </div>

                  <div style={{ marginTop: 8, fontWeight: 800, color: "rgba(255,255,255,0.72)" }}>
                    {formatTime(d.created_at)} {d.resolved ? "• Resolved" : "• Open"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent timesheets */}
      <div className={`${s.panel} ${s.panelPad}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 950 }}>Recent Timesheets</div>
          <Link href="/dashboard/timesheets" style={{ fontWeight: 950, opacity: 0.9 }}>
            View all →
          </Link>
        </div>

        <div style={{ height: 14 }} />

        {recentTimes.length === 0 ? (
          <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.75)" }}>
            No timesheets yet.
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTimes.map((r) => {
                const name = r.profiles?.[0]?.full_name ?? "Unknown";
                const active = r.clock_out_at === null;
                return (
                  <tr key={r.id} className={s.rowHover}>
                    <td style={{ fontWeight: 950 }}>{name}</td>
                    <td>{formatTime(r.clock_in_at)}</td>
                    <td>{formatTime(r.clock_out_at)}</td>
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

      {/* responsive tweak */}
      <style jsx>{`
        @media (max-width: 1100px) {
          .kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

function Kpi({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: number;
  sub: string;
  tone?: "red" | "blue" | "green";
}) {
  const accent =
    tone === "red"
      ? "rgba(239,68,68,0.35)"
      : tone === "green"
      ? "rgba(16,185,129,0.35)"
      : tone === "blue"
      ? "rgba(59,130,246,0.35)"
      : "rgba(255,255,255,0.16)";

  return (
    <div
      className={`${s.panel} ${s.panelPad}`}
      style={{
        border: `1px solid ${accent}`,
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 34, fontWeight: 980, marginTop: 6 }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,0.68)", fontWeight: 800, marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function severityBadge(level: string | null) {
  if (level === "danger")
    return {
      background: "rgba(239,68,68,0.25)",
      border: "1px solid rgba(239,68,68,0.35)",
      padding: "5px 10px",
      borderRadius: 999,
      fontWeight: 950,
    } as React.CSSProperties;

  if (level === "major")
    return {
      background: "rgba(245,158,11,0.25)",
      border: "1px solid rgba(245,158,11,0.35)",
      padding: "5px 10px",
      borderRadius: 999,
      fontWeight: 950,
    } as React.CSSProperties;

  return {
    background: "rgba(59,130,246,0.25)",
    border: "1px solid rgba(59,130,246,0.35)",
    padding: "5px 10px",
    borderRadius: 999,
    fontWeight: 950,
  } as React.CSSProperties;
}

function badge(kind: "green" | "blue") {
  const bg = kind === "green" ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.25)";
  const border = kind === "green" ? "rgba(16,185,129,0.35)" : "rgba(59,130,246,0.35)";
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 950,
    background: bg,
    border: `1px solid ${border}`,
  } as React.CSSProperties;
}