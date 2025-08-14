import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./Charts.css";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Vehicle {
  "Vehicle Master": string;
  Column4: string;
  Column5: string;
  Column14: number;
}

interface FuelEntry {
  vehicleNo: string;
  distanceTraveled: number;
}

interface ChartsProps {
  from: "dashboard" | "analytics";
}

export function Charts({ from }: ChartsProps) {
  const [selectedVehicle, setSelectedVehicle] = useState("");

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>(["/api/vehicles"], async () => {
    const res = await fetch("http://localhost:5000/api/vehicles");
    if (!res.ok) throw new Error("Failed to fetch vehicles");
    return res.json();
  });

  const { data: fuelData, isLoading: fuelLoading } = useQuery<FuelEntry[]>(["/api/fuel"], async () => {
    const res = await fetch("http://localhost:5000/api/fuel");
    if (!res.ok) throw new Error("Failed to fetch fuel data");
    return res.json();
  });

  if (vehiclesLoading || fuelLoading || !vehicles || !fuelData) {
    return <div>Loading charts...</div>;
  }

  // Aggregation
  const zones = vehicles.reduce((acc, v) => {
    acc[v.Column5] = (acc[v.Column5] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const cities = vehicles.reduce((acc, v) => {
    acc[v.Column4] = (acc[v.Column4] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hhRanges = { "0-500": 0, "501-1000": 0, "1001-1500": 0, "1501+": 0 };
  vehicles.forEach((v) => {
    if (v.Column14 <= 500) hhRanges["0-500"]++;
    else if (v.Column14 <= 1000) hhRanges["501-1000"]++;
    else if (v.Column14 <= 1500) hhRanges["1001-1500"]++;
    else hhRanges["1501+"]++;
  });

  const distanceByVehicle: Record<string, number> = {};
  vehicles.forEach((v) => (distanceByVehicle[v["Vehicle Master"]] = 0));
  fuelData.forEach((entry) => {
    if (entry.vehicleNo in distanceByVehicle) {
      distanceByVehicle[entry.vehicleNo] += entry.distanceTraveled;
    }
  });

  const topZone = Object.entries(zones).sort((a, b) => b[1] - a[1])[0];
  const topCity = Object.entries(cities).sort((a, b) => b[1] - a[1])[0];
  const topHHRange = Object.entries(hhRanges).sort((a, b) => b[1] - a[1])[0];
  const sortedVehicles = Object.entries(distanceByVehicle).sort((a, b) => b[1] - a[1]);
  const topDistance = sortedVehicles[0];

  const filteredVehicleEntries =
    selectedVehicle && selectedVehicle in distanceByVehicle
      ? [[selectedVehicle, distanceByVehicle[selectedVehicle]]]
      : sortedVehicles.slice(0, 6);

  // Chart Data
  const zoneData = {
    labels: Object.keys(zones),
    datasets: [{ label: "Vehicles per Zone", data: Object.values(zones), backgroundColor: "#2563eb" }],
  };
  const cityData = {
    labels: Object.keys(cities),
    datasets: [
      {
        label: "Vehicles per City",
        data: Object.values(cities),
        backgroundColor: ["#2563eb", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"],
      },
    ],
  };
  const hhData = {
    labels: Object.keys(hhRanges),
    datasets: [{ label: "HH Targets", data: Object.values(hhRanges), backgroundColor: "#e74c3c" }],
  };
  const distanceData = {
    labels: filteredVehicleEntries.map(([v]) => v),
    datasets: [
      {
        label: "Distance Traveled (km)",
        data: filteredVehicleEntries.map(([_, dist]) => dist),
        backgroundColor: "#10b981",
      },
    ],
  };

  // PDF Export
  const exportToPDF = async () => {
    const element = document.getElementById("pdf-export");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

    pdf.setFontSize(18);
    pdf.text("Fleet - Analytics Report", pageWidth / 2, 15, { align: "center" });

    pdf.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    pdf.text(`Exported on: ${timestamp}`, pageWidth / 2, 22, { align: "center" });

    pdf.addImage(imgData, "PNG", 0, 30, pageWidth, imgHeight);

    pdf.setFontSize(9);
    pdf.text("*System generated report", 10, pageHeight - 10);

    pdf.save("AivanFleetAnalytics.pdf");
  };

  // Excel Export using ExcelJS
  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws1 = wb.addWorksheet("Vehicles per Zone");
    ws1.addRow(["Zone", "Vehicles"]);
    Object.entries(zones).forEach(([zone, count]) => ws1.addRow([zone, count]));

    const ws2 = wb.addWorksheet("Vehicles per City");
    ws2.addRow(["City", "Vehicles"]);
    Object.entries(cities).forEach(([city, count]) => ws2.addRow([city, count]));

    const ws3 = wb.addWorksheet("HH Targets");
    ws3.addRow(["Range", "Vehicles"]);
    Object.entries(hhRanges).forEach(([range, count]) => ws3.addRow([range, count]));

    const ws4 = wb.addWorksheet("Distance per Vehicle");
    ws4.addRow(["Vehicle", "Distance"]);
    Object.entries(distanceByVehicle).forEach(([vehicle, distance]) => ws4.addRow([vehicle, distance]));

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "AivanFleetAnalytics.xlsx");
  };

  return (
    <>
      {from === "analytics" && (
        <div className="charts-header">
          <h2>Analytics</h2>
          <div>
            <button className="export-button" onClick={exportToExcel}>📊 Export to Excel</button>
            <button className="export-button" onClick={exportToPDF}>🧾 Export to PDF</button>
          </div>
        </div>
      )}

      <div id="pdf-export" className="charts-grid">
        <div className="chart-card">
          <h3>Vehicles per Zone</h3>
          <Bar data={zoneData} options={{ responsive: true, maintainAspectRatio: false }} />
          <p>🔍 Most vehicles in zone: <strong>{topZone[0]}</strong> ({topZone[1]})</p>
        </div>

        <div className="chart-card pie-card">
          <h3>Vehicles per City</h3>
          <Pie data={cityData} options={{ responsive: true, maintainAspectRatio: false }} />
          <p>🌆 Most vehicles in city: <strong>{topCity[0]}</strong> ({topCity[1]})</p>
        </div>

        <div className="chart-card">
          <h3>HH Targets</h3>
          <Bar data={hhData} options={{ responsive: true, maintainAspectRatio: false }} />
          <p>🏘️ Most HH Targets in range: <strong>{topHHRange[0]}</strong> ({topHHRange[1]})</p>
        </div>

        {from === "analytics" && (
          <div className="chart-card">
            <h3>
              Distance Traveled{" "}
              <select
                className="vehicle-select"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
              >
                <option value="">Top 5 Vehicles</option>
                {vehicles.map((v) => (
                  <option key={v["Vehicle Master"]} value={v["Vehicle Master"]}>
                    {v["Vehicle Master"]}
                  </option>
                ))}
              </select>
            </h3>
            <Bar data={distanceData} options={{ responsive: true, maintainAspectRatio: false }} />
            <p>🚛 Longest distance by: <strong>{topDistance[0]}</strong> ({topDistance[1]} km)</p>
          </div>
        )}
      </div>
    </>
  );
}
