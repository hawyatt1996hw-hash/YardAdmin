"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import s from "../_components/shell.module.css";

type VehicleCheck = {
  id: string;
  user_id: string | null;
  vehicle_reg: string | null;
  defects_found: boolean | null;
  notes: string | null;
  resolved: boolean | null;
  created_at: string | null;
  company_id: string | null;
};

type Profile = {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
  role: string | null;
};

type AnswerRow = {
  check_id: string;
  ok: boolean | null;
  comment: string | null;
  vehicle_check_items?: {
    label: string | null;
  } | null;
};

type DefectRow = {
  id: string;
  vehicle_reg: string | null;
  driver_name: string;
  defect_text: string;
  severity: "minor" | "major";
  resolved: boolean;
  created_at: string | null;
};

export default function DefectsPage() {
  const [rows, setRows] = useState<DefectRow[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
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

      const { data: checksData, error: checksErr } = await supabase
        .from("vehicle_checks")
        .select("id,user_id,vehicle_reg,defects_found,notes,resolved,created_at,company_id")
        .eq("company_id", companyId)
        .eq("defects_found", true)
        .order("created_at", { ascending: false });

      if (checksErr) {
        setErrorText(checksErr.message);
        return;
      }

      const checks = (checksData ?? []) as VehicleCheck[];

      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("user_id,full_name,email,company_id,role")
        .eq("company_id", companyId);

      if (profilesErr) {
        setErrorText(profilesErr.message);
        return;
      }

      const profileMap = new Map<string, Profile>();
      for (const p of (profilesData ?? []) as Profile[]) {
        if (p.user_id) profileMap.set(p.user_id, p);
      }

      const checkIds = checks.map((c) => c.id);

      let answers: AnswerRow[] = [];
      if (checkIds.length > 0) {
        const { data: ansData, error: ansErr } = await supabase
          .from("vehicle_check_answers")
          .select("check_id,ok,comment,vehicle_check_items(label)")
          .in("check_id", checkIds)
          .eq("ok", false);

        if (ansErr) {
          setErrorText(ansErr.message);
          return;
        }

        answers = (ansData ?? []) as unknown as AnswerRow[];
      }

      const answersByCheck = new Map<string, AnswerRow[]>();
      for (const a of answers) {
        const arr = answersByCheck.get(a.check_id) ?? [];
        arr.push(a);
        answersByCheck.set(a.check_id, arr);
      }

      const built: DefectRow[] = checks.map((check) => {
        const profile = check.user_id ? profileMap.get(check.user_id) : null;
        const failedAnswers = answersByCheck.get(check.id) ?? [];

        const answerLines = failedAnswers.map((a) => {
          const label = a.vehicle_check_items?.label?.trim() || "Checklist item";
          const comment = a.comment?.trim();
          return comment ? `${label}: ${comment}` : `${label}: Not OK`;
        });

        const notes = check.notes?.trim();
        const allText = [...answerLines, ...(notes ? [notes] : [])].join(" • ");

        return {
          id: check.id,
          vehicle_reg: check.vehicle_reg,
          driver_name:
            profile?.full_name?.trim() ||
            profile?.email?.trim() ||
            check.user_id ||
            "Unknown user",
          defect_text: allText || "Defect recorded",
          severity: failedAnswers.length >= 2 ? "major" : "minor",
          resolved: check.resolved === true,
          created_at: check.created_at,
        };
      });

      setRows(built);
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function resolve(id: string) {
    await supabase.from("vehicle_checks").update({ resolved: true }).eq("id", id);
    load();
  }

  function formatTime(t: string | null) {
    if (!t) return "-";
    return new Date(t).toLocaleString();
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "open" && r.resolved) return false;
      if (filter === "resolved" && !r.resolved) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return (
        (r.vehicle_reg ?? "").toLowerCase().includes(q) ||
        r.driver_name.toLowerCase().includes(q) ||
        r.defect_text.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  return (
    <div className={`${s.panel} ${s.panelPad}`}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className={s.h1}>Vehicle Defects</div>
          <div className={s.muted}>Manage fleet safety reports.</div>
        </div>

        <input
          placeholder="Search vehicle, driver or defect"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchBox}
        />
      </div>

      <div style={{ height: 16 }} />

      <div style={{ display: "flex", gap: 10 }}>
        <FilterBtn label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterBtn label="Open" active={filter === "open"} onClick={() => setFilter("open")} />
        <FilterBtn label="Resolved" active={filter === "resolved"} onClick={() => setFilter("resolved")} />
      </div>

      <div style={{ height: 16 }} />

      {loading ? (
        <div className={s.muted}>Loading defects...</div>
      ) : errorText ? (
        <div style={errorBox}>{errorText}</div>
      ) : filtered.length === 0 ? (
        <div className={s.muted}>No defects found.</div>
      ) : (
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
                <td style={{ fontWeight: 900 }}>{r.vehicle_reg ?? "-"}</td>

                <td>{r.driver_name}</td>

                <td style={{ maxWidth: 350 }}>{r.defect_text}</td>

                <td>
                  <span style={severityBadge(r.severity)}>{r.severity}</span>
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
                    <button onClick={() => resolve(r.id)} style={resolveBtn}>
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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

const errorBox: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fff",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: 800,
};

function severityBadge(level: string | null) {
  if (level === "danger") {
    return {
      background: "rgba(239,68,68,0.25)",
      border: "1px solid rgba(239,68,68,0.35)",
      padding: "5px 10px",
      borderRadius: 999,
      fontWeight: 900,
    };
  }

  if (level === "major") {
    return {
      background: "rgba(245,158,11,0.25)",
      border: "1px solid rgba(245,158,11,0.35)",
      padding: "5px 10px",
      borderRadius: 999,
      fontWeight: 900,
    };
  }

  return {
    background: "rgba(59,130,246,0.25)",
    border: "1px solid rgba(59,130,246,0.35)",
    padding: "5px 10px",
    borderRadius: 999,
    fontWeight: 900,
  };
}