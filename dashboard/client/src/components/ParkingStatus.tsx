import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  runningVehicles: number;
  parkedVehicles: number;
}

export function ParkingStatus() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) return <div>Loading parking status...</div>;

  return (
    <div className="parking-status">
      <h2>Parking Yard Status</h2>
      <p>Running: {stats?.runningVehicles || 0}</p>
      <p>Parked: {stats?.parkedVehicles || 0}</p>
    </div>
  );
}