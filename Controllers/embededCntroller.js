import QRCode from 'qrcode';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Stripe from 'stripe';
import crypto from 'crypto';
import { sendBookingConfirmationEmail } from '../utils/emailService.js';
const encrypt = (data, secretKey) => {
    const keyBuffer = Buffer.from(secretKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};
const stripeClient = new Stripe('sk_test_51ONV2iDFtRPRKo4NMXKF8kcY6zbFGNe8NWiNQMn4SfZHYpycBQXWftfU9XmArl4HcKNlNwz7BAWwDgFog8prxTKl00d4fgM9Qy', { apiVersion: '2022-11-15' });
export const handleStripePayment = {
    /**
     * Embed Stripe Checkout session for booking an event.
     */
    createStripeSession: async (req, res) => {
        const { user_id, event_id, bookingDate, guestSize, seatNumbers, totalPrice } = req.body;

        try {
            const event = await Event.findById(event_id);
            if (!event) {
                return res.status(404).json({ message: "Event not found" });
            }
            const alreadyReservedSeats = seatNumbers.filter(seat => event.reservedSeats.includes(seat));
            if (alreadyReservedSeats.length > 0) {
                return res.status(400).json({
                    message: "Some of the selected seats are already reserved",
                    alreadyReservedSeats,
                });
            }
            const session = await stripeClient.checkout.sessions.create({
                ui_mode: 'embedded',
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `Booking for ${event.name}`,
                                description: `Venue: ${event.venue}, Seat Numbers: ${seatNumbers.join(',')}`,
                            },
                            unit_amount: totalPrice * 100,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                return_url: `${req.protocol}://${req.get('host')}/return?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
                metadata: {
                    user_id,
                    event_id,
                    bookingDate,
                    guestSize,
                    seatNumbers: JSON.stringify(seatNumbers),
                    totalPrice,
                },
            });

            res.status(200).json({ clientSecret: session.client_secret });
        } catch (error) {
            console.error('Error creating Stripe session for booking:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    },

    /**
     * Handle Stripe webhook events.
     */
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
                const { user_id, event_id, bookingDate, guestSize, seatNumbers, totalPrice } = session.metadata;

                try {
                    const event = await Event.findById(event_id);
                    if (!event) {
                        console.error('Event not found during booking creation.');
                        return;
                    }
                    const seats = JSON.parse(seatNumbers);
                    const alreadyReservedSeats = seats.filter(seat => event.reservedSeats.includes(seat));
                    if (alreadyReservedSeats.length > 0) {
                        console.error('Some of the selected seats are already reserved.');
                        return;
                    }
                    event.reservedSeats.push(...seats);
                    await event.save();

                    const newBooking = new Booking({
                        user_id,
                        event_id,
                        bookingDate,
                        guestSize,
                        seatNumbers: seats,
                        totalPrice,
                        paymentStatus: 'paid',
                        paymentDetails: {
                            paymentIntentId: session.payment_intent,
                            sessionId: session.id,
                            paymentMethod: session.payment_method_types[0],
                        },
                    });
                    const savedBooking = await newBooking.save();
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
                    const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
                        folder: "event_bookings",
                        public_id: `booking_${savedBooking._id}`,
                    });
                    savedBooking.qrCodeUrl = qrCodeUploadResponse.secure_url;
                    await savedBooking.save();
                    console.log(`Booking ${savedBooking._id} created successfully with QR code.`);
                    
                    // Buscar información del usuario para el correo
                    try {
                        const user = await User.findById(user_id);
                        if (user && user.email) {
                            // Enviar correo de confirmación
                            const emailResult = await sendBookingConfirmationEmail(
                                savedBooking,
                                user,
                                event
                            );
                            console.log('Correo de confirmación enviado:', emailResult);
                        } else {
                            console.log('No se pudo enviar correo: información de usuario incompleta');
                        }
                    } catch (emailError) {
                        console.error('Error al enviar correo de confirmación:', emailError);
                    }
                } catch (error) {
                    console.error('Error creating booking after payment:', error);
                }
            }
        }

        res.status(200).json({ received: true });
    },
};
