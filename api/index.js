// api/index.js
module.exports = (req, res) => {
  // Esto es necesario para Vercel
  res.setHeader("Content-Type", "application/json");

  try {
    // Intentamos importar y ejecutar la app
    const app = require("../loader.cjs");

    // Sólo para depuración - eliminar en producción
    console.log("Cargando aplicación...");
    console.log("Estructura de app:", Object.keys(app || {}));

    // Si app es una función, la ejecutamos con req y res
    if (typeof app === "function") {
      return app(req, res);
    }

    // Si app tiene un método handle, lo usamos
    if (app && typeof app.handle === "function") {
      return app.handle(req, res);
    }

    // Fallback
    res.status(200).json({ message: "Servidor en línea" });
  } catch (error) {
    console.error("Error al iniciar la aplicación:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
