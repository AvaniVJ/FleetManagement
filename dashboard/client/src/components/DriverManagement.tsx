import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import "./DriverManagement.css";

interface Driver {
  id: number | null;
  vehicleNo: string;
  driverName: string;
  mobile: string;
  inspector: string;
  inspectorMobile: string;
  source: "json" | "db";
}

export function DriverManagement() {
  const queryClient = useQueryClient();

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    queryFn: async () => {
      const res = await fetch("http://localhost:5000/api/drivers");
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (newDriver: Omit<Driver, "id" | "source">) => {
      const res = await fetch("http://localhost:5000/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDriver),
      });
      if (!res.ok) throw new Error("Failed to add driver");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries(["/api/drivers"]),
  });

  const updateMutation = useMutation({
    mutationFn: async (driver: Driver) => {
      const res = await fetch(`http://localhost:5000/api/drivers/${driver.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driver),
      });
      if (!res.ok) throw new Error("Failed to update driver");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries(["/api/drivers"]),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/drivers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete driver");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries(["/api/drivers"]),
  });

  const [newDriver, setNewDriver] = useState({
    vehicleNo: "",
    driverName: "",
    mobile: "",
    inspector: "",
    inspectorMobile: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewDriver({ ...newDriver, [e.target.name]: e.target.value });
  };

const handleAddDriver = () => {
  if (!newDriver.vehicleNo || !newDriver.driverName || !newDriver.mobile) {
    alert("Vehicle No, Driver Name, and Mobile are required");
    return;
  }

  // ✅ Check if vehicle is already assigned in both JSON and DB
  const allDrivers = [...jsonDrivers, ...dbDrivers];
  const alreadyAssigned = allDrivers.some(
    (d) => d.vehicleNo === newDriver.vehicleNo
  );

  if (alreadyAssigned) {
    alert(`Vehicle No ${newDriver.vehicleNo} is already assigned to another driver.`);
    return;
  }

  addMutation.mutate(newDriver);
  setNewDriver({
    vehicleNo: "",
    driverName: "",
    mobile: "",
    inspector: "",
    inspectorMobile: "",
  });
};


  if (isLoading) return <div>Loading drivers...</div>;

  const dbDrivers = drivers?.filter((d) => d.source === "db") || [];
  const jsonDrivers = drivers?.filter(
    (d) => d.source === "json" && d.vehicleNo !== "Vehicle No"
  ) || [];

  return (
    <div className="driver-management">
      <h2>Driver Management</h2>
      <p>Manage driver details and health inspector assignments</p>

      {/* Add Form */}
      <div className="add-driver-form">
        <input
          type="text"
          name="vehicleNo"
          placeholder="Vehicle No"
          value={newDriver.vehicleNo}
          onChange={handleChange}
        />
        <input
          type="text"
          name="driverName"
          placeholder="Driver Name"
          value={newDriver.driverName}
          onChange={handleChange}
        />
        <input
          type="text"
          name="mobile"
          placeholder="Mobile No"
          value={newDriver.mobile}
          onChange={handleChange}
        />
        <input
          type="text"
          name="inspector"
          placeholder="Health Inspector"
          value={newDriver.inspector}
          onChange={handleChange}
        />
        <input
          type="text"
          name="inspectorMobile"
          placeholder="Inspector Mobile"
          value={newDriver.inspectorMobile}
          onChange={handleChange}
        />
        <button onClick={handleAddDriver}>Add Driver</button>
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Driver Name</th>
            <th>Mobile No</th>
            <th>Vehicle No</th>
            <th>Health Inspector</th>
            <th>Inspector Mobile</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {[...jsonDrivers, ...dbDrivers].map((driver, index) => (
            <tr key={index}>
              <td>{driver.driverName || "—"}</td>
              <td>{driver.mobile || "—"}</td>
              <td>{driver.vehicleNo || "—"}</td>
              <td>{driver.inspector || "—"}</td>
              <td>{driver.inspectorMobile || "—"}</td>
              <td>
                {driver.source === "db" && (
                  <>
                    <button
                      onClick={() => {
                        const updated = { ...driver };
                        updated.driverName = prompt("Edit Driver Name", driver.driverName) || driver.driverName;
                        updated.mobile = prompt("Edit Mobile", driver.mobile) || driver.mobile;
                        updated.inspector = prompt("Edit Inspector", driver.inspector) || driver.inspector;
                        updated.inspectorMobile = prompt("Edit Inspector Mobile", driver.inspectorMobile) || driver.inspectorMobile;
                        updateMutation.mutate(updated);
                      }}
                    >
                      Edit
                    </button>{" "}
                    <button
                      onClick={() => {
                        if (driver.id && window.confirm("Are you sure you want to delete this driver?")) {
                          deleteMutation.mutate(driver.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
