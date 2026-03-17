"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type TimeEntry = {
  id: string;
  user_id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  status: string | null;
  outside_yard: boolean | null;
  profiles?: Array<{
    full_name: string | null;
  }> | null;
};

export default function TimesheetsPage() {
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);
    setErrorText("");

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();

      if (authErr || !authData.user) {
        setErrorText("You must be signed in.");
        return;
      }

      const userId = authData.user.id;

      const { data: myProfile, error: myProfileErr } = await supabase
        .from("profiles")
        .select("company_id, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (myProfileErr || !myProfile?.company_id) {
        setErrorText("Could not load your company.");
        return;
      }

      if (myProfile.role !== "admin") {
        setErrorText("Admin access only.");
        return;
      }

      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id,
          user_id,
          clock_in_at,
          clock_out_at,
          status,
          outside_yard,
          profiles (
            full_name
          )
        `)
        .eq("company_id", myProfile.company_id)
        .order("clock_in_at", { ascending: false });

      if (error) {
        setErrorText(error.message);
        return;
      }

      setRows((data as TimeEntry[]) ?? []);
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const name = r.profiles?.[0]?.full_name?.toLowerCase() ?? "";
      return name.includes(q);
    });
  }, [rows, search]);

  function formatDateTime(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  }

  function formatDuration(start: string | null, end: string | null) {
    if (!start || !end) return "—";

    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms <= 0) return "—";

    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Timesheets</h1>
          <p style={styles.subtitle}>Review clock-ins, clock-outs, and outside-yard warnings.</p>
        </div>

        <button onClick={loadRows} style={styles.refreshButton}>
          Refresh
        </button>
      </div>

      <div style={styles.toolbar}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search worker name..."
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.messageBox}>Loading timesheets...</div>
      ) : errorText ? (
        <div style={styles.errorBox}>{errorText}</div>
      ) : filteredRows.length === 0 ? (
        <div style={styles.messageBox}>No timesheets found.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Worker</th>
                <th style={styles.th}>Clock In</th>
                <th style={styles.th}>Clock Out</th>
                <th style={styles.th}>Duration</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.profiles?.[0]?.full_name ?? "Unnamed"}</td>
                  <td style={styles.td}>{formatDateTime(row.clock_in_at)}</td>
                  <td style={styles.td}>{formatDateTime(row.clock_out_at)}</td>
                  <td style={styles.td}>{formatDuration(row.clock_in_at, row.clock_out_at)}</td>
                  <td style={styles.td}>{row.status ?? "—"}</td>
                  <td style={styles.td}>
                    {row.outside_yard ? (
                      <span style={styles.warningBadge}>Outside Yard</span>
                    ) : (
                      <span style={styles.okBadge}>OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 900,
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 15,
  },
  refreshButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  toolbar: {
    marginBottom: 16,
  },
  searchInput: {
    width: 320,
    maxWidth: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: 14,
  },
  tableWrap: {
    background: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    background: "#eff6ff",
    color: "#1e3a8a",
    fontSize: 13,
    fontWeight: 900,
    borderBottom: "1px solid #dbeafe",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: 14,
    verticalAlign: "middle",
  },
  warningBadge: {
    display: "inline-block",
    background: "#fef3c7",
    color: "#92400e",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
  },
  okBadge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
  },
  messageBox: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 18,
    color: "#334155",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 16,
    padding: 18,
    color: "#b91c1c",
    fontWeight: 700,
  },
};