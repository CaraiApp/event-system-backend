import express from 'express';
import { verifyToken } from '../MiddleWares/auth.js';
import { 
  createTempBooking, 
  getTempBookedSeats, 
  releaseTempBooking, 
  cleanupExpiredBookings,
  executeCleanupWithStats
} from '../Controllers/tempBookingController.js';
import { runTaskNow } from '../utils/scheduledTasks.js';

const router = express.Router();

// Crear o actualizar reserva temporal
router.post('/create', createTempBooking);

// Obtener asientos temporalmente reservados para un evento
router.get('/get', getTempBookedSeats);

// Liberar reserva temporal
router.post('/release', releaseTempBooking);

// Limpiar reservas temporales expiradas (protegido, solo para uso interno o cron)
router.post('/cleanup', verifyToken, cleanupExpiredBookings);

// Ejecutar limpieza de inmediato (protegido, versión optimizada)
router.post('/cleanup-now', verifyToken, async (req, res) => {
  try {
    // Verificar roles permitidos
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'organizador')) {
      return res.status(403).json({
        status: "failed",
        success: "false",
        message: "No tiene permisos para ejecutar esta acción"
      });
    }
    
    console.log(`[${new Date().toISOString()}] Limpieza manual iniciada por usuario: ${req.user._id}`);
    
    // Intentar ejecutar la tarea programada directamente
    const result = await runTaskNow('tempBookingCleanup');
    
    // Si no se pudo ejecutar la tarea programada (por ejemplo, si aún no se ha inicializado)
    if (!result) {
      console.log(`[${new Date().toISOString()}] Ejecutando limpieza directamente porque la tarea programada no está disponible`);
      return await executeCleanupWithStats(req, res);
    }
    
    return res.status(200).json({
      status: "success",
      success: "true",
      message: "Limpieza de reservas temporales iniciada correctamente",
      scheduledTask: true
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error al ejecutar limpieza manual:`, err);
    res.status(500).json({
      status: "failed",
      success: "false",
      message: "Error al ejecutar limpieza manual",
      error: err.message,
    });
  }
});

export default router;