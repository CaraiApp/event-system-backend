// Middleware para gestionar CORS de forma centralizada y simplificada
import cors from 'cors';

/**
 * Configura CORS para toda la aplicación con una implementación más sencilla y robusta
 * @param {Object} app - Instancia de Express
 * @returns {Object} - Instancia de Express con CORS configurado
 */
export default function setupCors(app) {
  // Orígenes permitidos explícitamente
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://event-system-frontend-web.vercel.app',
    'https://event-system-frontend-web-main.vercel.app',
    'https://entradasmelilla.vercel.app',
    'https://v2.entradasmelilla.com',
    'https://www.entradasmelilla.com',
    'https://entradasmelilla.com',
    'http://v2.entradasmelilla.com',
    'http://entradasmelilla.com',
    'https://demoticket.inasnapmarketing.ai'
  ];

  // Versión simplificada de CORS para evitar configuraciones que se contradicen
  // El objetivo es maximizar la compatibilidad con clientes y navegadores modernos
  app.use((req, res, next) => {
    // Obtener el origen de la solicitud
    const origin = req.headers.origin;
    
    console.log(`Recibida solicitud CORS desde origen: ${origin || 'No origin'} para ${req.method} ${req.path}`);
    
    // Permitir cualquier origen en desarrollo o los específicos en producción
    if (process.env.NODE_ENV === 'development') {
      // En desarrollo, ser permisivo
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      // En producción, ser más estricto
      if (origin && allowedOrigins.includes(origin)) {
        // Permitir origen específico con credenciales
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        console.log(`Origen ${origin} permitido con credenciales`);
      } else {
        // Para otros orígenes, permitir sin credenciales
        res.header('Access-Control-Allow-Origin', '*');
        console.log(`Origen ${origin || 'desconocido'} permitido sin credenciales`);
      }
    }
    
    // Cabeceras comunes para todos los casos
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.header('Access-Control-Max-Age', '86400'); // 24 horas de caché para preflight
    
    // Manejar preflight OPTIONS directamente
    if (req.method === 'OPTIONS') {
      console.log('Respondiendo a preflight OPTIONS con 204');
      return res.status(204).end();
    }
    
    next();
  });
  
  // No usar el middleware cors() directamente para evitar configuraciones que se solapan
  // app.use(cors());
  
  return app;
}