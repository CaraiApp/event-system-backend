import express from 'express';
import { verifyToken } from '../MiddleWares/auth.js';
import { 
  getSchedulerStatus, 
  executeTask, 
  pauseTask 
} from '../Controllers/schedulerController.js';

const router = express.Router();

// Proteger todas las rutas del programador (solo admin)
const protectAdminRoute = (req, res, next) => {
  // Verificar token primero
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    
    // Verificar que es administrador
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    return res.status(403).json({
      status: "failed",
      success: "false",
      message: "Acceso denegado. Se requieren permisos de administrador."
    });
  });
};

// Obtener estado de todas las tareas programadas
router.get('/status', protectAdminRoute, getSchedulerStatus);

// Ejecutar una tarea manualmente
router.post('/execute/:taskName', protectAdminRoute, executeTask);

// Pausar una tarea programada
router.post('/pause/:taskName', protectAdminRoute, pauseTask);

export default router;