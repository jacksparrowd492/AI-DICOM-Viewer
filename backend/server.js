const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

/* ===============================
   MIDDLEWARE
================================= */

app.use(cors());

app.use(express.json({
  limit: "50mb"   // good for DICOM uploads
}));

app.use(express.urlencoded({
  extended: true,
  limit: "50mb"
}));


/* ===============================
   ROUTES
================================= */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/patients", require("./routes/patients"));
app.use("/api/studies", require("./routes/studies"));
app.use("/api/files", require("./routes/files"));


/* ===============================
   ERROR HANDLER
================================= */

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : undefined
  });
});


/* ===============================
   404 ROUTE HANDLER
================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});


/* ===============================
   DATABASE + SERVER START
================================= */

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 🔥 FIXED MongoDB connection (no deprecated options)
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
}

startServer();
