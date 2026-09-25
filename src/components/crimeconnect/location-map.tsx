import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

function ClickPicker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

export default function LocationMap({ lat, lng, onPick, height = 260 }: { lat: number; lng: number; onPick?: (lat: number, lng: number) => void; height?: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} style={{ height, width: "100%" }} className="rounded-lg">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker center={[lat, lng]} radius={11} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.6, weight: 3 }} />
      <Recenter lat={lat} lng={lng} />
      <ClickPicker onPick={onPick} />
    </MapContainer>
  );
}
