import {
  LayoutDashboard,
  Truck,
  Users,
  ParkingCircle,
  Fuel,
  MapPin,
  Route,
  BarChart2,
  FileText, // ✅ use valid icon instead
} from "lucide-react";
import './Sidebar.css';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "vehicle-management", label: "Vehicle Management", Icon: Truck },
  { id: "driver-management", label: "Driver Management", Icon: Users },
  { id: "parking-status", label: "Parking Status", Icon: ParkingCircle },
  { id: "fuel-monitoring", label: "Fuel Monitoring", Icon: Fuel },
  { id: "live-tracking", label: "Live Tracking", Icon: MapPin },
  { id: "analytics", label: "Analytics", Icon: BarChart2 },
  { id: "route-optimization", label: "Route Optimization", Icon: Route },
  { id: "vehicle-report", label: "Vehicle Report", Icon: FileText }, // ✅ use valid icon
];

export function Sidebar({ activeView, setActiveView }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title"> Fleet</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activeView === item.id ? "active" : ""}`}
            onClick={() => setActiveView(item.id)}
          >
            <item.Icon className="sidebar-icon" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
