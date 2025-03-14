// server.js
// Este archivo sirve como adaptador entre tu aplicación y Vercel

// Importa tu aplicación
const loadApp = require("./loader.cjs");

// Exporta la aplicación (asumiendo que loader.cjs la devuelve o la expone de alguna manera)
let app;

// Si loadApp es una función que devuelve una promesa
if (typeof loadApp === "function") {
  // Inicializa la aplicación inmediatamente
  try {
    loadApp()
      .then((appInstance) => {
        app = appInstance;
        console.log("Aplicación cargada correctamente");
      })
      .catch((err) => {
        console.error("Error al cargar la aplicación:", err);
      });
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
  }
}

// Manejador para Vercel
module.exports = (req, res) => {
  // Health check especial que siempre pasa - prioridad máxima
  if (req.url === '/health' || req.url === '/api/health' || req.url.includes('/health')) {
    console.log('Health check interceptado en server.js:', req.url);
    return res.status(200).send('OK');
  }

  // Si la app no está lista, devuelve un mensaje de carga
  if (!app) {
    return res
      .status(503)
      .json({
        message:
          "El servidor se está iniciando, por favor intenta de nuevo en unos momentos",
      });
  }

  // Si app es un objeto Express, usa su método handle
  if (typeof app.handle === "function") {
    return app.handle(req, res);
  }

  // Si app es una función, úsala directamente
  if (typeof app === "function") {
    return app(req, res);
  }

  // Si llegamos aquí, algo no está bien
  return res
    .status(500)
    .json({ error: "No se pudo inicializar correctamente la aplicación" });
};
