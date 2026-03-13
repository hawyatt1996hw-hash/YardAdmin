"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import s from "../_components/shell.module.css";

type LocationRow = {
  user_id: string;
  lat: number;
  lng: number;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

const MapComponent = dynamic(() => import("./_map"), { ssr: false });

export default function MapPage() {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("staff_locations")
      .select("user_id,lat,lng,created_at,profiles(full_name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }

    // Keep latest per user
    const locationMap = new Map<string, LocationRow>();
    for (const r of data as any[]) {
      if (!locationMap.has(r.user_id)) locationMap.set(r.user_id, r as LocationRow);
    }
    setRows(Array.from(locationMap.values()));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const center = useMemo(() => {
    if (rows.length === 0) return { lat: 51.5074, lng: -0.1278 }; // fallback London
    return { lat: rows[0].lat, lng: rows[0].lng };
  }, [rows]);

  const names = useMemo(() => {
    const nameMap: Record<string, string> = {};
    for (const row of rows) {
      nameMap[row.user_id] = row.profiles?.full_name || "Unknown";
    }
    return nameMap;
  }, [rows]);

  return (
    <div className={`${s.card} ${s.cardPad}`}>
      <div className={s.h1}>Live Map</div>
      <div className={s.muted}>Shows the most recent location per user.</div>

      <div style={{ height: 18 }} />

      {loading ? (
        <div style={{ fontWeight: 800, color: "rgba(15,23,42,0.7)" }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontWeight: 800, color: "rgba(15,23,42,0.7)" }}>
          No location rows yet. (Users must be clocked in and sending locations.)
        </div>
      ) : (
        <div style={{ height: 520, borderRadius: 16, overflow: "hidden" }}>
          <MapComponent center={center} points={rows} />
        </div>
      )}
    </div>
  );
}