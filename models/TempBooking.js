import mongoose from "mongoose";

const tempBookingSchema = new mongoose.Schema(
  {
    user_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', // Referencia al esquema de Usuario
    },
    event_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Event', // Referencia al esquema de Evento
    },
    seatNumbers: {
      type: [String], // Lista de números de asiento reservados temporalmente
      default: [],    
    },
    sessionId: {
      type: String, // Identificador único para la sesión del usuario (para usuarios no registrados)
      required: true,
    },
    expiryTime: {
      type: Date, // Tiempo de expiración (7 minutos desde la creación)
      required: true,
    }
  },
  { timestamps: true }
);

// Índice para mejorar el rendimiento en consultas por expiración
tempBookingSchema.index({ expiryTime: 1 });
// Índice para mejorar búsquedas por evento
tempBookingSchema.index({ event_id: 1 });
// Índice compuesto para búsquedas eficientes por evento y asiento
tempBookingSchema.index({ event_id: 1, seatNumbers: 1 });

export default mongoose.model("TempBooking", tempBookingSchema);