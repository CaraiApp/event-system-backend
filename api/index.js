// api/index.js
const express = require("express");
const app = express();

// Middleware básico
app.use(express.json());

// Ruta de prueba
app.get("/api", (req, res) => {
  res.json({ message: "API funcionando correctamente" });
});

// Ruta de health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Para Vercel, necesitamos exportar la aplicación directamente
module.exports = app;
