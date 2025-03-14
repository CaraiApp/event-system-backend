import express from 'express';
import { verifyToken } from '../MiddleWares/auth.js';
import { 
  createTempBooking, 
  getTempBookedSeats, 
  releaseTempBooking, 
  cleanupExpiredBookings 
} from '../Controllers/tempBookingController.js';

const router = express.Router();

// Crear o actualizar reserva temporal
router.post('/create', createTempBooking);

// Obtener asientos temporalmente reservados para un evento
router.get('/get', getTempBookedSeats);

// Liberar reserva temporal
router.post('/release', releaseTempBooking);

// Limpiar reservas temporales expiradas (protegido, solo para uso interno o cron)
router.post('/cleanup', verifyToken, cleanupExpiredBookings);

export default router;