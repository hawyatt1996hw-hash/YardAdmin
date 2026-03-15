"use client";

import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

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
    <div className="min-h-screen bg-gradient-to-br from-[#0b2f8a] via-[#1146c2] to-[#0a1f52] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
          <div className="hidden flex-col justify-between bg-white/5 p-10 lg:flex">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <ShieldCheck className="h-6 w-6" />
                <span className="text-sm font-semibold tracking-wide text-white/90">
                  Fleetwide Digital
                </span>
              </div>

              <h1 className="max-w-md text-4xl font-black leading-tight">
                YardClock Admin
              </h1>

              <p className="mt-4 max-w-md text-base leading-7 text-white/75">
                Manage live staff locations, timesheets, defects, and workforce access
                from one dashboard.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-sm font-semibold text-white">Live visibility</p>
                <p className="mt-1 text-sm text-white/70">
                  See who is clocked in, where they are, and what needs attention.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-sm font-semibold text-white">Operational control</p>
                <p className="mt-1 text-sm text-white/70">
                  Review staff, defects, timesheets, and account access in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 lg:hidden">
                <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-bold">YardClock Admin</span>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                  Sign in
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Use your admin account to access the dashboard.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="you@company.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") login();
                    }}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-800"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {errorText ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorText}
                  </div>
                ) : null}

                <button
                  onClick={login}
                  disabled={busy}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Signing in..." : "Sign in to dashboard"}
                </button>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-5">
                <p className="text-xs leading-6 text-slate-500">
                  Admin access only. Staff accounts without admin permissions will be
                  blocked automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
