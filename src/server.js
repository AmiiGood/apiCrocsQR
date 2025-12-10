const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

// Importar rutas
const poRoutes = require("./routes/poRoutes");
const cartonRoutes = require("./routes/cartonRoutes");
const cajaRoutes = require("./routes/cajaRoutes");
const escaneoRoutes = require("./routes/escaneoRoutes");
const skuRoutes = require("./routes/skuRoutes");
const syncRoutes = require("./routes/syncRoutes");

// Importar database para verificar conexión
const { pool } = require("./config/database");

// Crear app Express
const app = express();

// ============================================
// MIDDLEWARES
// ============================================

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(",") || "*",
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ============================================
// RUTAS
// ============================================

// Ruta raíz
app.get("/", (req, res) => {
  res.json({
    message: "🚀 API Sistema de Escaneo de Cartones",
    version: "2.0.0",
    features: {
      validacionTemprana: "✅ Soporte para validación de cajas monoseriales",
      reutilizacion: "✅ Reutilización de validaciones",
    },
    endpoints: {
      pos: "/api/pos",
      cartones: "/api/cartones",
      cajas: "/api/cajas",
      escaneos: "/api/escaneos",
      skus: "/api/skus",
      sync: "/api/sync",
      health: "/health",
    },
  });
});

// Health check
app.get("/health", async (req, res) => {
  try {
    // Verificar conexión a BD
    await pool.query("SELECT 1");

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error.message,
    });
  }
});

// Rutas de la API
app.use("/api/pos", poRoutes);
app.use("/api/cartones", cartonRoutes);
app.use("/api/cajas", cajaRoutes);
app.use("/api/escaneos", escaneoRoutes);
app.use("/api/skus", skuRoutes);
app.use("/api/sync", syncRoutes);

// ============================================
// ERROR HANDLERS
// ============================================

// 404 - Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
    path: req.path,
  });
});

// Error handler general
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);

  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;

// Verificar conexión a BD antes de iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Error al conectar a PostgreSQL:", err);
    process.exit(1);
  }

  console.log("✅ Conexión a PostgreSQL exitosa");
  release();

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log("🚀 SERVIDOR INICIADO");
    console.log("=".repeat(50));
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log("=".repeat(50));
    console.log("📦 Nuevas funcionalidades:");
    console.log("   ✅ Validación temprana de cajas monoseriales");
    console.log("   ✅ Reutilización de validaciones");
    console.log("   ✅ Endpoints: /api/cajas/*");
    console.log("=".repeat(50) + "\n");
  });
});

// Manejo de señales de terminación
process.on("SIGTERM", () => {
  console.log("\n🛑 SIGTERM recibido. Cerrando servidor...");
  pool.end(() => {
    console.log("✅ Pool de conexiones cerrado");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n🛑 SIGINT recibido. Cerrando servidor...");
  pool.end(() => {
    console.log("✅ Pool de conexiones cerrado");
    process.exit(0);
  });
});

module.exports = app;
