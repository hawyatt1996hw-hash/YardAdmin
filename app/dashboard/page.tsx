"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import s from "./_components/shell.module.css";

type TimeEntry = {
  id: string;
  user_id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  status: string | null;
  company_id: string | null;
};

type VehicleCheck = {
  id: string;
  user_id: string | null;
  vehicle_reg: string | null;
  defects_found: boolean | null;
  resolved: boolean | null;
  created_at: string | null;
  company_id: string | null;
  notes: string | null;
};

type StaffLocation = {
  id?: string;
  user_id: string;
  lat: number;
  lng: number;
  created_at: string;
  company_id: string | null;
};

type Profile = {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
  role: string | null;
};

type DashboardTimeRow = TimeEntry & {
  worker_name: string;
};

type DashboardDefectRow = {
  id: string;
  vehicle_reg: string | null;
  driver_name: string;
  defect_text: string;
  resolved: boolean;
  created_at: string | null;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [clockedInNow, setClockedInNow] = useState(0);
  const [openDefects, setOpenDefects] = useState(0);
  const [checksToday, setChecksToday] = useState(0);
  const [hoursToday, setHoursToday] = useState(0);

  const [recentTimesheets, setRecentTimesheets] = useState<DashboardTimeRow[]>([]);
  const [latestDefects, setLatestDefects] = useState<DashboardDefectRow[]>([]);
  const [locationCount, setLocationCount] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setErrorText("");

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();

      if (authErr || !authData.user) {
        setErrorText("You must be signed in.");
        return;
      }

      const myUserId = authData.user.id;

      const { data: myProfile, error: myProfileErr } = await supabase
        .from("profiles")
        .select("company_id, role")
        .eq("user_id", myUserId)
        .maybeSingle();

      if (myProfileErr || !myProfile?.company_id) {
        setErrorText("Could not load your company.");
        return;
      }

      if (myProfile.role !== "admin") {
        setErrorText("Admin access only.");
        return;
      }

      const companyId = myProfile.company_id;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const [
        timeEntriesRes,
        profilesRes,
        checksRes,
        locationsRes,
      ] = await Promise.all([
        supabase
          .from("time_entries")
          .select("id,user_id,clock_in_at,clock_out_at,status,company_id")
          .eq("company_id", companyId)
          .order("clock_in_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("user_id,full_name,email,company_id,role")
          .eq("company_id", companyId),

        supabase
          .from("vehicle_checks")
          .select("id,user_id,vehicle_reg,defects_found,resolved,created_at,company_id,notes")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),

        supabase
          .from("staff_locations")
          .select("user_id,lat,lng,created_at,company_id")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
      ]);

      if (timeEntriesRes.error) {
        setErrorText(timeEntriesRes.error.message);
        return;
      }
      if (profilesRes.error) {
        setErrorText(profilesRes.error.message);
        return;
      }
      if (checksRes.error) {
        setErrorText(checksRes.error.message);
        return;
      }
      if (locationsRes.error) {
        setErrorText(locationsRes.error.message);
        return;
      }

      const timeEntries = (timeEntriesRes.data ?? []) as TimeEntry[];
      const profiles = (profilesRes.data ?? []) as Profile[];
      const checks = (checksRes.data ?? []) as VehicleCheck[];
      const locations = (locationsRes.data ?? []) as StaffLocation[];

      const profileMap = new Map<string, Profile>();
      for (const p of profiles) {
        if (p.user_id) profileMap.set(p.user_id, p);
      }

      const mappedTimesheets: DashboardTimeRow[] = timeEntries.map((t) => {
        const p = profileMap.get(t.user_id);

        return {
          ...t,
          worker_name:
            p?.full_name?.trim() ||
            p?.email?.trim() ||
            t.user_id ||
            "Unknown user",
        };
      });

      const checksWithDefects = checks.filter((c) => c.defects_found === true);
      const openDefectsRows = checksWithDefects.filter((c) => c.resolved !== true);

      const mappedDefects: DashboardDefectRow[] = checksWithDefects.slice(0, 5).map((c) => {
        const p = c.user_id ? profileMap.get(c.user_id) : null;

        return {
          id: c.id,
          vehicle_reg: c.vehicle_reg,
          driver_name:
            p?.full_name?.trim() ||
            p?.email?.trim() ||
            c.user_id ||
            "Unknown user",
          defect_text: c.notes?.trim() || "Defect recorded",
          resolved: c.resolved === true,
          created_at: c.created_at,
        };
      });

      const openEntries = timeEntries.filter((t) => !t.clock_out_at);
      const checksTodayCount = checks.filter((c) => (c.created_at ?? "") >= todayIso).length;

      let totalMs = 0;
      for (const t of timeEntries) {
        if (!t.clock_in_at || !t.clock_out_at) continue;
        if (t.clock_in_at < todayIso && t.clock_out_at < todayIso) continue;

        const start = new Date(t.clock_in_at).getTime();
        const end = new Date(t.clock_out_at).getTime();
        if (end > start) totalMs += end - start;
      }

      const totalHoursToday = Math.round((totalMs / 3600000) * 10) / 10;

      setClockedInNow(openEntries.length);
      setOpenDefects(openDefectsRows.length);
      setChecksToday(checksTodayCount);
      setHoursToday(totalHoursToday);
      setRecentTimesheets(mappedTimesheets.slice(0, 5));
      setLatestDefects(mappedDefects);
      setLocationCount(locations.length);
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(value: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  }

  const liveMapText = useMemo(() => {
    if (locationCount === 0) return "No location rows yet.";
    if (locationCount === 1) return "1 live location row.";
    return `${locationCount} live location rows.`;
  }, [locationCount]);

  return (
    <div className={s.pageWrap}>
      {errorText ? (
        <div style={errorBox}>{errorText}</div>
      ) : null}

      <div style={statsGrid}>
        <StatCard title="Clocked In" value={loading ? "..." : String(clockedInNow)} subtitle="Right now" />
        <StatCard title="Open Defects" value={loading ? "..." : String(openDefects)} subtitle="Needs attention" />
        <StatCard title="Checks Today" value={loading ? "..." : String(checksToday)} subtitle="Submitted" />
        <StatCard title="Hours Today" value={loading ? "..." : String(hoursToday)} subtitle="Completed shifts" />
      </div>

      <div style={topGrid}>
        <div className={`${s.panel} ${s.panelPad}`}>
          <div style={cardHeader}>
            <div style={sectionTitle}>Live Map Preview</div>
            <Link href="/dashboard/live-map" style={linkStyle}>Open map →</Link>
          </div>
          <div className={s.muted}>{loading ? "Loading..." : liveMapText}</div>
        </div>

        <div className={`${s.panel} ${s.panelPad}`}>
          <div style={cardHeader}>
            <div style={sectionTitle}>Latest Defects</div>
            <Link href="/dashboard/defects" style={linkStyle}>View all →</Link>
          </div>

          {loading ? (
            <div className={s.muted}>Loading defects...</div>
          ) : latestDefects.length === 0 ? (
            <div className={s.muted}>No defects reported yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {latestDefects.map((d) => (
                <div key={d.id} style={miniItem}>
                  <div style={{ fontWeight: 900 }}>{d.vehicle_reg ?? "-"}</div>
                  <div className={s.muted}>{d.driver_name}</div>
                  <div style={{ fontSize: 14 }}>{d.defect_text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${s.panel} ${s.panelPad}`}>
        <div style={cardHeader}>
          <div style={sectionTitle}>Recent Timesheets</div>
          <Link href="/dashboard/timesheets" style={linkStyle}>View all →</Link>
        </div>

        {loading ? (
          <div className={s.muted}>Loading timesheets...</div>
        ) : recentTimesheets.length === 0 ? (
          <div className={s.muted}>No timesheets yet.</div>
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
              {recentTimesheets.map((r) => (
                <tr key={r.id} className={s.rowHover}>
                  <td style={{ fontWeight: 900 }}>{r.worker_name}</td>
                  <td>{formatDateTime(r.clock_in_at)}</td>
                  <td>{formatDateTime(r.clock_out_at)}</td>
                  <td>
                    <span style={statusBadge(r.status)}>
                      {r.clock_out_at ? "Completed" : "Open"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className={s.panel} style={statCard}>
      <div style={statTitle}>{title}</div>
      <div style={statValue}>{value}</div>
      <div className={s.muted} style={{ fontWeight: 900 }}>{subtitle}</div>
    </div>
  );
}

function statusBadge(status: string | null) {
  const closed = status === "clocked_out";
  return {
    background: closed ? "rgba(59,130,246,0.22)" : "rgba(245,158,11,0.22)",
    border: closed ? "1px solid rgba(59,130,246,0.34)" : "1px solid rgba(245,158,11,0.34)",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 900,
    display: "inline-block",
  } as React.CSSProperties;
}

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 18,
};

const topGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 1fr",
  gap: 16,
  marginBottom: 18,
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const linkStyle: React.CSSProperties = {
  color: "white",
  textDecoration: "none",
  fontWeight: 900,
  opacity: 0.9,
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 18,
};

const statCard: React.CSSProperties = {
  padding: 18,
};

const statTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 16,
  marginBottom: 10,
};

const statValue: React.CSSProperties = {
  fontSize: 46,
  fontWeight: 900,
  lineHeight: 1,
  marginBottom: 8,
};

const miniItem: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const errorBox: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fff",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: 800,
  marginBottom: 16,
};