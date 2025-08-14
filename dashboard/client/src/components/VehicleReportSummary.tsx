import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface SummaryRow {
  date: string;
  distance: number;
  mileage: number;
  fuelAmount: number;
  efficiency: string;
}

interface Driver {
  vehicleNo: string;
  driverName: string;
  mobile: string;
  inspector: string;
  inspectorMobile: string;
}

export default function VehicleReportSummary() {
  const [data, setData] = useState<SummaryRow[]>([]);
  const [vehicleNo, setVehicleNo] = useState("");
  const [driver, setDriver] = useState<Driver | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("vehicle-report");
    const selected = localStorage.getItem("vehicle-selected");
    const storedDrivers = localStorage.getItem("drivers");
    const from = localStorage.getItem("report-from");
    const to = localStorage.getItem("report-to");

    if (stored) setData(JSON.parse(stored));
    if (selected) setVehicleNo(selected);
    if (from) setFromDate(from);
    if (to) setToDate(to);

    if (storedDrivers && selected) {
      const allDrivers: Driver[] = JSON.parse(storedDrivers);
      const d = allDrivers.find((d) => d.vehicleNo === selected);
      setDriver(d || null);
    } else {
      fetch("http://localhost:5000/api/drivers")
        .then((res) => res.json())
        .then((drivers: Driver[]) => {
          localStorage.setItem("drivers", JSON.stringify(drivers));
          const d = drivers.find((d) => d.vehicleNo === selected);
          setDriver(d || null);
        });
    }
  }, []);

  const summary = data.find((d) => d.date === "TOTAL");
  const expectedMileage = summary?.mileage ?? 0;
  const actualEfficiency = summary?.efficiency === "—" ? 0 : parseFloat(summary?.efficiency || "0");
  const filtered = data.filter((d) => d.date !== "TOTAL");

  const formatDate = (isoDate: string): string => {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const reportPeriod =
    fromDate && toDate ? `${formatDate(fromDate)} – ${formatDate(toDate)}` : "N/A";

  const distanceChart = {
    labels: filtered.map((d) => d.date),
    datasets: [
      {
        label: "Distance Traveled (km)",
        data: filtered.map((d) => d.distance),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  const mileageChart = {
    labels: ["Summary"],
    datasets: [
      {
        label: "Expected Mileage (km/l)",
        data: [expectedMileage],
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
      {
        label: "Actual Efficiency (km/l)",
        data: [actualEfficiency],
        backgroundColor: "rgba(255, 99, 132, 0.6)",
      },
    ],
  };

  const handleExportPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const summaryElement = document.getElementById("report-summary");
    if (!summaryElement || !summary) return;

    const summaryCanvas = await html2canvas(summaryElement, { scale: 2 });
    const summaryImg = summaryCanvas.toDataURL("image/png");
    const imgProps = pdf.getImageProperties(summaryImg);
    const imgHeight = (pageWidth * imgProps.height) / imgProps.width;
    let y = 10;

    pdf.setFontSize(14);
    pdf.text("Vehicle Report Summary", pageWidth / 2, y, { align: "center" });
    y += 8;
    pdf.addImage(summaryImg, "PNG", 10, y, pageWidth - 20, imgHeight);
    y += imgHeight + 6;

    const chartCanvases = document.querySelectorAll("canvas");
    const chart1 = chartCanvases[0];
    const chart2 = chartCanvases[1];

    if (chart1) {
      const chart1Img = chart1.toDataURL("image/png");
      pdf.setFontSize(12);
      pdf.text("Chart: Daily Distance Traveled", 10, y);
      y += 4;
      pdf.addImage(chart1Img, "PNG", 10, y, pageWidth - 20, 40);
      y += 45;
    }

    if (chart2) {
      const chart2Img = chart2.toDataURL("image/png");
      pdf.setFontSize(12);
      pdf.text("Chart: Mileage vs Efficiency", 10, y);
      y += 4;
      pdf.addImage(chart2Img, "PNG", 10, y, pageWidth - 20, 35);
      y += 40;
    }

    const maxDay = filtered.reduce((max, entry) =>
      entry.distance > max.distance ? entry : max,
      { date: "", distance: 0 }
    );

    pdf.setFontSize(11);
    pdf.text("Insights:", 10, y);
    y += 5;
    pdf.setFontSize(9);
    pdf.text(`- Peak distance (${maxDay.distance} km) occurred on ${maxDay.date}.`, 10, y);
    y += 4;

    if (actualEfficiency > expectedMileage) {
      pdf.text(`- Efficiency (${actualEfficiency} km/l) exceeds expected mileage (${expectedMileage} km/l).`, 10, y);
      y += 4;
      pdf.text(`  Indicates optimal performance.`, 10, y);
    } else {
      pdf.text(`- Efficiency (${actualEfficiency} km/l) is below expected (${expectedMileage} km/l).`, 10, y);
      y += 4;
      pdf.text(`  Suggest maintenance check.`, 10, y);
    }

    pdf.setFontSize(8);
    pdf.text("System-generated report", 10, pageHeight - 8);
    pdf.save(`Vehicle_Report_Summary_${vehicleNo}.pdf`);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Vehicle Report Summary</h2>

      <div
        id="report-summary"
        className="summary-card"
        style={{
          background: "white",
          padding: "1.5rem",
          borderRadius: "10px",
          maxWidth: "600px",
          margin: "0 auto",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <p><strong>Vehicle:</strong> {vehicleNo}</p>
        <p><strong>Driver:</strong> {driver?.driverName || "N/A"} ({driver?.mobile || "N/A"})</p>
        <p><strong>Inspector:</strong> {driver?.inspector || "N/A"} ({driver?.inspectorMobile || "N/A"})</p>
        <p><strong>Report Period:</strong> {reportPeriod}</p>
        <p><strong>Total Distance:</strong> {summary?.distance ?? "—"} km</p>
        <p><strong>Total Fuel Used:</strong> {summary?.fuelAmount ?? "—"} L</p>
        <p><strong>Expected Mileage:</strong> {summary?.mileage ?? "—"} km/l</p>
        <p><strong>Calculated Efficiency:</strong> {summary?.efficiency ?? "—"} km/l</p>
      </div>

      <div style={{ marginTop: "2rem", maxWidth: "700px", marginInline: "auto" }}>
        <h4 style={{ textAlign: "center", marginBottom: "0.5rem" }}>Daily Distance Traveled</h4>
        <Bar data={distanceChart} options={{ responsive: true, plugins: { legend: { labels: { font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } }} />
      </div>

      <div style={{ marginTop: "2rem", maxWidth: "500px", marginInline: "auto" }}>
        <h4 style={{ textAlign: "center", marginBottom: "0.5rem" }}>Mileage vs Efficiency (Overall)</h4>
        <Bar data={mileageChart} options={{ responsive: true, plugins: { legend: { labels: { font: { size: 10 } } } }, scales: { y: { ticks: { font: { size: 9 } } } } }} />
      </div>

      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <button onClick={handleExportPDF} className="primary">
          Export Summary as PDF
        </button>
      </div>
    </div>
  );
}
