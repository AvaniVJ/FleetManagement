import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./components/Sidebar";
import { MetricsCards } from "./components/MetricsCards";
import { Charts } from "./components/Charts";
import { VehicleTable } from "./components/VehicleTable";
import { DriverManagement } from "./components/DriverManagement";
import { ParkingStatus } from "./components/ParkingStatus";
import { FuelMonitoring } from "./components/FuelMonitoring";
import { FleetMap } from "./components/FleetMap";
import { RouteOptimization } from "./components/RouteOptimization";
import  VehicleReport from "./components/VehicleReport"; // ✅ named export



interface DashboardStats {
  totalVehicles: number;
  totalDistance: number;
  overallEfficiency: number;
}

export default function Dashboard() {
  const [activeView, setActiveView] = useState("dashboard");

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5000/api/dashboard/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <>
            <MetricsCards stats={stats} isLoading={isLoading} />
            <Charts from="dashboard" />
          </>
        );
      case "vehicle-management":
        return <VehicleTable />;
      case "driver-management":
        return <DriverManagement />;
      case "parking-status":
        return <ParkingStatus />;
      case "fuel-monitoring":
        return <FuelMonitoring />;
      case "live-tracking":
        return <FleetMap />;
      case "route-optimization":
        return <RouteOptimization />;
      case "analytics":
        return <Charts from="analytics" />;
      case "vehicle-report":
        return <VehicleReport />;
      default:
        return <MetricsCards stats={stats} isLoading={isLoading} />;
    }
  };

  return (
    <div className="dashboard">
      <Sidebar setActiveView={setActiveView} activeView={activeView} />
      <div className="content">
        <main>
          {activeView === "dashboard" && (
            <header>
              <h1  > Fleet Management Dashboard</h1>
            </header>
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
