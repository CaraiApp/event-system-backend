// startup.js - Script para iniciar la aplicación con soporte para health check

import express from 'express';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración básica
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8080;
const HEALTH_PORT = process.env.HEALTH_PORT || 8081;

// Crear servidor express para health check
const app = express();

// Health check simple
app.get('/health', (req, res) => {
  console.log('Health check accedido en startup.js');
  res.status(200).send('OK');
});

// Iniciar el servidor de health check
app.listen(PORT, () => {
  console.log(`Servidor health check escuchando en puerto ${PORT}`);
});

// Iniciar la aplicación principal en segundo plano
console.log('Iniciando aplicación principal...');
try {
  // Usar fork para iniciar la aplicación principal en un proceso separado
  const mainApp = fork(path.join(__dirname, 'railway.js'), [], {
    stdio: 'inherit'
  });

  mainApp.on('error', (err) => {
    console.error('Error en la aplicación principal:', err);
  });

  console.log('Aplicación principal iniciada en segundo plano');
} catch (error) {
  console.error('Error al iniciar la aplicación principal:', error);
}

// Mantener el proceso principal vivo
process.on('SIGINT', () => {
  console.log('Recibida señal de terminación, cerrando servidores...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
  // No terminamos el proceso para mantener el health check funcionando
});