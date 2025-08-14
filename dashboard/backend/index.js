const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// === Initialize SQLite DB ===
const db = new sqlite3.Database("fleet.db", (err) => {
  if (err) {
    console.error("❌ DB Connection Error:", err);
  } else {
    console.log("✅ Connected to SQLite DB");

    db.run(`CREATE TABLE IF NOT EXISTS fuel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleNo TEXT NOT NULL,
      fuelAmount REAL NOT NULL,
      cost REAL DEFAULT 0,
      odometerStart INTEGER NOT NULL,
      odometerEnd INTEGER NOT NULL,
      distanceTraveled REAL NOT NULL,
      fuelEfficiency REAL NOT NULL,
      location TEXT NOT NULL,
      date TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleNo TEXT NOT NULL,
      driverName TEXT NOT NULL,
      mobile TEXT NOT NULL,
      inspector TEXT,
      inspectorMobile TEXT
    )`);
  }
});

// === GET Vehicles ===
app.get("/api/vehicles", (req, res) => {
  fs.readFile("Vehicle Master.json", "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Unable to read Vehicle Master" });
    try {
      const vehicles = JSON.parse(data);
      res.json(vehicles);
    } catch {
      res.status(500).json({ error: "Invalid Vehicle Master JSON" });
    }
  });
});

// === GET Drivers (SQLite + JSON) ===
app.get("/api/drivers", (req, res) => {
  fs.readFile("Vehicle Master.json", "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Unable to read Vehicle Master" });

    let vehicles = [];
    try {
      vehicles = JSON.parse(data);
    } catch {
      return res.status(500).json({ error: "Invalid vehicle JSON" });
    }

    db.all("SELECT * FROM drivers", [], (err, dbDrivers) => {
      if (err) return res.status(500).json({ error: "DB error" });

      const fromJson = vehicles
        .filter((v) => v["Vehicle Master"] !== "Vehicle No")
        .map((v) => ({
          id: null,
          vehicleNo: v["Vehicle Master"],
          driverName: v.Column10,
          mobile: v.Column11,
          inspector: v.Column12,
          inspectorMobile: v.Column13,
          source: "json",
        }));

      const fromDb = dbDrivers.map((d) => ({ ...d, source: "db" }));
      res.json([...fromJson, ...fromDb]);
    });
  });
});

// === POST Driver ===
app.post("/api/drivers", (req, res) => {
  const { vehicleNo, driverName, mobile, inspector, inspectorMobile } = req.body;
  if (!vehicleNo || !driverName || !mobile)
    return res.status(400).json({ error: "Required fields missing" });

  db.run(
    `INSERT INTO drivers (vehicleNo, driverName, mobile, inspector, inspectorMobile)
     VALUES (?, ?, ?, ?, ?)`,
    [vehicleNo, driverName, mobile, inspector, inspectorMobile],
    function (err) {
      if (err) return res.status(500).json({ error: "Insert failed" });
      res.json({ id: this.lastID });
    }
  );
});

// === PUT Driver ===
app.put("/api/drivers/:id", (req, res) => {
  const { driverName, mobile, inspector, inspectorMobile } = req.body;
  db.run(
    `UPDATE drivers SET driverName = ?, mobile = ?, inspector = ?, inspectorMobile = ? WHERE id = ?`,
    [driverName, mobile, inspector, inspectorMobile, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: "Update failed" });
      res.json({ updated: this.changes });
    }
  );
});

// === DELETE Driver ===
app.delete("/api/drivers/:id", (req, res) => {
  db.run("DELETE FROM drivers WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: "Delete failed" });
    res.json({ deleted: this.changes });
  });
});

// === GET All Fuel Entries (SQLite) ===
app.get("/api/fuel", (req, res) => {
  db.all("SELECT * FROM fuel ORDER BY datetime(date) DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch fuel entries" });
    res.json(rows);
  });
});

// === POST New Fuel Entry ===
app.post("/api/fuel", (req, res) => {
  const { vehicleNo, fuelAmount, odometerStart, odometerEnd, location, date } = req.body;

  if (
    !vehicleNo || typeof fuelAmount !== "number" ||
    typeof odometerStart !== "number" ||
    typeof odometerEnd !== "number" || !location
  ) {
    return res.status(400).json({ error: "Invalid fuel entry" });
  }

  if (odometerEnd <= odometerStart)
    return res.status(400).json({ error: "Odometer end must be greater than start" });

  const distance = odometerEnd - odometerStart;
  const efficiency = fuelAmount > 0 ? distance / fuelAmount : 0;
  const entryDate = date || new Date().toISOString();
  const cost = 0; // Set default cost to zero

  db.run(
    `INSERT INTO fuel (vehicleNo, fuelAmount, cost, odometerStart, odometerEnd, distanceTraveled, fuelEfficiency, location, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [vehicleNo, fuelAmount, cost, odometerStart, odometerEnd, distance, efficiency, location, entryDate],
    function (err) {
      if (err) return res.status(500).json({ error: "Insert failed" });
      res.json({ id: this.lastID });
    }
  );
});

// === GET Last Entry Before a Given Date ===
app.get("/api/fuel/last-entry-before/:vehicleNo/:date", (req, res) => {
  const { vehicleNo, date } = req.params;

  db.get(
    `SELECT * FROM fuel
     WHERE vehicleNo = ? AND date < ?
     ORDER BY datetime(date) DESC LIMIT 1`,
    [vehicleNo, date],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Failed to fetch last fuel entry" });
      res.json(row || null);
    }
  );
});

// === GET fuel.json for Vehicle Report ===
app.get("/api/fuel/json", (req, res) => {
  fs.readFile(path.join(__dirname, "fuel.json"), "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "fuel.json not found" });
    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch {
      res.status(500).json({ error: "Invalid fuel.json format" });
    }
  });
});

// === GET Dashboard Stats ===
app.get("/api/dashboard/stats", (req, res) => {
  fs.readFile("Vehicle Master.json", "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Failed to read vehicle master" });

    let vehicles = [];
    try {
      vehicles = JSON.parse(data);
    } catch {
      return res.status(500).json({ error: "Invalid vehicle JSON" });
    }

    db.get(
      `SELECT SUM(distanceTraveled) as totalDistance, SUM(fuelAmount) as totalFuel FROM fuel`,
      [],
      (err, row) => {
        if (err) return res.status(500).json({ error: "Failed to fetch stats" });

        const totalDistance = row?.totalDistance || 0;
        const totalFuel = row?.totalFuel || 0;
        const overallEfficiency = totalFuel > 0 ? totalDistance / totalFuel : 0;

        res.json({
          totalVehicles: vehicles.length || 0,
          totalDistance,
          overallEfficiency,
        });
      }
    );
  });
});

// === Serve frontend in production ===
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

// === Root Endpoint ===
app.get("/", (req, res) => {
  res.send("Aivan Fleet Backend is running 🚛");
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
