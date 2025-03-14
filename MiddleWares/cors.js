// Middleware para gestionar CORS de forma centralizada
import cors from 'cors';

/**
 * Configura CORS para toda la aplicación
 * @param {Object} app - Instancia de Express
 * @returns {Object} - Instancia de Express con CORS configurado
 */
export default function setupCors(app) {
  // Orígenes permitidos según el entorno
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

  // Opciones de configuración CORS
  const corsOptions = {
    origin: function (origin, callback) {
      // Permitir solicitudes sin origen (como Postman o móviles)
      if (!origin) return callback(null, true);
      
      // Verificar si el origen está en la lista de permitidos
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // En producción, permitir cualquier origen para evitar problemas de despliegue
        // NOTA: Esto es temporal y debería ser revisado para una configuración más restrictiva
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  };
  
  // Middleware principal de CORS
  app.use(cors(corsOptions));
  
  // Manejo global de preflight OPTIONS
  app.options('*', cors(corsOptions));
  
  // Middleware para forzar encabezados CORS en cada respuesta
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Si el origen está en la lista de permitidos, usar ese origen específico
    // De lo contrario, permitir cualquier origen con '*'
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Solo configurar credentials con un origen específico, no con '*'
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    // Manejar preflight de forma definitiva
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  return app;
}