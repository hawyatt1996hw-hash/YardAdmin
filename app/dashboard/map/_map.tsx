"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

type LocationRow = {
  user_id: string;
  lat: number;
  lng: number;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

type Props = {
  center: { lat: number; lng: number };
  points: LocationRow[];
};

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function LeafletMap({ center, points }: Props) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map((p) => (
        <Marker key={p.user_id} icon={DefaultIcon} position={[p.lat, p.lng]}>
          <Popup>
            <div style={{ fontWeight: 900 }}>
              {p.profiles?.full_name ?? p.user_id}
            </div>
            <div style={{ marginTop: 6 }}>
              {new Date(p.created_at).toLocaleString()}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}