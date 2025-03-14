import QRCode from 'qrcode';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { 
    sendBookingConfirmationEmail, 
    sendOrganizerBookingNotification 
} from '../utils/emailService.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// Inicializar el cliente de Stripe con la clave secreta
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { 
    apiVersion: '2023-10-16'  // Usar la versión más reciente de la API
});

// Funciones de encriptación y desencriptación para datos sensibles
const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_SECRET_KEY || 'default-secure-key-for-encrypting-sensitive-data';

/**
 * Encripta datos sensibles
 * @param {string} text - El texto a encriptar
 * @returns {string} - Texto encriptado en formato hex
 */
const encrypt = (text) => {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'utf-8'), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
        console.error('Error en la encriptación:', error);
        return null;
    }
};

/**
 * Desencripta datos sensibles
 * @param {string} text - El texto encriptado en formato iv:encryptedData
 * @returns {string} - Texto desencriptado
 */
const decrypt = (text) => {
    try {
        const [ivHex, encryptedHex] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'utf-8'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Error en la desencriptación:', error);
        return null;
    }
};

// Exportar las funciones de manejo de pagos con Stripe
export const handleStripePayment = {
    /**
     * @desc    Crear una sesión de pago de Stripe
     * @route   POST /api/v1/booking/create-stripe-session
     * @access  Private
     */
    createStripeSession: asyncHandler(async (req, res) => {
        const { 
            user_id, 
            event_id, 
            bookingDate, 
            guestSize, 
            seatNumbers, 
            totalPrice,
            ticketType = 'standard'
        } = req.body;
        
        if (!event_id || !user_id || !totalPrice || !seatNumbers || !Array.isArray(seatNumbers)) {
            throw new ApiError(400, 'Faltan campos requeridos para crear la sesión de pago');
        }
        
        try {
            // Buscar el evento
            const event = await Event.findById(event_id);
            if (!event) {
                throw new ApiError(404, 'Evento no encontrado');
            }
            
            // Verificar que los asientos no estén ya reservados
            const alreadyReservedSeats = seatNumbers.filter(seat => 
                event.reservedSeats.includes(seat)
            );
            
            if (alreadyReservedSeats.length > 0) {
                throw new ApiError(400, 'Algunos de los asientos seleccionados ya están reservados', {
                    alreadyReservedSeats
                });
            }
            
            // Buscar el usuario
            const user = await User.findById(user_id);
            if (!user) {
                throw new ApiError(404, 'Usuario no encontrado');
            }
            
            // Calcular comisión si aplica (opcional)
            const commission = totalPrice * 0.05; // 5% de comisión
            const paymentAmount = Math.round((totalPrice + commission) * 100); // Monto en centavos
            
            // Crear la sesión de Stripe con los detalles del evento
            const session = await stripeClient.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: event.currency || 'EUR',
                            product_data: {
                                name: `Entradas para: ${event.name}`,
                                description: `Lugar: ${event.venue || event.location}, Asientos: ${seatNumbers.join(', ')}`,
                                images: event.photo ? [event.photo] : undefined,
                            },
                            unit_amount: paymentAmount, // Monto en centavos
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL}/reservas/confirmacion?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/eventos/${event._id}?canceled=true`,
                customer_email: user.email,
                metadata: {
                    // Encriptar datos sensibles
                    user_id: encrypt(user_id),
                    event_id: encrypt(event_id),
                    bookingDate: encrypt(bookingDate || new Date().toISOString()),
                    guestSize: encrypt(guestSize.toString() || '1'),
                    seatNumbers: encrypt(JSON.stringify(seatNumbers)),
                    totalPrice: encrypt(totalPrice.toString()),
                    ticketType: encrypt(ticketType),
                    created_at: new Date().toISOString(),
                },
            });
            
            return res.status(200).json(new ApiResponse(
                200,
                { 
                    sessionId: session.id,
                    sessionUrl: session.url
                },
                'Sesión de pago creada exitosamente'
            ));
        } catch (error) {
            console.error('Error al crear la sesión de Stripe:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error interno al procesar el pago');
        }
    }),
    
    /**
     * @desc    Manejar el webhook de Stripe para eventos de pago
     * @route   POST /api/v1/booking/webhook
     * @access  Public
     */
    handleStripeWebhook: async (req, res) => {
        const signature = req.headers['stripe-signature'];
        
        if (!signature) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Firma de Stripe faltante' 
            });
        }
        
        let stripeEvent;
        
        try {
            // Verificar la firma del webhook
            stripeEvent = stripeClient.webhooks.constructEvent(
                req.body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('Error en la verificación de la firma del webhook:', err.message);
            return res.status(400).send(`Error de webhook: ${err.message}`);
        }
        
        // Manejar diferentes eventos de Stripe
        if (stripeEvent.type === 'checkout.session.completed') {
            const session = stripeEvent.data.object;
            
            if (session.payment_status === 'paid' && session.status === 'complete') {
                try {
                    // Desencriptar los datos del metadata
                    const metadata = session.metadata;
                    
                    const user_id = decrypt(metadata.user_id);
                    const event_id = decrypt(metadata.event_id);
                    const bookingDate = decrypt(metadata.bookingDate);
                    const guestSize = parseInt(decrypt(metadata.guestSize));
                    const seatNumbers = JSON.parse(decrypt(metadata.seatNumbers));
                    const totalPrice = parseFloat(decrypt(metadata.totalPrice));
                    const ticketType = decrypt(metadata.ticketType);
                    
                    // Buscar el evento
                    const event = await Event.findById(event_id);
                    if (!event) {
                        console.error('Error al procesar el pago: Evento no encontrado');
                        return res.status(400).json({ message: 'Evento no encontrado' });
                    }
                    
                    // Verificar que los asientos no estén ya reservados
                    const alreadyReservedSeats = seatNumbers.filter(seat => 
                        event.reservedSeats.includes(seat)
                    );
                    
                    if (alreadyReservedSeats.length > 0) {
                        console.error('Error al procesar el pago: Asientos ya reservados');
                        return res.status(400).json({ 
                            message: 'Algunos asientos ya están reservados',
                            alreadyReservedSeats
                        });
                    }
                    
                    // Reservar los asientos en el evento
                    event.reservedSeats.push(...seatNumbers);
                    await event.save();
                    
                    // Generar token para verificación de QR
                    const tokenPayload = {
                        bookingId: session.id,
                        eventId: event._id,
                        userId: user_id,
                        organizerId: event.user_id,
                        seatNumbers,
                        ticketType
                    };
                    
                    // Token válido hasta 24 horas después del evento
                    const eventDateTime = new Date(event.eventDate).getTime();
                    const tokenExpiryTime = Math.floor((eventDateTime + 24 * 60 * 60 * 1000) / 1000);
                    
                    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, {
                        expiresIn: tokenExpiryTime - Math.floor(Date.now() / 1000)
                    });
                    
                    // Generar datos del código QR
                    const qrCodeData = JSON.stringify({
                        eventName: event.name,
                        eventLocation: event.venue || event.location,
                        eventDate: event.eventDate,
                        seatNumbers,
                        totalPrice,
                        bookingId: session.id,
                        token
                    });
                    
                    // Generar y subir el código QR a Cloudinary
                    const qrCodeBase64 = await QRCode.toDataURL(qrCodeData);
                    const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, 'event_bookings');
                    
                    if (!qrCodeUploadResponse) {
                        console.error('Error al subir el código QR a Cloudinary');
                    }
                    
                    // Crear la reserva en la base de datos
                    const newBooking = new Booking({
                        user_id,
                        event_id,
                        bookingDate: new Date(bookingDate),
                        guestSize,
                        seatNumbers,
                        totalPrice,
                        ticketType,
                        qrCodeToken: token,
                        qrCodeScanStatus: false,
                        qrCodeUrl: qrCodeUploadResponse ? qrCodeUploadResponse.secure_url : null,
                        paymentStatus: 'paid',
                        paymentDetails: {
                            paymentIntentId: session.payment_intent,
                            sessionStorageId: session.id,
                            paymentMethod: session.payment_method_types[0]
                        }
                    });
                    
                    // Guardar la reserva
                    const savedBooking = await newBooking.save();
                    
                    // Generar PDF del ticket (opcional)
                    const pdfPath = `booking-${savedBooking._id}.pdf`;
                    const doc = new PDFDocument();
                    const writeStream = fs.createWriteStream(pdfPath);
                    
                    doc.pipe(writeStream);
                    
                    // Diseñar el PDF del ticket
                    doc.fontSize(25).text('Ticket de Entrada', { align: 'center' });
                    doc.moveDown();
                    doc.fontSize(15).text(`Evento: ${event.name}`);
                    doc.fontSize(12).text(`Fecha: ${new Date(event.eventDate).toLocaleDateString()}`);
                    doc.fontSize(12).text(`Lugar: ${event.venue || event.location}`);
                    doc.fontSize(12).text(`Asiento(s): ${seatNumbers.join(', ')}`);
                    doc.fontSize(12).text(`Precio Total: ${totalPrice} ${event.currency || 'EUR'}`);
                    doc.moveDown();
                    
                    // Añadir el código QR al PDF
                    if (qrCodeUploadResponse) {
                        doc.image(qrCodeBase64, {
                            fit: [250, 250],
                            align: 'center'
                        });
                    }
                    
                    doc.end();
                    
                    // Esperar a que el PDF termine de escribirse
                    writeStream.on('finish', async () => {
                        try {
                            // 1. Buscar datos completos del usuario
                            const user = await User.findById(user_id);
                            
                            // 2. Enviar correo electrónico de confirmación al usuario
                            if (user && user.email) {
                                await sendBookingConfirmationEmail({
                                    email: user.email,
                                    name: user.fullname || user.username,
                                    eventName: event.name,
                                    eventDate: new Date(event.eventDate).toLocaleDateString(),
                                    eventTime: event.eventTime,
                                    venue: event.venue || event.location,
                                    seats: seatNumbers.join(', '),
                                    totalPrice,
                                    currency: event.currency || 'EUR',
                                    bookingId: savedBooking._id,
                                    qrCodeUrl: qrCodeUploadResponse?.secure_url,
                                    attachments: [
                                        {
                                            filename: `ticket-${savedBooking._id}.pdf`,
                                            path: pdfPath
                                        }
                                    ]
                                });
                                
                                console.log(`✅ Correo de confirmación enviado a ${user.email}`);
                            }
                            
                            // 3. Buscar información del organizador y enviarle notificación
                            if (event.user_id) {
                                try {
                                    const organizer = await User.findById(event.user_id);
                                    
                                    if (organizer && organizer.email) {
                                        // Enviar notificación al organizador
                                        await sendOrganizerBookingNotification({
                                            email: organizer.email,
                                            name: organizer.fullname || organizer.username,
                                            eventName: event.name,
                                            bookingId: savedBooking._id,
                                            totalPrice,
                                            numTickets: seatNumbers.length,
                                            currency: event.currency || 'EUR'
                                        });
                                        
                                        console.log(`✅ Notificación enviada al organizador ${organizer.email}`);
                                    }
                                } catch (organizerEmailError) {
                                    console.error('Error al enviar notificación al organizador:', organizerEmailError);
                                    // No interrumpir el proceso principal si falla la notificación al organizador
                                }
                            }
                        } catch (emailError) {
                            console.error('Error en el envío de correos electrónicos:', emailError);
                        } finally {
                            // Eliminar el archivo PDF local después de enviarlo
                            fs.unlink(pdfPath, (err) => {
                                if (err) console.error('Error al eliminar el archivo PDF temporal:', err);
                            });
                        }
                    });
                    
                    console.log(`Reserva ${savedBooking._id} creada exitosamente después del pago`);
                    
                } catch (error) {
                    console.error('Error al procesar la reserva después del pago:', error);
                }
            }
        }
        
        // Confirmar recepción del webhook
        return res.status(200).json({ received: true });
    },
    
    /**
     * @desc    Consultar detalles de una sesión de reserva
     * @route   GET /api/v1/booking/session/:sessionId
     * @access  Private
     */
    getSessionBookingDetails: asyncHandler(async (req, res) => {
        const { sessionId } = req.params;
        
        if (!sessionId) {
            throw new ApiError(400, 'ID de sesión requerido');
        }
        
        try {
            // Buscar la reserva por el ID de la sesión de Stripe
            const booking = await Booking.findOne({
                'paymentDetails.sessionStorageId': sessionId
            }).populate('event_id', 'name venue location eventDate eventTime photo');
            
            if (!booking) {
                throw new ApiError(404, 'Reserva no encontrada');
            }
            
            // Buscar el usuario para obtener más detalles
            const user = await User.findById(booking.user_id).select('username email fullname');
            
            // Formatear la respuesta
            const bookingDetails = {
                id: booking._id,
                event: {
                    id: booking.event_id._id,
                    name: booking.event_id.name,
                    venue: booking.event_id.venue || booking.event_id.location,
                    date: booking.event_id.eventDate,
                    time: booking.event_id.eventTime,
                    photo: booking.event_id.photo
                },
                user: {
                    id: user._id,
                    name: user.fullname || user.username,
                    email: user.email
                },
                bookingDate: booking.bookingDate,
                seatNumbers: booking.seatNumbers,
                guestSize: booking.guestSize,
                totalPrice: booking.totalPrice,
                ticketType: booking.ticketType || 'standard',
                qrCodeUrl: booking.qrCodeUrl,
                qrCodeScanStatus: booking.qrCodeScanStatus,
                paymentStatus: booking.paymentStatus,
                createdAt: booking.createdAt
            };
            
            return res.status(200).json(new ApiResponse(
                200,
                bookingDetails,
                'Detalles de la reserva recuperados exitosamente'
            ));
            
        } catch (error) {
            console.error('Error al obtener detalles de la reserva:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error al recuperar los detalles de la reserva');
        }
    }),
    
    /**
     * @desc    Verificar y escanear un código QR de entrada
     * @route   POST /api/v1/booking/scan-qr
     * @access  Private (Organizer/Admin only)
     */
    scanQRCode: asyncHandler(async (req, res) => {
        const { token } = req.body;
        
        if (!token) {
            throw new ApiError(400, 'Token QR requerido');
        }
        
        try {
            // Verificar y decodificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            
            // Verificar que el organizador es el propietario del evento
            const event = await Event.findById(decoded.eventId);
            if (!event) {
                throw new ApiError(404, 'Evento no encontrado');
            }
            
            // Verificar permisos (opcional)
            // Si el usuario que hace el scan es diferente del organizador del evento,
            // comprobar que tiene permisos de administrador
            const isOrganizer = req.user._id.toString() === event.user_id.toString();
            const isAdmin = req.user.role === 'admin';
            
            if (!isOrganizer && !isAdmin) {
                throw new ApiError(403, 'No tiene permisos para escanear entradas de este evento');
            }
            
            // Buscar la reserva
            const booking = await Booking.findOne({
                qrCodeToken: token
            });
            
            if (!booking) {
                throw new ApiError(404, 'Reserva no encontrada. El código QR puede ser inválido.');
            }
            
            // Verificar si ya ha sido escaneado
            if (booking.qrCodeScanStatus) {
                return res.status(200).json(new ApiResponse(
                    200,
                    {
                        valid: false,
                        booking: {
                            id: booking._id,
                            event_id: booking.event_id,
                            user_id: booking.user_id,
                            seatNumbers: booking.seatNumbers,
                            scanned: true,
                            scannedAt: booking.qrCodeScanDate
                        }
                    },
                    'Código QR ya escaneado previamente'
                ));
            }
            
            // Actualizar el estado del QR como escaneado
            booking.qrCodeScanStatus = true;
            booking.qrCodeScanDate = new Date();
            await booking.save();
            
            // Buscar más datos para la respuesta
            const user = await User.findById(booking.user_id).select('username email fullname');
            
            return res.status(200).json(new ApiResponse(
                200,
                {
                    valid: true,
                    booking: {
                        id: booking._id,
                        event_id: booking.event_id,
                        seatNumbers: booking.seatNumbers,
                        ticketType: booking.ticketType || 'standard',
                        user: {
                            id: user._id,
                            name: user.fullname || user.username,
                            email: user.email
                        },
                        scanned: true,
                        scannedAt: booking.qrCodeScanDate
                    }
                },
                'Código QR válido y escaneado exitosamente'
            ));
            
        } catch (error) {
            console.error('Error al escanear código QR:', error);
            
            // Manejo específico de errores de JWT
            if (error.name === 'TokenExpiredError') {
                throw new ApiError(401, 'El código QR ha expirado');
            } else if (error.name === 'JsonWebTokenError') {
                throw new ApiError(401, 'Código QR inválido');
            }
            
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error al procesar el código QR');
        }
    }),

//         try {
//             const event = await Event.findById(event_id);
//             if (!event) {
//                 return res.status(404).json({ message: "Event not found" });
//             }

//             // Check if any requested seats are already reserved
//             const alreadyReservedSeats = seatNumbers.filter(seat => event.reservedSeats.includes(seat));
//             if (alreadyReservedSeats.length > 0) {
//                 return res.status(400).json({
//                     message: "Some of the selected seats are already reserved",
//                     alreadyReservedSeats,
//                 });
//             }

//             // Create a Stripe session with booking details
//             const session = await stripeClient.checkout.sessions.create({
//                 payment_method_types: ['card'],
//                 line_items: [
//                     {
//                         price_data: {
//                             currency: 'usd',
//                             product_data: {
//                                 name: `Booking for ${event.name}`,
//                                 description: `Venue: ${event.venue}, Seats Numbers: ${seatNumbers.join(',')}`,
//                             },
//                             unit_amount: totalPrice * 100, // Amount in cents
//                         },
//                         quantity: 1,
//                     },
//                 ],
//                 mode: 'payment',
//                 // success_url: `${process.env.BASE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
//                 // cancel_url: `${process.env.BASE_URL}/booking/cancel`,
//                     success_url: `https://demoticket.inasnapmarketing.ai/wallet?session_id={CHECKOUT_SESSION_ID}`,
//                  cancel_url: `https://www.google.co.uk/`,
//                 metadata: {
//                     user_id,
//                     event_id,
//                     bookingDate,
//                     guestSize,
//                     seatNumbers: JSON.stringify(seatNumbers),
//                     totalPrice,
//                 },
//             });

//             res.status(200).json({ stripeUrl: session.url });
//         } catch (error) {
//             console.error('Error creating Stripe session for booking:', error);
//             res.status(500).json({ message: 'Internal server error', error: error.message });
//         }
//     },

//     /**
//      * Handle Stripe webhook for payment completion.
//      */
//     handleStripeWebhook: async (req, res) => {
//         const sig = req.headers['stripe-signature'];
//         let stripeEvent;

//         try {
//             stripeEvent = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//         } catch (err) {
//             console.error('Webhook signature verification failed:', err.message);
//             return res.status(400).send(`Webhook Error: ${err.message}`);
//         }

//         if (stripeEvent.type === 'checkout.session.completed') {
//             const session = stripeEvent.data.object;

//             if (session.payment_status === 'paid' && session.status === 'complete') {
//                 const {
//                     user_id,
//                     event_id,
//                     bookingDate,
//                     guestSize,
//                     seatNumbers,
//                     totalPrice,
//                 } = session.metadata;

//                 try {
                 
//   // Fetch the event
//   const event = await Event.findById(event_id);
//   if (!event) {
//       console.error('Event not found during booking creation.');
//       return res.status(404).json({ message: "Event not found" });
//   }

//   const seats = JSON.parse(seatNumbers);

//   // Check if any seats are already reserved
//   const alreadyReservedSeats = seats.filter(seat => event.reservedSeats.includes(seat));
//   if (alreadyReservedSeats.length > 0) {
//       console.error('Some of the selected seats are already reserved.');
//       return res.status(400).json({
//           message: "Some of the selected seats are already reserved",
//           alreadyReservedSeats,
//       });
//   }

//   // Add new reserved seats to the event
//   event.reservedSeats.push(...seats);
//   await event.save();

                  
//   const tokenPayload = {
//     bookingId: session.id,
//     eventId: event._id,
//     userId: user_id,
//     organizerId: event.user_id, // Event organizer's ID
// };


// const eventDateTime = new Date(event.eventDate).getTime(); 
// const tokenExpiryTime = Math.floor((eventDateTime + 24 * 60 * 60 * 1000) / 1000); // Add 24 hours, convert to seconds

// const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, {
//     expiresIn: tokenExpiryTime - Math.floor(Date.now() / 1000), // Time until 24 hours after event date
// });
// // Generate QR code data
// const qrCodeData = JSON.stringify({
//     eventName: event.name,
//     Address: event.address,
//     Venue: event.venue,
//     seatNumbers,
//     Total_Payments:totalPrice,
//     bookingId: session.id,
// });
// const qrCodeBase64 = await QRCode.toDataURL(qrCodeData);
// // Upload QR code to Cloudinary
// const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
//     folder: "event_bookings",
//     public_id: `booking_${session.id}`,
// });
//                     // Create the booking in the database
//                     const newBooking = new Booking({
//                         user_id,
//                         event_id,
//                         bookingDate,
//                         guestSize,
//                         seatNumbers: seats,
//                         totalPrice,
//                         qrCodeToken: token, 
//                         qrCodeScanStatus: false,
//                         qrCodeUrl: qrCodeUploadResponse.secure_url,
//                         paymentStatus: 'paid',
//                         paymentDetails: {
//                             paymentIntentId: session.payment_intent,
//                             sessionStorageId: session.id,
//                             paymentMethod: session.payment_method_types[0],
//                         },
//                     });

//                     await newBooking.save();

//                     console.log(`Booking ${newBooking._id} created successfully after payment.`);
//                 } catch (error) {
//                     console.error('Error creating booking after payment:', error);
//                     return res.status(500).json({ message: 'Error creating booking after payment' });
//                 }
//             }
//         }

//         res.status(200).json({ received: true });
//     },
  

// sessionBookingDetails: async (req, res) => {
//     const { session_id } = req.query;

//     if (!session_id) {
//         return res.status(400).json({ message: "Session ID is required" });
//     }
//     try {
//         // Find the booking by the Stripe session_id (paymentIntentId)
//         const booking = await Booking.findOne({ "paymentDetails.sessionStorageId": session_id });

//         if (!booking) {
//             return res.status(404).json({ message: "Booking not found" });
//         }

//         const event = await Event.findOne({ _id: booking.event_id });
//         const user = await User.findOne({ _id: booking.user_id });

//         // Generate the PDF
//         const doc = new PDFDocument({ margin: 50 });
//         const filePath = `booking-${booking._id}.pdf`;
//         const writeStream = fs.createWriteStream(filePath);

//         doc.pipe(writeStream);

//         // Header Section
//         doc.rect(0, 0, doc.page.width, 80).fill('#2C3E50'); // Dark Blue Header
//         doc.fillColor('#ECF0F1').fontSize(26).text('Event Booking Confirmation', 50, 30, { align: 'center' });

//         // Sub-header
//         doc.moveDown(2).fillColor('#34495E').fontSize(18).text('Booking Summary', 50, 100, { align: 'left', underline: true });

//         // Booking Information
//         doc.moveDown(1);
//         doc.fillColor('black').fontSize(14).text(`Booking ID:`, { continued: true }).font('Helvetica-Bold').text(` ${booking._id}`);
//         doc.font('Helvetica').text(`Event Name:`, { continued: true }).font('Helvetica-Bold').text(` ${event.name}`);
//         doc.font('Helvetica').text(`User Name:`, { continued: true }).font('Helvetica-Bold').text(` ${user.username}`);
//         doc.font('Helvetica').text(`Booking Date:`, { continued: true }).font('Helvetica-Bold').text(` ${new Date(booking.bookingDate).toLocaleString()}`);
//         doc.font('Helvetica').text(`Booked Seats:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.guestSize}`);
//         doc.font('Helvetica').text(`Seat Numbers:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.seatNumbers.join(', ')}`);
//         doc.font('Helvetica').text(`Total Price:`, { continued: true }).font('Helvetica-Bold').text(` $${booking.totalPrice}`);
//         doc.font('Helvetica').text(`Payment Status:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.paymentStatus}`);

//         // Divider
//         doc.moveDown(1).strokeColor('#BDC3C7').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();

//         // QR Code Section
//         doc.moveDown(2).fillColor('#34495E').fontSize(18).text('Scan Your QR Code', { align: 'left', underline: true });
//         const qrCodeDataURL = await QRCode.toDataURL(booking.qrCodeUrl || 'No QR code available');
//         const qrCodeImage = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
//         doc.image(qrCodeImage, 50, doc.y + 20, { fit: [150, 150], align: 'center' });
//         doc.moveDown(12);

//         // Note Section
//        // doc.rect(50, doc.y-10, 500, 100).fill('#F39C12').stroke('#E67E22').lineWidth(2).stroke();
//         doc.fillColor('black').fontSize(12).text(
//             'Important Note:\nPlease bring this document to the event and present the QR code at the entrance. ' +
//             'Your booking details and QR code are unique to you. Keep this document safe.',
//             50,
//             doc.y - 0,
//             { width: 480, align: 'justify' }
//         );

//         // Footer
//         doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill('#2C3E50');
//         doc.fillColor('#ECF0F1').fontSize(10).text(
//             'Thank you for booking with us! For inquiries, contact support@example.com',
//             50,
//             doc.page.height - 40,
//             { align: 'center' }
//         );

//         doc.end();

//         writeStream.on('finish', () => {
//             // Send the PDF as a response
//             res.setHeader('Content-Type', 'application/pdf');
//             res.setHeader('Content-Disposition', `attachment; filename=${filePath}`);
//             res.sendFile(filePath, { root: '.' }, (err) => {
//                 if (err) {
//                     console.error('Error sending PDF:', err);
//                 }
//                 // Cleanup the generated file
//                 fs.unlinkSync(filePath);
//             });
//         });

//     } catch (error) {
//         console.error('Error fetching booking details:', error);
//         res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// },


//     scannedQRCode:async (req, res) => {
//         const { bookingId } = req.body; // Extract only the booking ID from the request
    
//         try {
//             // Fetch the booking
//             const booking = await Booking.findById(bookingId);
//             if (!booking) {
//                 return res.status(404).json({ message: "Booking not found" });
//             }
    
//             // Verify the token stored in the booking record
//             const decoded = jwt.verify(booking.qrCodeToken, process.env.JWT_SECRET_KEY);
    
//             // Fetch the related event to validate organizer ID
//             const event = await Event.findById(booking.event_id);
//             if (!event || event.organizerId !== decoded.organizerId) {
//                 return res.status(403).json({ message: "Unauthorized access to scan QR code" });
//             }
    
//             // Check if the QR code has already been scanned
//             if (booking.qrCodeScanStatus) {
//                 return res.status(400).json({ message: "QR code has already been scanned" });
//             }
    
//             // Mark the QR code as scanned
//             booking.qrCodeScanStatus = true;
//             await booking.save();
    
//             res.status(200).json({ message: "QR code scanned successfully" });
//         } catch (error) {
//             console.error('QR code validation error:', error);
//             if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
//                 return res.status(400).json({ message: "Invalid or expired QR code" });
//             }
//             res.status(500).json({ message: "Internal server error" });
//         }
//     }
    
// };
    //         const session = await stripeClient.checkout.sessions.create({
    //             payment_method_types: ['card'],
    //             line_items: [
    //                 {
    //                     price_data: {
    //                         currency: 'usd',
    //                         product_data: {
    //                             name: `Booking for ${event.name}`,
    //                             description: `Venue: ${event.venue}, Seat Numbers: ${seatNumbers.join(',')}`,
    //                         },
    //                         unit_amount: totalPrice * 100, // Amount in cents
    //                     },
    //                     quantity: 1,
    //                 },
    //             ],
    //             mode: 'payment',
    //             success_url: `https://demoticket.inasnapmarketing.ai/wallet?session_id={CHECKOUT_SESSION_ID}`,
    //             cancel_url: `https://www.google.co.uk/`,
    //             metadata: {
    //                 user_id,
    //                 event_id,
    //                 bookingDate,
    //                 guestSize,
    //                 seatNumbers: JSON.stringify(seatNumbers),
    //                 totalPrice,
    //             },
    //         });

    //         res.status(200).json({ stripeUrl: session.url });
    //     } catch (error) {
    //         console.error('Error creating Stripe session for booking:', error);
    //         res.status(500).json({ message: 'Internal server error', error: error.message });
    //     }
    // },
    createStripeSession: async (req, res) => {
        const { user_id, event_id, bookingDate, guestSize, seatNumbers, totalPrice } = req.body;
    
        try {
            // Find the event to book
            const event = await Event.findById(event_id);
            if (!event) {
                return res.status(404).json({ message: "Event not found" });
            }
    
            // Get all bookings for the same event and date
            const existingBookings = await Booking.find({ 
                event_id, 
                bookingDate 
            });
    
            // Collect all reserved seats for this event and date
            const reservedSeats = existingBookings.flatMap(booking => booking.seatNumbers);
    
            // Check if any requested seats are already reserved
            const alreadyReservedSeats = seatNumbers.filter(seat => reservedSeats.includes(seat));
            if (alreadyReservedSeats.length > 0) {
                return res.status(400).json({
                    message: "Some of the selected seats are already reserved",
                    alreadyReservedSeats,
                });
            }
    
            // Create a Stripe session for payment
            const session = await stripeClient.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `Booking for ${event.name}`,
                                description: `Venue: ${event.venue}, Seat Numbers: ${seatNumbers.join(',')}`,
                            },
                            unit_amount: totalPrice * 100, // Amount in cents
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `https://demoticket.inasnapmarketing.ai/wallet?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `https://demoticket.inasnapmarketing.ai/events`,
                metadata: {
                    user_id,
                    event_id,
                    bookingDate,
                    guestSize,
                    seatNumbers: JSON.stringify(seatNumbers),
                    totalPrice,
                },
            });
    
            res.status(200).json({ stripeUrl: session.url });
        } catch (error) {
            console.error('Error creating Stripe session for booking:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    },
    createStripeSessionMob: async (req, res) => {
        const { user_id, event_id, bookingDate, guestSize, seatNumbers, totalPrice } = req.body;
    
        try {
            // Find the event to book
            const event = await Event.findById(event_id);
            if (!event) {
                return res.status(404).json({ message: "Event not found" });
            }
    
            // Get all bookings for the same event and date
            const existingBookings = await Booking.find({ 
                event_id, 
                bookingDate 
            });
    
            // Collect all reserved seats for this event and date
            const reservedSeats = existingBookings.flatMap(booking => booking.seatNumbers);
    
            // Check if any requested seats are already reserved
            const alreadyReservedSeats = seatNumbers.filter(seat => reservedSeats.includes(seat));
            if (alreadyReservedSeats.length > 0) {
                return res.status(400).json({
                    message: "Some of the selected seats are already reserved",
                    alreadyReservedSeats,
                });
            }
    
            // Create a Stripe session for payment
            const session = await stripeClient.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `Booking for ${event.name}`,
                                description: `Venue: ${event.venue}, Seat Numbers: ${seatNumbers.join(',')}`,
                            },
                            unit_amount: totalPrice * 100, // Amount in cents
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `https://demoticket.inasnapmarketing.ai/congrtspaymentsuccess`,
                cancel_url: `https://demoticket.inasnapmarketing.ai/events`,
                metadata: {
                    user_id,
                    event_id,
                    bookingDate,
                    guestSize,
                    seatNumbers: JSON.stringify(seatNumbers),
                    totalPrice,
                },
            });
    
            res.status(200).json({ stripeUrl: session.url });
        } catch (error) {
            console.error('Error creating Stripe session for booking:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    },
    
    /**
     * Handle Stripe webhook to manage payment completion and create booking.
    //  */
    // handleStripeWebhook: async (req, res) => {
    //     const sig = req.headers['stripe-signature'];
    //     let stripeEvent;

    //     try {
    //         // Construct the Stripe event
    //         stripeEvent = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    //     } catch (err) {
    //         console.error('Webhook signature verification failed:', err.message);
    //         return res.status(400).send(`Webhook Error: ${err.message}`);
    //     }

    //     if (stripeEvent.type === 'checkout.session.completed') {
    //         const session = stripeEvent.data.object;

    //         if (session.payment_status === 'paid' && session.status === 'complete') {
    //             const {
    //                 user_id,
    //                 event_id,
    //                 bookingDate,
    //                 guestSize,
    //                 seatNumbers,
    //                 totalPrice,
    //             } = session.metadata;

    //             try {
    //                 // Fetch event details
    //                 const event = await Event.findById(event_id);
    //                 if (!event) {
    //                     console.error('Event not found during booking creation.');
    //                     return res.status(404).json({ message: "Event not found" });
    //                 }

    //                 // Parse seat numbers and check for availability
    //                 const seats = JSON.parse(seatNumbers);
    //                 const alreadyReservedSeats = seats.filter(seat => event.reservedSeats.includes(seat));
    //                 if (alreadyReservedSeats.length > 0) {
    //                     console.error('Some of the selected seats are already reserved.');
    //                     return res.status(400).json({
    //                         message: "Some of the selected seats are already reserved",
    //                         alreadyReservedSeats,
    //                     });
    //                 }

    //                 // Update event with reserved seats
    //                 event.reservedSeats.push(...seats);
    //                 await event.save();

    //                 // Generate a JWT token for the booking and expiry time
    //                 const tokenPayload = {
    //                     bookingId: session.id,
    //                     eventId: event._id,
    //                     userId: user_id,
    //                     organizerId: event.user_id,
    //                 };
    //                 const eventDateTime = new Date(event.eventDate).getTime();
    //                 const tokenExpiryTime = Math.floor((eventDateTime + 24 * 60 * 60 * 1000) / 1000); // Add 24 hours, convert to seconds

    //                 const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, {
    //                     expiresIn: tokenExpiryTime - Math.floor(Date.now() / 1000), // Time until 24 hours after event date
    //                 });

    //                 // Generate a QR code for the booking
    //                 const qrCodeData = JSON.stringify({
    //                     eventName: event.name,
    //                     Address: event.address,
    //                     Venue: event.venue,
    //                     seatNumbers,
    //                     Total_Payments: totalPrice,
    //                     bookingId: session.id,
    //                 });
    //                 const qrCodeBase64 = await QRCode.toDataURL(qrCodeData);
    //                 const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
    //                     folder: "event_bookings",
    //                     public_id: `booking_${session.id}`,
    //                 });

    //                 // Create and save the booking record
    //                 const newBooking = new Booking({
    //                     user_id,
    //                     event_id,
    //                     bookingDate,
    //                     guestSize,
    //                     seatNumbers: seats,
    //                     totalPrice,
    //                     qrCodeToken: token,
    //                     qrCodeScanStatus: false,
    //                     qrCodeUrl: qrCodeUploadResponse.secure_url,
    //                     paymentStatus: 'paid',
    //                     paymentDetails: {
    //                         paymentIntentId: session.payment_intent,
    //                         sessionStorageId: session.id,
    //                         paymentMethod: session.payment_method_types[0],
    //                     },
    //                 });

    //                 await newBooking.save();
    //                 console.log(`Booking ${newBooking._id} created successfully after payment.`);
    //             } catch (error) {
    //                 console.error('Error creating booking after payment:', error);
    //                 return res.status(500).json({ message: 'Error creating booking after payment' });
    //             }
    //         }
    //     }

    //     res.status(200).json({ received: true });
    // },
//...........................................with incripted method of qr code .......................
// Encryption utility for QR code data

//  handleStripeWebhook : async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     let stripeEvent;

//     try {
//         stripeEvent = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     } catch (err) {
//         console.error('Webhook signature verification failed:', err.message);
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//     }
//     if (stripeEvent.type === 'checkout.session.completed') {
//         const session = stripeEvent.data.object;

//         if (session.payment_status === 'paid' && session.status === 'complete') {
//             const {
//                 user_id,
//                 event_id,
//                 bookingDate,
//                 guestSize,
//                 seatNumbers,
//                 totalPrice,
//             } = session.metadata;

//             try {
//                 const event = await Event.findById(event_id);
//                 if (!event) {
//                     console.error('Event not found during booking creation.');
//                     return res.status(404).json({ message: "Event not found" });
//                 }
//                 const seats = JSON.parse(seatNumbers);
//                 const alreadyReservedSeats = seats.filter(seat => event.reservedSeats.includes(seat));
//                 if (alreadyReservedSeats.length > 0) {
//                     console.error('Some of the selected seats are already reserved.');
//                     return res.status(400).json({
//                         message: "Some of the selected seats are already reserved",
//                         alreadyReservedSeats,
//                     });
//                 }
//                 event.reservedSeats.push(...seats);
//                 await event.save();

//                 const newBooking = new Booking({
//                     user_id,
//                     event_id,
//                     bookingDate,
//                     guestSize,
//                     seatNumbers: seats,
//                     totalPrice,
//                     paymentStatus: 'paid',
//                     paymentDetails: {
//                         paymentIntentId: session.payment_intent,
//                         sessionId: session.id,
//                         paymentMethod: session.payment_method_types[0],
//                     },
//                 });

//                 const savedBooking = await newBooking.save();

//                 // Encrypt QR code data
//                 const secretKey = process.env.QR_SECRET_KEY;
//                 const qrCodeData = JSON.stringify({
//                     bookingId: savedBooking._id,
//                     event: event.name,
//                     user: user_id,
//                     date: bookingDate,
//                     totalPrice,
//                 });

//                 const encryptedData = encrypt(qrCodeData, secretKey);

//                 // Create QR code payload with custom error message
//                 const qrCodePayload = {
//                     errorMessage: "Invalid QR Code. Please contact the event organizer.",
//                     data: encryptedData,
//                 };

//                 // Generate QR code as Base64
//                 const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrCodePayload));

//                 // Upload QR code to Cloudinary
//                 const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
//                     folder: "event_bookings",
//                     public_id: `booking_${savedBooking._id}`,
//                 });
//                 // Add QR code URL to booking
//                 savedBooking.qrCodeUrl = qrCodeUploadResponse.secure_url;
//                 await savedBooking.save();
//                 console.log(`Booking ${savedBooking._id} created successfully with QR code.`);
//             } catch (error) {
//                 console.error('Error creating booking after payment:', error);
//                 return res.status(500).json({ message: 'Error creating booking after payment' });
//             }
//         }
//     }
//     res.status(200).json({ received: true });
// },
// handleStripeWebhook: async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     let stripeEvent;

//     try {
//         stripeEvent = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     } catch (err) {
//         console.error('Webhook signature verification failed:', err.message);
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     if (stripeEvent.type === 'checkout.session.completed') {
//         const session = stripeEvent.data.object;

//         if (session.payment_status === 'paid' && session.status === 'complete') {
//             const {
//                 user_id,
//                 event_id,
//                 bookingDate,
//                 guestSize,
//                 seatNumbers,
//                 totalPrice,
//             } = session.metadata;

//             try {
//                 // Find the event
//                 const event = await Event.findById(event_id);
//                 if (!event) {
//                     console.error('Event not found during booking creation.');
//                     return res.status(404).json({ message: "Event not found" });
//                 }

//                 // Ensure no seats are double-booked
//                 const existingBookings = await Booking.find({ event_id, bookingDate });
//                 const reservedSeats = existingBookings.flatMap(booking => booking.seatNumbers);

//                 const alreadyReservedSeats = JSON.parse(seatNumbers).filter(seat => reservedSeats.includes(seat));
//                 if (alreadyReservedSeats.length > 0) {
//                     console.error('Some of the selected seats are already reserved.');
//                     return res.status(400).json({
//                         message: "Some of the selected seats are already reserved",
//                         alreadyReservedSeats,
//                     });
//                 }
//                 // Create the new booking
//                 const newBooking = new Booking({
//                     user_id,
//                     event_id,
//                     bookingDate,
//                     guestSize,
//                     seatNumbers: JSON.parse(seatNumbers),
//                     totalPrice,
//                     paymentStatus: 'paid',
//                     paymentDetails: {
//                         paymentIntentId: session.payment_intent,
//                         sessionId: session.id,
//                         paymentMethod: session.payment_method_types[0],
//                     },
//                 });

//                 const savedBooking = await newBooking.save();

//                 // Generate QR code
//                 const secretKey = process.env.QR_SECRET_KEY;
//                 const qrCodeData = JSON.stringify({
//                     bookingId: savedBooking._id,
//                     event: event.name,
//                     user: user_id,
//                     date: bookingDate,
//                     totalPrice,
//                 });

//                 const encryptedData = encrypt(qrCodeData, secretKey);

//                 const qrCodePayload = {
//                     errorMessage: "Invalid QR Code. Please contact the event organizer.",
//                     data: encryptedData,
//                 };

//                 const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrCodePayload));

//                 // Upload QR code to Cloudinary
//                 const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
//                     folder: "event_bookings",
//                     public_id: `booking_${savedBooking._id}`,
//                 });

//                 savedBooking.qrCodeUrl = qrCodeUploadResponse.secure_url;
//                 await savedBooking.save();

//                 console.log(`Booking ${savedBooking._id} created successfully with QR code.`);
//             } catch (error) {
//                 console.error('Error creating booking after payment:', error);
//                 return res.status(500).json({ message: 'Error creating booking after payment' });
//             }
//         }
//     }
//     res.status(200).json({ received: true });
// },
handleStripeWebhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let stripeEvent;

    try {
        stripeEvent = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (stripeEvent.type === 'checkout.session.completed') {
        const session = stripeEvent.data.object;

        if (session.payment_status === 'paid' && session.status === 'complete') {
            const {
                user_id,
                event_id,
                bookingDate,
                guestSize,
                seatNumbers,
                totalPrice,
            } = session.metadata;

            try {
                // Find the event
                const event = await Event.findById(event_id);
                if (!event) {
                    console.error('Event not found during booking creation.');
                    return res.status(404).json({ message: "Event not found" });
                }

                // Determine which reservedSeats field to update
                let reservedSeatsField;
                if (new Date(bookingDate).getTime() === new Date(event.eventDate).getTime()) {
                    reservedSeatsField = 'reservedSeats';
                } else if (new Date(bookingDate).getTime() === new Date(event.eventDateSec).getTime()) {
                    reservedSeatsField = 'reservedSeatsSec';
                } else {
                    console.error('Booking date does not match any event date.');
                    return res.status(400).json({ message: "Invalid booking date" });
                }

                // Check if seats are already reserved for the selected date
                const alreadyReservedSeats = event[reservedSeatsField].filter(seat => 
                    JSON.parse(seatNumbers).includes(seat)
                );

                if (alreadyReservedSeats.length > 0) {
                    console.error('Some of the selected seats are already reserved.');
                    return res.status(400).json({
                        message: "Some of the selected seats are already reserved",
                        alreadyReservedSeats,
                    });
                }

                // Add the reserved seats to the correct array
                event[reservedSeatsField] = [
                    ...event[reservedSeatsField],
                    ...JSON.parse(seatNumbers),
                ];
                await event.save();

                // Create the new booking
                const newBooking = new Booking({
                    user_id,
                    event_id,
                    bookingDate,
                    guestSize,
                    seatNumbers: JSON.parse(seatNumbers),
                    totalPrice,
                    paymentStatus: 'paid',
                    paymentDetails: {
                        paymentIntentId: session.payment_intent,
                        sessionStorageId: session.id,
                        paymentMethod: session.payment_method_types[0],
                    },
                });

                const savedBooking = await newBooking.save();

                // Generate QR code
                const secretKey = process.env.QR_SECRET_KEY;
                const qrCodeData = JSON.stringify({
                    bookingId: savedBooking._id,
                    event: event.name,
                    user: user_id,
                    date: bookingDate,
                    totalPrice,
                });

                const encryptedData = encrypt(qrCodeData, secretKey);

                const qrCodePayload = {
                    errorMessage: "Invalid QR Code. Please contact the event organizer.",
                    data: encryptedData,
                };

                const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrCodePayload));

                // Upload QR code to Cloudinary
                const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
                    folder: "event_bookings",
                    public_id: `booking_${savedBooking._id}`,
                });

                savedBooking.qrCodeUrl = qrCodeUploadResponse.secure_url;
                await savedBooking.save();

                console.log(`Booking ${savedBooking._id} created successfully with QR code.`);
            } catch (error) {
                console.error('Error creating booking after payment:', error);
                return res.status(500).json({ message: 'Error creating booking after payment' });
            }
        }
    }
    res.status(200).json({ received: true });
},

    /**
     * Retrieve booking details using the Stripe session ID.
     */
    // sessionBookingDetails: async (req, res) => {
    //     const { session_id } = req.query;

    //     if (!session_id) {
    //         return res.status(400).json({ message: "Session ID is required" });
    //     }

    //     try {
    //         // Find the booking using Stripe session ID
    //         const booking = await Booking.findOne({ "paymentDetails.sessionStorageId": session_id });
    //         if (!booking) {
    //             return res.status(404).json({ message: "Booking not found" });
    //         }

    //         // Fetch associated event and user details
    //         const event = await Event.findOne({ _id: booking.event_id });
    //         const user = await User.findOne({ _id: booking.user_id });

    //         // Generate the booking PDF
    //         const doc = new PDFDocument({ margin: 50 });
    //         const filePath = `booking-${booking._id}.pdf`;
    //         const writeStream = fs.createWriteStream(filePath);
    //         doc.pipe(writeStream);

    //         // Header Section
    //         doc.rect(0, 0, doc.page.width, 80).fill('#2C3E50');
    //         doc.fillColor('#ECF0F1').fontSize(26).text('Event Booking Confirmation', 50, 30, { align: 'center' });

    //         // Sub-header
    //         doc.moveDown(2).fillColor('#34495E').fontSize(18).text('Booking Summary', 50, 100, { align: 'left', underline: true });

    //         // Booking Information
    //         doc.moveDown(1);
    //         doc.fillColor('black').fontSize(14).text(`Booking ID:`, { continued: true }).font('Helvetica-Bold').text(` ${booking._id}`);
    //         doc.font('Helvetica').text(`Event Name:`, { continued: true }).font('Helvetica-Bold').text(` ${event.name}`);
    //         doc.font('Helvetica').text(`User Name:`, { continued: true }).font('Helvetica-Bold').text(` ${user.username}`);
    //         doc.font('Helvetica').text(`Booking Date:`, { continued: true }).font('Helvetica-Bold').text(` ${new Date(booking.bookingDate).toLocaleString()}`);
    //         doc.font('Helvetica').text(`Booked Seats:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.guestSize}`);
    //         doc.font('Helvetica').text(`Seat Numbers:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.seatNumbers.join(', ')}`);
    //         doc.font('Helvetica').text(`Total Price:`, { continued: true }).font('Helvetica-Bold').text(` $${booking.totalPrice}`);
    //         doc.font('Helvetica').text(`Payment Status:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.paymentStatus}`);

    //         // Divider
    //         doc.moveDown(1).strokeColor('#BDC3C7').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    //         // QR Code Section
    //         doc.moveDown(2).fillColor('#34495E').fontSize(18).text('Scan Your QR Code', { align: 'left', underline: true });
    //         const qrCodeDataURL = await QRCode.toDataURL(booking.qrCodeUrl || 'No QR code available');
    //         const qrCodeImage = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
    //         doc.image(qrCodeImage, 50, doc.y + 20, { fit: [150, 150], align: 'center' });
    //         doc.moveDown(12);

    //         // Footer
    //         doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill('#2C3E50');
    //         doc.fillColor('#ECF0F1').fontSize(10).text('Thank you for booking with us! For inquiries, contact support@example.com', 50, doc.page.height - 40, { align: 'center' });

    //         doc.end();

    //         writeStream.on('finish', () => {
    //             res.setHeader('Content-Type', 'application/pdf');
    //             res.setHeader('Content-Disposition', `attachment; filename=${filePath}`);
    //             res.sendFile(filePath, { root: '.' }, (err) => {
    //                 if (err) {
    //                     console.error('Error sending PDF:', err);
    //                 }
    //                 // Cleanup the generated file
    //                 fs.unlinkSync(filePath);
    //             });
    //         });

    //     } catch (error) {
    //         console.error('Error fetching booking details:', error);
    //         res.status(500).json({ message: "Internal server error", error: error.message });
    //     }
    // },
    sessionBookingDetails: async (req, res) => {
        const { session_id } = req.query;
    
        if (!session_id) {
            return res.status(400).json({ message: "Session ID is required" });
        }
    
        try {
            // Find the booking using Stripe session ID
            const booking = await Booking.findOne({ "paymentDetails.sessionStorageId": session_id });
            if (!booking) {
                return res.status(404).json({ message: "Booking not found" });
            }
    
            // Fetch associated event and user details
            const event = await Event.findOne({ _id: booking.event_id });
            const user = await User.findOne({ _id: booking.user_id });
    
            // Generate the booking PDF
            const doc = new PDFDocument({ margin: 50 });
            const filePath = `booking-${booking._id}.pdf`;
            const writeStream = fs.createWriteStream(filePath);
            doc.pipe(writeStream);
    
            // Header Section
            doc.rect(0, 0, doc.page.width, 80).fill('#2C3E50');
            doc.fillColor('#ECF0F1').fontSize(26).text('Confirmación de Reserva de Evento', 50, 30, { align: 'center' });
    
            // Sub-header
            doc.moveDown(2).fillColor('#34495E').fontSize(18).text('Resumen de la Reserva', 50, 100, { align: 'left', underline: true });
    
            // Booking Information
            doc.moveDown(1);
            doc.fillColor('black').fontSize(14).text(`ID de Reserva:`, { continued: true }).font('Helvetica-Bold').text(` ${booking._id}`);
            doc.font('Helvetica').text(`Nombre del Evento:`, { continued: true }).font('Helvetica-Bold').text(` ${event.name}`);
            doc.font('Helvetica').text(`Nombre del Usuario:`, { continued: true }).font('Helvetica-Bold').text(` ${user.username}`);
            doc.font('Helvetica').text(`Fecha de Reserva:`, { continued: true }).font('Helvetica-Bold').text(` ${new Date(booking.bookingDate).toLocaleString()}`);
            doc.font('Helvetica').text(`Asientos Reservados:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.guestSize}`);
            doc.font('Helvetica').text(`Números de Asientos:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.seatNumbers.join(', ')}`);
            doc.font('Helvetica').text(`Precio Total:`, { continued: true }).font('Helvetica-Bold').text(` $${booking.totalPrice}`);
            doc.font('Helvetica').text(`Estado de Pago:`, { continued: true }).font('Helvetica-Bold').text(` ${booking.paymentStatus}`);
    
            // Divider
            doc.moveDown(1).strokeColor('#BDC3C7').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    
            // QR Code Section
            doc.moveDown(2).fillColor('#34495E').fontSize(18).text('Escanee su Código QR', { align: 'left', underline: true });
            const qrCodeDataURL = await QRCode.toDataURL(booking.qrCodeUrl || 'No QR code available');
            const qrCodeImage = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
            doc.image(qrCodeImage, 50, doc.y + 20, { fit: [150, 150], align: 'center' });
            doc.moveDown(12);
    
            // Footer
            doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill('#2C3E50');
            doc.fillColor('#ECF0F1').fontSize(10).text('¡Gracias por reservar con nosotros! Para consultas, contacte a support@example.com', 50, doc.page.height - 40, { align: 'center' });
    
            doc.end();
    
            writeStream.on('finish', () => {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=${filePath}`);
                res.sendFile(filePath, { root: '.' }, (err) => {
                    if (err) {
                        console.error('Error sending PDF:', err);
                    }
                    // Cleanup the generated file
                    fs.unlinkSync(filePath);
                });
            });
    
        } catch (error) {
            console.error('Error fetching booking details:', error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    },
    /**
     * Handle scanned QR code to mark it as scanned.
     */
    
    // scannedQRCode: async (req, res) => {
    //     const { qrCodeData, eventIdToVerify } = req.body; // Datos encriptados del código QR y ID del evento
    //     const secretKey = process.env.QR_SECRET_KEY;

    //     try {
    //         // Paso 1: Desencriptar los datos del código QR
    //         const decryptedData = decrypt(qrCodeData, secretKey);
    //         const parsedData = JSON.parse(decryptedData);

    //         const { bookingId, user, event, date } = parsedData;

    //         // Paso 2: Buscar la reserva en la base de datos
    //         const booking = await Booking.findById(bookingId)
    //             .populate('user_id', 'username email')
    //             .populate('event_id', 'name desc venue');

    //         if (!booking) {
    //             return res.status(404).json({ mensaje: "Reserva no encontrada" });
    //         }

    //         // Paso 3: Verificar si el código QR ya fue escaneado
    //         if (booking.qrCodeScanStatus) {
    //             return res.status(400).json({ mensaje: "El código QR ya fue escaneado" });
    //         }

    //         // Paso 4: Validar el evento relacionado con el ID del organizador o del evento
    //         const eventRecord = await Event.findById(booking.event_id);

    //         if (!eventRecord || eventRecord._id.toString() !== eventIdToVerify) {
    //             return res.status(403).json({ mensaje: "Acceso no autorizado para escanear el código QR" });
    //         }

    //         // Paso 5: Validación adicional (por ejemplo, coincidir usuario y detalles del evento)
    //         if (booking.user_id.username !== user || booking.event_id.name !== event) {
    //             return res.status(400).json({ mensaje: "Detalles del ticket no válidos" });
    //         }

    //         // Paso 6: Marcar el código QR como escaneado
    //         booking.qrCodeScanStatus = true;
    //         await booking.save();

    //         // Paso 7: Devolver la respuesta de éxito
    //         res.status(200).json({
    //             mensaje: "Código QR escaneado con éxito",
    //             datos: {
    //                 idReserva: booking._id,
    //                 usuario: booking.user_id.username,
    //                 evento: booking.event_id.name,
    //                 fecha: booking.bookingDate,
    //                 precioTotal: booking.totalPrice,
    //                 asientos: booking.seatNumbers,
    //             },
    //         });
    //     } catch (error) {
    //         console.error('Error al validar el código QR:', error);
    //         if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    //             return res.status(400).json({ mensaje: "Código QR inválido o expirado" });
    //         }
    //         res.status(500).json({ mensaje: "Error interno del servidor" });
    //     }
    // },
    scannedQRCode: async (req, res) => {
        const { data, eventIdToVerify } = req.body; // Datos encriptados del código QR y ID del evento
        const secretKey = process.env.QR_SECRET_KEY;

        try {
            // Paso 1: Desencriptar los datos del código QR
            const decryptedData = decrypt(data, secretKey);
            const parsedData = JSON.parse(decryptedData);
            const { bookingId, user, event, date,totalPrice } = parsedData;
            // Paso 2: Buscar la reserva en la base de datos
            const booking = await Booking.findById(bookingId)
                .populate('user_id', 'username email')
                .populate('event_id', 'name desc venue');
            if (!booking) {
                return res.status(404).json({ mensaje: "Reserva no encontrada" });
            }
            // Paso 3: Verificar si el código QR ya fue escaneado
            if (booking.qrCodeScanStatus) {
                return res.status(400).json({ mensaje: "El código QR ya fue escaneado" });
            }
            // Paso 4: Validar el evento relacionado con el ID del organizador o del evento
            const eventRecord = await Event.findById(booking.event_id);

            if (!eventRecord || eventRecord._id.toString() !== eventIdToVerify) {
                return res.status(403).json({ mensaje: "El boleto escaneado no es válido para el evento actual" });
            }

          
            // if (eventRecord.username !== user || eventRecord.name !== event) {
            //     return res.status(400).json({ mensaje: "Los datos del boleto no coinciden con el usuario o el evento." });
            // }

            // Paso 6: Marcar el código QR como escaneado
            booking.qrCodeScanStatus = true;
            await booking.save();

            // Paso 7: Devolver la respuesta de éxito
            res.status(200).json({
                mensaje: "Código QR escaneado con éxito",
                datos: {
                    idReserva: booking._id,
                    usuario: booking.user_id.username,
                    evento: booking.event_id.name,
                    fecha: booking.bookingDate,
                    precioTotal: booking.totalPrice,
                    asientos: booking.seatNumbers,
                },
            });
        } catch (error) {
            console.error('Error al validar el código QR:', error);
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(400).json({ mensaje: "Código QR inválido o expirado" });
            }
            res.status(500).json({ mensaje: "Error interno del servidor" });
        }
    },}