import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "./VehicleTable.css";

interface Vehicle {
  "Vehicle Master": string;
  Column3: number;      // Ward No
  Column4: string;      // City
  Column7: string;      // Parking Yard
  Column15?: number;    // Mileage
}

export function VehicleTable() {
  const [cityFilter, setCityFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [yardFilter, setYardFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await fetch("http://localhost:5000/api/vehicles");
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  const vehicleData = vehicles?.slice(1) || [];

  const filteredVehicles = vehicleData.filter((v) => {
    const matchesSearch = v["Vehicle Master"]
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCity = cityFilter === "" || v.Column4 === cityFilter;
    const matchesWard = wardFilter === "" || v.Column3.toString() === wardFilter;
    const matchesYard = yardFilter === "" || v.Column7 === yardFilter;

    return matchesSearch && matchesCity && matchesWard && matchesYard;
  });

  const uniqueCities = [...new Set(vehicleData.map((v) => v.Column4))].sort();
  const uniqueWards = [...new Set(vehicleData.map((v) => v.Column3))].sort((a, b) => a - b);
  const uniqueYards = [...new Set(vehicleData.map((v) => v.Column7))].sort();

  return (
    <div className="vehicle-table">
      <h2>Vehicle Management</h2>
      <p>Manage vehicle details and assignments</p>

      <input
        type="text"
        placeholder="Search by Vehicle Number"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-bar"
      />

      <div className="filters">
        <select onChange={(e) => setCityFilter(e.target.value)} value={cityFilter}>
          <option value="">All Cities</option>
          {uniqueCities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select onChange={(e) => setWardFilter(e.target.value)} value={wardFilter}>
          <option value="">All Wards</option>
          {uniqueWards.map((ward) => (
            <option key={ward} value={ward}>{ward}</option>
          ))}
        </select>

        <select onChange={(e) => setYardFilter(e.target.value)} value={yardFilter}>
          <option value="">All Parking Yards</option>
          {uniqueYards.map((yard) => (
            <option key={yard} value={yard}>{yard}</option>
          ))}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Vehicle No</th>
            <th>Ward No</th>
            <th>City</th>
            <th>Parking Yard</th>
            <th>Mileage (km/L)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredVehicles.map((v, index) => (
            <tr key={index}>
              <td>{v["Vehicle Master"]}</td>
              <td>{v.Column3}</td>
              <td>{v.Column4}</td>
              <td>{v.Column7}</td>
              <td>{v.Column15 ?? "—"}</td>
              <td>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default VehicleTable;