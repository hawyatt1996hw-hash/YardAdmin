"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    if (!email.trim() || !password) {
      alert("Enter email and password");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.user) {
        alert(`Login failed: ${error?.message ?? "No user returned"}`);
        return;
      }

      const uid = data.user.id;

      // ✅ Your schema links via profiles.user_id
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("role, active, disabled, full_name")
        .eq("user_id", uid)
        .maybeSingle();

      if (pErr) {
        alert(`Profile query error: ${pErr.message}`);
        await supabase.auth.signOut();
        return;
      }

      if (!profile) {
        alert(
          "No profile row found for this user.\n\n" +
            "Fix: create a profiles row where user_id = auth.users.id"
        );
        await supabase.auth.signOut();
        return;
      }

      if (profile.disabled || profile.active === false) {
        alert("Account disabled/inactive.");
        await supabase.auth.signOut();
        return;
      }

      if (profile.role !== "admin") {
        alert("Not an admin account.");
        await supabase.auth.signOut();
        return;
      }

      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
        <h1 className="text-2xl font-extrabold">YardClock Admin</h1>

        <input
          className="w-full border p-3 rounded-lg outline-none"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded-lg outline-none"
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          disabled={busy}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Login"}
        </button>
      </div>
    </div>
  );
}