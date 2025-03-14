// health.js - Archivo simple para el health check

// Importar solo lo necesario con soporte para ESM y CommonJS
import express from 'express';

// Crear una aplicación simple de Express
const app = express();
const PORT = process.env.PORT || 8080;

// Logging para diagnóstico
console.log(`Iniciando servidor health check independiente en puerto ${PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

// Ruta principal
app.get('/', (req, res) => {
  console.log('Ruta raíz accedida');
  res.status(200).send('Servidor de health check funcionando');
});

// Ruta de health check ultra simple - Railway usa esta ruta para verificar el estado
app.get('/health', (req, res) => {
  console.log('Health check accedido');
  res.status(200).send('OK');
});

// Ruta de health check detallada para diagnóstico
app.get('/health/detailed', (req, res) => {
  console.log('Health check detallado accedido');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    process: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      version: process.version
    },
    env: process.env.NODE_ENV || 'development'
  });
});

// Iniciar servidor con mejor manejo de errores
const server = app.listen(PORT, () => {
  console.log(`Servidor health check escuchando en puerto ${PORT}`);
  console.log(`Health check URL: http://localhost:${PORT}/health`);
});

// Manejar errores del servidor
server.on('error', (error) => {
  console.error('Error en el servidor health check:', error);
  
  // Si el puerto está en uso, intentar con otro
  if (error.code === 'EADDRINUSE') {
    console.log(`Puerto ${PORT} en uso, intentando otro puerto...`);
    setTimeout(() => {
      server.close();
      server.listen(0); // Usar un puerto aleatorio disponible
    }, 1000);
  }
});

// Exportar la app para posible uso en otras partes
export default app;