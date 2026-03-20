"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import s from "../_components/shell.module.css";

type Profile = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  utr: string | null;
  driving_licence_number: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  role: string | null;
  disabled: boolean | null;
  company_id: string | null;
};

type EditForm = {
  full_name: string;
  email: string;
  phone: string;
  utr: string;
  driving_licence_number: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
};

function makeForm(p: Profile): EditForm {
  return {
    full_name: p.full_name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    utr: p.utr ?? "",
    driving_licence_number: p.driving_licence_number ?? "",
    next_of_kin_name: p.next_of_kin_name ?? "",
    next_of_kin_phone: p.next_of_kin_phone ?? "",
  };
}

export default function StaffPage() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Profile | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

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

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          utr,
          driving_licence_number,
          next_of_kin_name,
          next_of_kin_phone,
          role,
          disabled,
          company_id
        `)
        .eq("company_id", myProfile.company_id)
        .order("full_name", { ascending: true });

      if (error) {
        setErrorText(error.message);
        return;
      }

      setRows((data as Profile[]) ?? []);
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openProfile(row: Profile) {
    setSelected(row);
    setForm(makeForm(row));
  }

  async function saveProfile() {
    if (!selected || !form) return;

    setSaving(true);
    setErrorText("");

    try {
      const payload = {
        full_name: form.full_name.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        phone: form.phone.trim() || null,
        utr: form.utr.trim() || null,
        driving_licence_number: form.driving_licence_number.trim() || null,
        next_of_kin_name: form.next_of_kin_name.trim() || null,
        next_of_kin_phone: form.next_of_kin_phone.trim() || null,
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", selected.id)
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          utr,
          driving_licence_number,
          next_of_kin_name,
          next_of_kin_phone,
          role,
          disabled,
          company_id
        `)
        .maybeSingle();

      if (error) {
        setErrorText(error.message);
        return;
      }

      if (!data) {
        setErrorText("No row was updated.");
        return;
      }

      const updated = data as Profile;

      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelected(updated);
      setForm(makeForm(updated));
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleDisabled(row: Profile) {
    const { error } = await supabase
      .from("profiles")
      .update({ disabled: !(row.disabled === true) })
      .eq("id", row.id);

    if (error) {
      setErrorText(error.message);
      return;
    }

    loadRows();

    if (selected?.id === row.id) {
      setSelected({
        ...selected,
        disabled: !(row.disabled === true),
      });
    }
  }

  async function toggleAdmin(row: Profile) {
    const nextRole = row.role === "admin" ? "staff" : "admin";

    const { error } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", row.id);

    if (error) {
      setErrorText(error.message);
      return;
    }

    loadRows();

    if (selected?.id === row.id) {
      setSelected({
        ...selected,
        role: nextRole,
      });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      return (
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <div className={`${s.panel} ${s.panelPad}`}>
      <div style={headerRow}>
        <div>
          <div className={s.h1}>Staff</div>
          <div className={s.muted}>Click a staff member to view and edit details.</div>
        </div>

        <input
          placeholder="Search name, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchBox}
        />
      </div>

      <div style={{ height: 16 }} />

      {loading ? (
        <div className={s.muted}>Loading staff...</div>
      ) : errorText ? (
        <div style={errorBox}>{errorText}</div>
      ) : filtered.length === 0 ? (
        <div className={s.muted}>No staff found.</div>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={s.rowHover}
                style={{ cursor: "pointer" }}
                onClick={() => openProfile(row)}
              >
                <td style={{ fontWeight: 900 }}>{row.full_name || "Unnamed"}</td>
                <td>{row.email || "-"}</td>
                <td>{row.phone || "-"}</td>
                <td>{row.role || "-"}</td>
                <td>
                  {row.disabled ? (
                    <span style={disabledBadge}>Disabled</span>
                  ) : (
                    <span style={enabledBadge}>Enabled</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && form && (
        <div style={modalOverlay} onClick={() => setSelected(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={modalTitle}>{selected.full_name || "Staff Member"}</div>
                <div className={s.muted}>View and edit staff details</div>
              </div>
              <button onClick={() => setSelected(null)} style={closeBtn}>
                Close
              </button>
            </div>

            <div style={{ height: 14 }} />

            <div style={buttonRow}>
              <button
                onClick={() => toggleDisabled(selected)}
                style={actionBtn}
              >
                {selected.disabled ? "Enable Account" : "Disable Account"}
              </button>

              <button
                onClick={() => toggleAdmin(selected)}
                style={actionBtn}
              >
                {selected.role === "admin" ? "Demote to Staff" : "Promote to Admin"}
              </button>
            </div>

            <div style={{ height: 18 }} />

            <div style={formGrid}>
              <div>
                <label style={label}>Full name</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  style={input}
                />
              </div>

              <div>
                <label style={label}>Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={input}
                />
              </div>

              <div>
                <label style={label}>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={input}
                />
              </div>

              <div>
                <label style={label}>UTR</label>
                <input
                  value={form.utr}
                  onChange={(e) => setForm({ ...form, utr: e.target.value })}
                  style={input}
                />
              </div>

              <div>
                <label style={label}>Driving licence number</label>
                <input
                  value={form.driving_licence_number}
                  onChange={(e) => setForm({ ...form, driving_licence_number: e.target.value })}
                  style={input}
                />
              </div>

              <div>
                <label style={label}>Next of kin name</label>
                <input
                  value={form.next_of_kin_name}
                  onChange={(e) => setForm({ ...form, next_of_kin_name: e.target.value })}
                  style={input}
                />
              </div>

              <div>
                <label style={label}>Next of kin phone</label>
                <input
                  value={form.next_of_kin_phone}
                  onChange={(e) => setForm({ ...form, next_of_kin_phone: e.target.value })}
                  style={input}
                />
              </div>
            </div>

            {errorText ? <div style={{ ...errorBox, marginTop: 16 }}>{errorText}</div> : null}

            <div style={{ height: 18 }} />

            <div style={footerRow}>
              <button onClick={saveProfile} style={saveBtn} disabled={saving}>
                {saving ? "Saving..." : "Save Details"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
};

const searchBox: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.18)",
  color: "white",
  fontWeight: 900,
};

const enabledBadge: React.CSSProperties = {
  background: "rgba(16,185,129,0.25)",
  border: "1px solid rgba(16,185,129,0.35)",
  padding: "5px 10px",
  borderRadius: 999,
  fontWeight: 900,
};

const disabledBadge: React.CSSProperties = {
  background: "rgba(239,68,68,0.25)",
  border: "1px solid rgba(239,68,68,0.35)",
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

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 50,
};

const modalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 900,
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 20,
  color: "white",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const modalTitle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
};

const closeBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const actionBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "#334155",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const label: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 900,
  color: "#e2e8f0",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontWeight: 700,
};

const footerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const saveBtn: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};