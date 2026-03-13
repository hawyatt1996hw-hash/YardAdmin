"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import s from "./shell.module.css";

type Me = { full_name: string | null; role: string | null };

function Icon({ name }: { name: "home" | "map" | "time" | "defect" | "staff" }) {
  const common = { width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 2 };
  switch (name) {
    case "home":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" />
        </svg>
      );
    case "map":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
          <path d="M9 3v15" />
          <path d="M15 6v15" />
        </svg>
      );
    case "time":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      );
    case "defect":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 4.3l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.7l-8-14a2 2 0 0 0-3.4 0z" />
        </svg>
      );
    case "staff":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M17 21a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4" />
          <circle cx="10" cy="9" r="3" />
          <path d="M21 21a4 4 0 0 0-3-3.87" />
          <path d="M17 3.13a3 3 0 0 1 0 5.74" />
        </svg>
      );
  }
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,role")
        .eq("id", user.id)
        .single();

      if (!error && data) setMe(data as any);
    })();
  }, [router]);

  const nav = useMemo(() => {
  return [
    { href: "/dashboard", label: "Dashboard", icon: "home" as const },
    { href: "/dashboard/map", label: "Live Map", icon: "map" as const },
    { href: "/dashboard/timesheets", label: "Timesheets", icon: "time" as const },
    { href: "/dashboard/defects", label: "Defects", icon: "defect" as const },
    { href: "/dashboard/staff", label: "Staff", icon: "staff" as const },
    { href: "/dashboard/settings", label: "Settings", icon: "home" as const }, // simple icon reuse
  ];
}, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className={s.wrap}>
      <div className={s.bgGlow} />

      <aside className={s.sidebar}>
        <div className={s.brand}>
          <div className={s.brandMark}>FD</div>
          <div>
            <div className={s.brandName}>Fleetwide Digital</div>
            <div className={s.brandSub}>Workforce Admin</div>
          </div>
        </div>

        <nav className={s.nav}>
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`${s.navItem} ${active ? s.navItemActive : ""}`}
              >
                <span className={s.navIcon}><Icon name={n.icon} /></span>
                <span className={s.navLabel}>{n.label}</span>
                {active ? <span className={s.activePill} /> : null}
              </Link>
            );
          })}
        </nav>

        <div className={s.me}>
          <div className={s.meAvatar}>
            {(me?.full_name?.trim()?.[0] ?? "A").toUpperCase()}
          </div>
          <div className={s.meMeta}>
            <div className={s.meName}>{me?.full_name ?? "Admin"}</div>
            <div className={s.meRole}>{me?.role ?? "admin"}</div>
          </div>
          <button onClick={signOut} className={s.btnGhost}>
            Sign out
          </button>
        </div>
      </aside>

      <main className={s.main}>
        <div className={s.content}>
          {children}
        </div>
      </main>
    </div>
  );
}