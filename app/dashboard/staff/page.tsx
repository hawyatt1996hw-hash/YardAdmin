"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import s from "../_components/shell.module.css";

type Staff = {
  id: string;
  full_name: string | null;
  role: string;
  disabled: boolean | null;
};

export default function StaffPage() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,role,disabled")
      .order("full_name");

    if (!error && data) setRows(data as any);
    setLoading(false);
  }

  async function toggleDisabled(id: string, disabled: boolean | null) {
    await supabase
      .from("profiles")
      .update({ disabled: !disabled })
      .eq("id", id);

    load();
  }

  async function toggleAdmin(id: string, role: string) {
    const newRole = role === "admin" ? "staff" : "admin";

    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);

    load();
  }

  return (
    <div className={`${s.panel} ${s.panelPad}`}>
      <div className={s.h1}>Staff Accounts</div>
      <div className={s.muted}>Manage workforce access.</div>

      <div style={{ height: 20 }} />

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Admin</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={s.rowHover}>
                <td style={{ fontWeight: 900 }}>{r.full_name ?? "Unknown"}</td>

                <td>{r.role}</td>

                <td>
                  {r.disabled ? (
                    <span style={{ color: "#ef4444", fontWeight: 900 }}>
                      Disabled
                    </span>
                  ) : (
                    <span style={{ color: "#10b981", fontWeight: 900 }}>
                      Active
                    </span>
                  )}
                </td>

                <td style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => toggleDisabled(r.id, r.disabled)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      fontWeight: 900,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {r.disabled ? "Enable" : "Disable"}
                  </button>

                  <button
                    onClick={() => toggleAdmin(r.id, r.role)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      fontWeight: 900,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {r.role === "admin" ? "Remove Admin" : "Make Admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}