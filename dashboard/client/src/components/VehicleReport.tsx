import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import "./VehicleReport.css";

interface FuelEntry {
  vehicleNo: string;
  fuelAmount: number;
  odometerStart: number;
  odometerEnd: number;
  distanceTraveled: number;
  fuelEfficiency: number;
  location: string;
  date: string;
}

interface Vehicle {
  "Vehicle Master": string;
  Column15: number;
}

interface Driver {
  vehicleNo: string;
  driverName: string;
  mobile: string;
  inspector: string;
  inspectorMobile: string;
}

export default function VehicleReport() {
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("2024-05-01");
  const [toDate, setToDate] = useState("2024-06-30");
  const [report, setReport] = useState<any[]>([]);
  const navigate = useNavigate();

  const { data: vehicles } = useQuery<Vehicle[]>(["/api/vehicles"], async () => {
    const res = await fetch("http://localhost:5000/api/vehicles");
    return res.json();
  });

  const { data: fuelJson } = useQuery<FuelEntry[]>(["/api/fuel/json"], async () => {
    const res = await fetch("http://localhost:5000/api/fuel/json");
    return res.json();
  });

  const { data: fuelDb } = useQuery<FuelEntry[]>(["/api/fuel"], async () => {
    const res = await fetch("http://localhost:5000/api/fuel");
    return res.json();
  });

  const { data: drivers } = useQuery<Driver[]>(["/api/drivers"], async () => {
    const res = await fetch("http://localhost:5000/api/drivers");
    return res.json();
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    const matched = vehicles?.find((v) =>
      v["Vehicle Master"].toLowerCase().includes(query.toLowerCase())
    );
    if (matched) {
      setSelectedVehicle(matched["Vehicle Master"]);
    }
  };

  const handleGenerate = () => {
    if (!vehicles || !selectedVehicle || !fuelJson || !fuelDb) return;

    const mileage =
      vehicles.find((v) => v["Vehicle Master"] === selectedVehicle)?.Column15 || 0;

    const merged: FuelEntry[] = [...fuelJson, ...fuelDb];

    const filtered = merged.filter(
      (entry) =>
        entry.vehicleNo === selectedVehicle &&
        entry.date >= fromDate &&
        entry.date <= toDate
    );

    const dateMap = new Map<string, FuelEntry>();

    for (const entry of filtered) {
      const dateKey = entry.date.split("T")[0];
      const existing = dateMap.get(dateKey);

      if (existing) {
        existing.fuelAmount += entry.fuelAmount;
        existing.distanceTraveled += entry.distanceTraveled;
      } else {
        dateMap.set(dateKey, { ...entry, date: dateKey });
      }
    }

    const result = Array.from(dateMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, entry]) => {
        const efficiency =
          entry.fuelAmount > 0
            ? (entry.distanceTraveled / entry.fuelAmount).toFixed(2)
            : "—";
        return {
          date,
          distance: entry.distanceTraveled,
          mileage,
          fuelAmount: entry.fuelAmount,
          efficiency,
        };
      });

    const totalDistance = result.reduce((sum, r) => sum + r.distance, 0);
    const totalFuel = result.reduce((sum, r) => sum + r.fuelAmount, 0);
    const overallEfficiency =
      totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : "—";

    result.push({
      date: "TOTAL",
      distance: totalDistance,
      mileage,
      fuelAmount: totalFuel,
      efficiency: overallEfficiency,
    });

    setReport(result);

    const selectedDriver = drivers?.find((d) => d.vehicleNo === selectedVehicle);
    localStorage.setItem("vehicle-report", JSON.stringify(result));
    localStorage.setItem("vehicle-selected", selectedVehicle);
    localStorage.setItem("drivers", JSON.stringify(drivers || []));
    localStorage.setItem("report-from", fromDate);
    localStorage.setItem("report-to", toDate);
    if (selectedDriver) {
      localStorage.setItem("selected-driver", JSON.stringify(selectedDriver));
    }
  };

  const handleExport = async () => {
    if (!report.length || !selectedVehicle || !drivers) return;

    const driver = drivers.find((d) => d.vehicleNo === selectedVehicle);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Vehicle Report");

    sheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Distance (km)", key: "distance", width: 18 },
      { header: "Mileage (km/l)", key: "mileage", width: 18 },
      { header: "Fuel Filled (L)", key: "fuelAmount", width: 18 },
      { header: "Efficiency (km/l)", key: "efficiency", width: 20 },
      { header: "Vehicle No", key: "vehicle", width: 15 },
      { header: "Driver Name", key: "driver", width: 18 },
      { header: "Driver Mobile", key: "mobile", width: 18 },
      { header: "Inspector", key: "inspector", width: 18 },
      { header: "Inspector Mobile", key: "inspectorMobile", width: 20 },
    ];

    report.forEach((row, index) => {
      sheet.addRow({
        date: row.date,
        distance: row.distance,
        mileage: row.mileage,
        fuelAmount: row.fuelAmount,
        efficiency: row.efficiency,
        vehicle: index === 0 ? selectedVehicle : "",
        driver: index === 0 ? driver?.driverName || "N/A" : "",
        mobile: index === 0 ? driver?.mobile || "N/A" : "",
        inspector: index === 0 ? driver?.inspector || "N/A" : "",
        inspectorMobile: index === 0 ? driver?.inspectorMobile || "N/A" : "",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Vehicle_Report_${selectedVehicle}.xlsx`);
  };

  return (
    <div className="vehicle-report">
      <h2>Vehicle Report</h2>

      <div className="filters">
        <input
          type="text"
          placeholder="Search vehicle..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />

        <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
          <option value="">Select Vehicle</option>
          {vehicles?.map((v) => (
            <option key={v["Vehicle Master"]} value={v["Vehicle Master"]}>
              {v["Vehicle Master"]}
            </option>
          ))}
        </select>

        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <button className="primary" onClick={handleGenerate}>
          Fetch Details
        </button>
        <button className="primary" onClick={handleExport} disabled={!report.length}>
          Export Report
        </button>
        <button className="primary" onClick={() => navigate("/vehicle-summary")} disabled={!report.length}>
          View Summary
        </button>
      </div>

      {report.length > 0 && (
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Distance (km)</th>
              <th>Mileage (km/l)</th>
              <th>Fuel Filled (L)</th>
              <th>Efficiency (km/l)</th>
            </tr>
          </thead>
          <tbody>
            {report.map((r, i) => (
              <tr key={i} className={r.date === "TOTAL" ? "summary-row" : ""}>
                <td>{r.date}</td>
                <td>{r.distance}</td>
                <td>{r.mileage}</td>
                <td>{r.fuelAmount}</td>
                <td>{r.efficiency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
