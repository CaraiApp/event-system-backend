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
    'https://demoticket.inasnapmarketing.ai',
    // Agregamos los dominios de desarrollo/producción que se están usando
    'https://event-system-backend-main.vercel.app',
    'https://event-system-backend-production.up.railway.app'
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
  
  // Usamos también el middleware cors() como respaldo para una mejor compatibilidad
  app.use(cors({
    origin: function(origin, callback) {
      // Permitir solicitudes sin origen (como apps móviles, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Permitir todos los orígenes en desarrollo
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // En producción, verificar contra lista de orígenes permitidos
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        // Para desarrollo, permitimos cualquier origen
        return callback(null, true);
        // En producción estricta, podríamos usar:
        // return callback(new Error('No permitido por CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
    maxAge: 86400 // 24 horas
  }));
  
  return app;
}