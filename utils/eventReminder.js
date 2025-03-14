import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { sendEventReminder } from './emailService.js';

/**
 * Verifica eventos próximos y envía recordatorios a los usuarios
 * Para eventos que se realizarán al día siguiente
 * 
 * Esta función está diseñada para ser ejecutada diariamente mediante un cron job
 */
export const sendEventReminders = async () => {
    try {
        console.log('📅 Iniciando envío de recordatorios para eventos próximos...');
        
        // Calcular la fecha de mañana (sin hora, solo la fecha)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        // Fecha límite (final del día de mañana)
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);
        
        // Buscar eventos que ocurrirán mañana
        const upcomingEvents = await Event.find({
            eventDate: {
                $gte: tomorrow,
                $lte: tomorrowEnd
            },
            published: true
        });
        
        console.log(`Encontrados ${upcomingEvents.length} eventos programados para mañana`);
        
        if (upcomingEvents.length === 0) {
            return {
                success: true,
                message: 'No hay eventos programados para mañana',
                eventCount: 0,
                remindersSent: 0
            };
        }
        
        let remindersSent = 0;
        let remindersFailed = 0;
        
        // Para cada evento, buscar las reservas y enviar recordatorios
        for (const event of upcomingEvents) {
            // Buscar todas las reservas para este evento
            const bookings = await Booking.find({
                event_id: event._id,
                paymentStatus: 'paid' // Solo reservas pagadas
            });
            
            console.log(`Evento: ${event.name} - ${bookings.length} reservas encontradas`);
            
            // Para cada reserva, enviar un recordatorio al usuario
            for (const booking of bookings) {
                try {
                    // Buscar información del usuario
                    const user = await User.findById(booking.user_id);
                    
                    if (!user || !user.email) {
                        console.warn(`⚠️ Usuario no encontrado o sin email para la reserva ${booking._id}`);
                        remindersFailed++;
                        continue;
                    }
                    
                    // Formatear fecha del evento
                    const eventDate = new Date(event.eventDate).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    // Formatear la hora del evento
                    let eventTime = 'Hora no especificada';
                    if (event.eventTime) {
                        eventTime = typeof event.eventTime === 'string' 
                            ? event.eventTime 
                            : new Date(event.eventTime).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                    }
                    
                    // Enviar recordatorio
                    const reminderResult = await sendEventReminder({
                        email: user.email,
                        name: user.fullname || user.username,
                        eventName: event.name,
                        eventDate,
                        eventTime,
                        venue: event.venue || event.location,
                        seats: booking.seatNumbers.join(', '),
                        qrCodeUrl: booking.qrCodeUrl
                    });
                    
                    if (reminderResult.success) {
                        remindersSent++;
                    } else {
                        remindersFailed++;
                        console.error(`❌ Error al enviar recordatorio a ${user.email}:`, reminderResult.error);
                    }
                } catch (error) {
                    remindersFailed++;
                    console.error(`❌ Error al procesar recordatorio para la reserva ${booking._id}:`, error);
                }
            }
        }
        
        console.log(`✅ Proceso completado: ${remindersSent} recordatorios enviados, ${remindersFailed} fallidos`);
        
        return {
            success: true,
            message: `Recordatorios enviados para ${upcomingEvents.length} eventos`,
            eventCount: upcomingEvents.length,
            remindersSent,
            remindersFailed
        };
    } catch (error) {
        console.error('❌ Error al enviar recordatorios de eventos:', error);
        return {
            success: false,
            message: 'Error al procesar los recordatorios de eventos',
            error: error.message
        };
    }
};

export default { sendEventReminders };