import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Vehicle {
  "Vehicle Master": string;
  Column14: number;
}

export function FleetMap() {
  const mapRef = useRef<HTMLDivElement>(null);

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5000/api/vehicles");
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      return response.json();
    },
  });

  useEffect(() => {
    if (mapRef.current) {
      const map = L.map(mapRef.current).setView([15.3647, 75.1240], 13); // Hubli coordinates
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      L.marker([15.3647, 75.1240])
        .addTo(map)
        .bindPopup("Vehicle: W15 KA25AB0542")
        .openPopup();
      return () => {
        map.remove();
      };
    }
  }, []);

  return (
    <div className="fleet-map">
      <h2>Live Tracking</h2>
      <div ref={mapRef} style={{ height: "400px", width: "100%" }}></div>
      <p>{vehicles?.length || 0} vehicles displayed</p>
    </div>
  );
}