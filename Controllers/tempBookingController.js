import TempBooking from '../models/TempBooking.js';
import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import { v4 as uuidv4 } from 'uuid';

// Duración del bloqueo temporal en milisegundos (7 minutos)
const TEMP_BOOKING_DURATION = 7 * 60 * 1000;

/**
 * Crear o actualizar una reserva temporal para asientos
 */
export const createTempBooking = async (req, res) => {
  const { event_id, seatNumbers } = req.body;
  
  try {
    // Generar o usar ID de sesión
    let sessionId = req.body.sessionId;
    if (!sessionId) {
      sessionId = uuidv4();
    }
    
    // ID de usuario si está autenticado
    const user_id = req.user ? req.user._id : null;
    
    // Verificar que el evento existe
    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({
        status: "failed",
        success: "false",
        message: "Evento no encontrado",
      });
    }
    
    // Verificar que los asientos existen en el evento
    const allSeats = event.finalSeats[0].split(",");
    const invalidSeats = seatNumbers.filter(seat => !allSeats.includes(seat));
    if (invalidSeats.length > 0) {
      return res.status(400).json({
        status: "failed",
        success: "false",
        message: `Asientos inválidos: ${invalidSeats.join(', ')}`,
      });
    }
    
    // Verificar que los asientos no están reservados permanentemente
    const permanentBookings = await Booking.find({
      event_id,
      seatNumbers: { $in: seatNumbers }
    });
    
    if (permanentBookings.length > 0) {
      const bookedSeats = [];
      permanentBookings.forEach(booking => {
        booking.seatNumbers.forEach(seat => {
          if (seatNumbers.includes(seat)) {
            bookedSeats.push(seat);
          }
        });
      });
      
      return res.status(400).json({
        status: "failed",
        success: "false",
        message: "Algunos asientos ya están reservados permanentemente",
        bookedSeats: [...new Set(bookedSeats)],
      });
    }
    
    // Verificar que los asientos no están reservados temporalmente por otros usuarios
    const now = new Date();
    const tempBookings = await TempBooking.find({
      event_id,
      sessionId: { $ne: sessionId }, // No incluir reservas del mismo usuario
      expiryTime: { $gt: now }, // Solo reservas no expiradas
      seatNumbers: { $in: seatNumbers }
    });
    
    if (tempBookings.length > 0) {
      const tempReservedSeats = [];
      tempBookings.forEach(booking => {
        booking.seatNumbers.forEach(seat => {
          if (seatNumbers.includes(seat)) {
            tempReservedSeats.push(seat);
          }
        });
      });
      
      return res.status(400).json({
        status: "failed",
        success: "false",
        message: "Algunos asientos están temporalmente reservados por otro usuario",
        tempReservedSeats: [...new Set(tempReservedSeats)],
      });
    }
    
    // Calcular tiempo de expiración (7 minutos desde ahora)
    const expiryTime = new Date(now.getTime() + TEMP_BOOKING_DURATION);
    
    // Buscar si el usuario ya tiene una reserva temporal para este evento
    let existingTempBooking = await TempBooking.findOne({
      event_id,
      sessionId
    });
    
    if (existingTempBooking) {
      // Actualizar reserva existente
      existingTempBooking.seatNumbers = seatNumbers;
      existingTempBooking.expiryTime = expiryTime;
      await existingTempBooking.save();
      
      return res.status(200).json({
        status: "success",
        success: "true",
        message: "Reserva temporal actualizada",
        data: {
          sessionId,
          event_id,
          seatNumbers,
          expiryTime,
          remainingTime: TEMP_BOOKING_DURATION,
        }
      });
    } else {
      // Crear nueva reserva temporal
      const newTempBooking = new TempBooking({
        user_id,
        event_id,
        seatNumbers,
        sessionId,
        expiryTime
      });
      
      await newTempBooking.save();
      
      return res.status(201).json({
        status: "success",
        success: "true",
        message: "Asientos bloqueados temporalmente",
        data: {
          sessionId,
          event_id,
          seatNumbers,
          expiryTime,
          remainingTime: TEMP_BOOKING_DURATION,
        }
      });
    }
    
  } catch (err) {
    console.error("Error en createTempBooking:", err);
    res.status(500).json({
      status: "failed",
      success: "false",
      message: "Error al crear reserva temporal",
      error: err.message,
    });
  }
};

/**
 * Obtener asientos temporalmente reservados para un evento
 */
export const getTempBookedSeats = async (req, res) => {
  const { event_id } = req.query;
  
  try {
    if (!event_id) {
      return res.status(400).json({
        status: "failed",
        success: "false",
        message: "ID de evento requerido",
      });
    }
    
    // Buscar todas las reservas temporales activas para este evento
    const now = new Date();
    const tempBookings = await TempBooking.find({
      event_id,
      expiryTime: { $gt: now }
    });
    
    // Extraer todos los asientos reservados
    const tempBookedSeats = [];
    tempBookings.forEach(booking => {
      booking.seatNumbers.forEach(seat => {
        if (!tempBookedSeats.includes(seat)) {
          tempBookedSeats.push(seat);
        }
      });
    });
    
    return res.status(200).json({
      status: "success",
      success: "true",
      data: tempBookedSeats
    });
    
  } catch (err) {
    console.error("Error en getTempBookedSeats:", err);
    res.status(500).json({
      status: "failed",
      success: "false",
      message: "Error al obtener asientos reservados temporalmente",
      error: err.message,
    });
  }
};

/**
 * Liberar reserva temporal de asientos
 */
export const releaseTempBooking = async (req, res) => {
  const { sessionId, event_id } = req.body;
  
  try {
    if (!sessionId || !event_id) {
      return res.status(400).json({
        status: "failed",
        success: "false",
        message: "SessionId y event_id son requeridos",
      });
    }
    
    // Buscar y eliminar la reserva temporal
    const result = await TempBooking.findOneAndDelete({
      sessionId,
      event_id
    });
    
    if (!result) {
      return res.status(404).json({
        status: "failed",
        success: "false",
        message: "No se encontró la reserva temporal",
      });
    }
    
    return res.status(200).json({
      status: "success",
      success: "true",
      message: "Reserva temporal liberada correctamente",
    });
    
  } catch (err) {
    console.error("Error en releaseTempBooking:", err);
    res.status(500).json({
      status: "failed",
      success: "false",
      message: "Error al liberar reserva temporal",
      error: err.message,
    });
  }
};

/**
 * Limpiar reservas temporales expiradas (puede usarse con un cron job)
 */
export const cleanupExpiredBookings = async (req, res) => {
  try {
    const now = new Date();
    const result = await TempBooking.deleteMany({
      expiryTime: { $lte: now }
    });
    
    return res.status(200).json({
      status: "success",
      success: "true",
      message: `${result.deletedCount} reservas temporales expiradas fueron eliminadas`,
    });
    
  } catch (err) {
    console.error("Error en cleanupExpiredBookings:", err);
    res.status(500).json({
      status: "failed",
      success: "false",
      message: "Error al limpiar reservas temporales expiradas",
      error: err.message,
    });
  }
};