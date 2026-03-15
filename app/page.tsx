"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function login() {
    if (!email.trim() || !password) {
      setErrorText("Enter your email and password.");
      return;
    }

    setBusy(true);
    setErrorText("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.user) {
        setErrorText(error?.message ?? "Login failed.");
        return;
      }

      const uid = data.user.id;

      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("role, active, disabled, full_name")
        .eq("user_id", uid)
        .maybeSingle();

      if (pErr) {
        setErrorText(`Profile query error: ${pErr.message}`);
        await supabase.auth.signOut();
        return;
      }

      if (!profile) {
        setErrorText("No profile record found for this account.");
        await supabase.auth.signOut();
        return;
      }

      if (profile.disabled || profile.active === false) {
        setErrorText("This account has been disabled.");
        await supabase.auth.signOut();
        return;
      }

      if (profile.role !== "admin") {
        setErrorText("This account does not have admin access.");
        await supabase.auth.signOut();
        return;
      }

      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.overlay}>
        <div className={styles.panel}>
          <div className={styles.left}>
            <div className={styles.brand}>
              <div className={styles.brandIcon}>🛡️</div>
              <div>
                <div className={styles.brandTop}>Fleetwide Digital</div>
                <div className={styles.brandName}>YardClock Admin</div>
              </div>
            </div>

            <h1 className={styles.heading}>Run your workforce from one dashboard.</h1>

            <p className={styles.subtitle}>
              Manage live staff locations, timesheets, defects, and account access
              in one place.
            </p>

            <div className={styles.featureList}>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Live visibility</div>
                <div className={styles.featureText}>
                  See who is clocked in, where they are, and what needs attention.
                </div>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Operational control</div>
                <div className={styles.featureText}>
                  Review staff, defects, timesheets, and account access quickly.
                </div>
              </div>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.formWrap}>
              <div className={styles.mobileBrand}>YardClock Admin</div>

              <h2 className={styles.formTitle}>Sign in</h2>
              <p className={styles.formSubtitle}>
                Use your admin account to access the dashboard.
              </p>

              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input
                  className={styles.input}
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") login();
                  }}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Password</label>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.input}
                    placeholder="Enter password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") login();
                    }}
                  />
                  <button
                    type="button"
                    className={styles.showButton}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

              <button className={styles.submitButton} onClick={login} disabled={busy}>
                {busy ? "Signing in..." : "Sign in to dashboard"}
              </button>

              <div className={styles.footerText}>
                Admin access only. Staff accounts without admin permissions will be
                blocked automatically.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
