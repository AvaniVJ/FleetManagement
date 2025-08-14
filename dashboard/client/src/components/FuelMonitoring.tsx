import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import "./FuelMonitoring.css";

interface FuelEntry {
  id: number;
  vehicleNo: string;
  fuelAmount: number | null;
  odometerStart: number | null;
  odometerEnd: number | null;
  distanceTraveled: number | null;
  fuelEfficiency: number | null;
  location: string;
  date: string;
}

interface Vehicle {
  "Vehicle Master": string;
}

export function FuelMonitoring() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    vehicleNo: "",
    fuelAmount: "",
    odometerStart: "",
    odometerEnd: "",
    location: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [isOdometerStartReadOnly, setIsOdometerStartReadOnly] = useState(false);

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await fetch("http://localhost:5000/api/vehicles");
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
  });

  const { data: lastFuelEntry, refetch: refetchLastEntry } = useQuery<FuelEntry | null>({
    queryKey: ["/api/fuel/last-entry-before", formData.vehicleNo, formData.date],
    queryFn: async () => {
      if (!formData.vehicleNo || !formData.date) return null;
      const res = await fetch(
        `http://localhost:5000/api/fuel/last-entry-before/${encodeURIComponent(
          formData.vehicleNo
        )}/${formData.date}`
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!formData.vehicleNo && !!formData.date,
  });

  const { data: fuelEntries } = useQuery<FuelEntry[]>({
    queryKey: ["/api/fuel"],
    queryFn: async () => {
      const res = await fetch("http://localhost:5000/api/fuel");
      if (!res.ok) throw new Error("Failed to fetch fuel entries");
      return res.json();
    },
  });

  useEffect(() => {
    if (lastFuelEntry?.odometerEnd != null) {
      setFormData((prev) => ({ ...prev, odometerStart: lastFuelEntry.odometerEnd!.toString() }));
      setIsOdometerStartReadOnly(true);
    } else {
      setFormData((prev) => ({ ...prev, odometerStart: "" }));
      setIsOdometerStartReadOnly(false);
    }
  }, [lastFuelEntry]);

  const mutation = useMutation({
    mutationFn: async (newEntry: Omit<FuelEntry, "id" | "distanceTraveled" | "fuelEfficiency">) => {
      const res = await fetch("http://localhost:5000/api/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
      if (!res.ok) throw new Error("Failed to submit fuel entry");
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/fuel/last-entry-before", formData.vehicleNo, formData.date],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      setFormData((prev) => ({
        ...prev,
        fuelAmount: "",
        odometerStart: "",
        odometerEnd: "",
        location: "",
      }));
      await new Promise((res) => setTimeout(res, 300));
      refetchLastEntry();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fuelAmount = parseFloat(formData.fuelAmount || "0");
    const odometerStart = parseInt(formData.odometerStart);
    const odometerEnd = parseInt(formData.odometerEnd);

    if (
      !formData.vehicleNo ||
      isNaN(odometerStart) ||
      isNaN(odometerEnd) ||
      !formData.location ||
      !formData.date
    ) {
      alert("All fields are required and must be valid.");
      return;
    }

    if (odometerEnd <= odometerStart) {
      alert("Odometer End must be greater than Odometer Start.");
      return;
    }

    mutation.mutate({
      vehicleNo: formData.vehicleNo,
      fuelAmount,
      odometerStart,
      odometerEnd,
      location: formData.location,
      date: formData.date,
    });
  };

  const filteredEntries = (fuelEntries || []).filter((entry) =>
    entry.vehicleNo.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  return (
    <div className="fuel-monitoring">
      <h2>Fuel Monitoring</h2>

      <form onSubmit={handleSubmit}>
        <select
          value={formData.vehicleNo}
          onChange={(e) => setFormData((prev) => ({ ...prev, vehicleNo: e.target.value }))}
          required
        >
          <option value="">Select Vehicle</option>
          {vehicles?.map((v) => (
            <option key={v["Vehicle Master"]} value={v["Vehicle Master"]}>
              {v["Vehicle Master"]}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
          required
        />

        <input
          type="number"
          placeholder="Fuel Amount (L)"
          value={formData.fuelAmount}
          onChange={(e) => setFormData((prev) => ({ ...prev, fuelAmount: e.target.value }))}
        />

        <input
          type="number"
          placeholder="Odometer Start (km)"
          value={formData.odometerStart}
          onChange={(e) => setFormData((prev) => ({ ...prev, odometerStart: e.target.value }))}
          readOnly={isOdometerStartReadOnly}
          required
        />

        <input
          type="number"
          placeholder="Odometer End (km)"
          value={formData.odometerEnd}
          onChange={(e) => setFormData((prev) => ({ ...prev, odometerEnd: e.target.value }))}
          required
        />

        <input
          type="text"
          placeholder="Location"
          value={formData.location}
          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
          required
        />

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting..." : "Submit"}
        </button>
      </form>

      <h3>Recent Fuel Entries</h3>

      <input
        type="text"
        className="vehicle-search"
        placeholder="Search by Vehicle No"
        value={vehicleSearch}
        onChange={(e) => setVehicleSearch(e.target.value)}
      />

      {filteredEntries.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Vehicle No</th>
              <th>Fuel Amount (L)</th>
              <th>Distance (km)</th>
              <th>Efficiency (km/L)</th>
              <th>Location</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.vehicleNo}</td>
                <td>{entry.fuelAmount?.toFixed(2) ?? "0.00"}</td>
                <td>{entry.distanceTraveled?.toFixed(2) ?? "—"}</td>
                <td>{entry.fuelEfficiency?.toFixed(2) ?? "—"}</td>
                <td>{entry.location}</td>
                <td>{new Date(entry.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No matching entries found.</p>
      )}
    </div>
  );
}

export default FuelMonitoring;
