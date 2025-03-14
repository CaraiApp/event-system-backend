// api/index.js - Punto de entrada para Vercel
const express = require("express");
const cors = require("cors");
const app = express();

// Configuración CORS radicalmente simple para Vercel
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Responder automáticamente a los preflight OPTIONS
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.status(200).end();
});

// Middleware básico
app.use(express.json());

// Ruta de prueba
app.get("/api", (req, res) => {
  res.json({ message: "API funcionando correctamente" });
});

// Ruta de health check para Vercel
app.get("/api/health", (req, res) => {
  console.log("API health check accessed (Vercel path)");
  res.status(200).send("OK");
});

// Ruta de health check sin prefijo para Railway
app.get("/health", (req, res) => {
  console.log("API health check accessed (Railway path)");
  res.status(200).send("OK");
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Para Vercel, necesitamos exportar la aplicación directamente
module.exports = app;
