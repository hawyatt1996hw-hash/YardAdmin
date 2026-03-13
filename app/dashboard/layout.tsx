"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Shell from "./_components/Shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace("/");
        return;
      }

      // Your schema: profiles.user_id links to auth.users.id
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, active, disabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !profile || profile.disabled || profile.active === false || profile.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setOk(true);
    })();
  }, [router]);

  if (!ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Checking admin access…
      </div>
    );
  }

  return <Shell>{children}</Shell>;
}