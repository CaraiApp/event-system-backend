import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import QRCode from 'qrcode';
import crypto from 'crypto';

// Utilidad para encriptar datos para QR codes
const encrypt = (data, secretKey) => {
    const keyBuffer = Buffer.from(secretKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Controlador para crear reservas de eventos gratuitos
 * Salta el proceso de Stripe y genera directamente el código QR
 */
export const createFreeBooking = async (req, res) => {
    const { bookingDate, event_id, user_id, guestSize, seatNumbers } = req.body;
    
    try {
        // Verificar que el evento existe
        const evento = await Event.findById(event_id);
        if (!evento) {
            return res.status(404).json({
                status: "failed",
                success: "false",
                message: "Evento no encontrado",
            });
        }
        
        // Verificar que sea realmente un evento gratuito
        if (evento.ticket !== "Free") {
            return res.status(400).json({
                status: "failed",
                success: "false",
                message: "Este no es un evento gratuito. Use la ruta Stripe para eventos de pago.",
            });
        }
        
        // Verificar conflictos de asientos si se están asignando
        if (seatNumbers && seatNumbers.length > 0) {
            const conflictingSeats = await Booking.find({
                event_id,
                bookingDate,
                seatNumbers: { $in: seatNumbers },
            });

            if (conflictingSeats.length > 0) {
                return res.status(400).json({
                    status: "failed",
                    success: "false",
                    message: "Algunos de los asientos seleccionados ya están reservados",
                    conflictingSeats: conflictingSeats.map(booking => booking.seatNumbers).flat(),
                });
            }
        }
        
        // Crear la reserva gratuita (totalPrice = 0)
        const nuevaReserva = new Booking({
            user_id,
            event_id,
            bookingDate,
            guestSize,
            seatNumbers: seatNumbers || [],
            totalPrice: 0,
            // Marcar como pagada ya que es gratis
            status: 'confirmed', 
            paymentStatus: 'paid'
        });
        
        const reservaGuardada = await nuevaReserva.save();
        
        // Actualizar asientos disponibles si es necesario
        if (seatNumbers && seatNumbers.length > 0) {
            evento.availableSeats = evento.availableSeats.filter(seat => !seatNumbers.includes(seat));
            await evento.save();
        }
        
        // Obtener detalles para la respuesta y generación del QR
        const reservaPoblada = await Booking.findById(reservaGuardada._id)
            .populate('user_id', 'username email')
            .populate('event_id', 'name desc venue');
            
        // Generar datos para el código QR
        const secretKey = process.env.QR_SECRET_KEY || 'defaultSecretKey0123456789abcdef'; // Fallback
        const qrCodeData = JSON.stringify({
            bookingId: reservaGuardada._id,
            event: evento.name,
            user: reservaPoblada.user_id.username,
            date: bookingDate,
            totalPrice: 0,
            isFree: true
        });
        
        // Encriptar los datos
        const encryptedData = encrypt(qrCodeData, secretKey);
        
        // Añadir mensaje para el caso de QR no válido
        const qrCodePayload = {
            errorMessage: "Código QR inválido. Por favor contacte al organizador del evento.",
            data: encryptedData,
        };
        
        // Generar QR y subirlo a Cloudinary
        const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrCodePayload));
        const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
            folder: "event_bookings",
            public_id: `free_booking_${reservaGuardada._id}`,
        });
        
        // Actualizar la reserva con la URL del QR
        reservaGuardada.qrCode = qrCodeUploadResponse.secure_url;
        await reservaGuardada.save();
        
        // Responder con éxito
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Tu registro para el evento gratuito ha sido realizado",
            data: reservaPoblada,
            qrCodeUrl: qrCodeUploadResponse.secure_url,
        });
        
    } catch (err) {
        console.error("Error en createFreeBooking:", err);
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al realizar la reserva para el evento gratuito",
            error: err.message,
        });
    }
};
