import express from "express";
import { verifyAdmin, verifyUser, verifyJWT, verifyOrganizer } from "../utils/verifyToken.js";
import { 
    createBooking, 
    deleteBooking, 
    getUserBookings, 
    getEventBookings,
    getAllBookings, 
    getBooking, 
    updateBooking 
} from "../Controllers/bookingController.js";
import { handleStripePayment } from '../Controllers/stripControllers.js';

const router = express.Router();

// Ruta webhook debe ir antes de cualquier middleware que parsee el cuerpo como JSON
// Ya se configura en index.mjs antes de los middlewares de parseo

// Rutas básicas de reservas
router.post('/create', verifyJWT, createBooking);
router.get('/getbooking', verifyJWT, getBooking);
router.get('/getuserbooking', verifyJWT, getUserBookings);
router.get('/geteventbooking', verifyJWT, getEventBookings);
router.get('/getallbookings', verifyJWT, verifyAdmin, getAllBookings);
router.put('/update', verifyJWT, updateBooking);
router.delete('/:id', verifyJWT, verifyAdmin, deleteBooking);

// Rutas de Stripe
router.post('/create-stripe-session', verifyJWT, handleStripePayment.createStripeSession);
router.get('/session/:sessionId', verifyJWT, handleStripePayment.getSessionBookingDetails);
router.post('/scan-qr', verifyJWT, verifyOrganizer, handleStripePayment.scanQRCode);

// Rutas existentes que se mantienen por compatibilidad
router.get('/sessionBookingDetails', verifyJWT, handleStripePayment.getSessionBookingDetails);


export default router
