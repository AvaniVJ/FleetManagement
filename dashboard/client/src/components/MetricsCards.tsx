import "./MetricsCards.css";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface DashboardStats {
  totalVehicles: number;
  totalDistance: number | null;
  overallEfficiency: number | null;
}

interface MetricsCardsProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}

export function MetricsCards({ stats, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return <div>Loading metrics...</div>;
  }

  if (!stats) {
    return (
      <div className="metrics-cards">
        <div className="card">
          <h3>Total Vehicles</h3>
          <p>0</p>
        </div>
        <div className="card">
          <h3>Total Distance (km)</h3>
          <p>0.00</p>
        </div>
        <div className="card">
          <h3>Overall Efficiency (km/L)</h3>
          <p>0.00</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: ["Total Distance"],
    datasets: [
      {
        label: "Distance (km)",
        data: [stats.totalDistance ?? 0],
        backgroundColor: "#2563eb",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <>
      <div className="metrics-cards">
        <div className="card">
          <h3>Total Vehicles</h3>
          <p>{stats.totalVehicles ?? 0}</p>
        </div>
        <div className="card">
          <h3>Total Distance (km)</h3>
          <p>{(stats.totalDistance ?? 0).toFixed(2)}</p>
        </div>
        <div className="card">
          <h3>Overall Efficiency (km/L)</h3>
          <p>{(stats.overallEfficiency ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <h3>Distance Overview</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </>
  );
}
