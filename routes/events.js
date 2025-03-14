import express from "express";
import { verifyAdmin, verifyJWT } from "../utils/verifyToken.js";
import { 
    createNewEvent,
    getEventsByTimeAndName, 
    publishEvent,
    deleteEvent, 
    getAllEvents, 
    getFeaturedEvents, 
    getWalkInEvents, 
    getSingleEvent, 
    getEventsBySearch, 
    getEventsCount, 
    updateEvent, 
    getUserEvents, 
    featureEvent 
} from "../Controllers/eventController.js";
import { sendEventReminders } from "../utils/eventReminder.js";
import multer from 'multer';
import { ApiResponse } from "../utils/ApiResponse.js";

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

// Rutas principales de eventos
router.post('/createEvent', upload.any(), verifyJWT, createNewEvent);
router.put('/updateEvent', upload.any(), updateEvent);
router.patch('/publishedEvent', publishEvent);
router.patch('/featuredEvent', featureEvent);
router.delete('/:id', deleteEvent);
router.get('/getsingleEvent', getSingleEvent);
router.get('/getuserEvent', verifyJWT, getUserEvents);
router.get('/walk-in', getWalkInEvents);
router.get('/getAllEvents', getAllEvents);

// Búsqueda y filtrado
router.get('/search/getEventBySearch', getEventsBySearch);
router.get('/search/getFeaturedEvents', getFeaturedEvents);
router.get('/search/getEventCount', getEventsCount);
router.get('/search/getEventbytime', getEventsByTimeAndName);

// Sistema de recordatorios - solo accesible para administradores
router.post('/send-reminders', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const result = await sendEventReminders();
        
        if (result.success) {
            return res.status(200).json(new ApiResponse(
                200,
                result,
                'Recordatorios de eventos enviados correctamente'
            ));
        } else {
            return res.status(500).json(new ApiResponse(
                500,
                null,
                result.message || 'Error al enviar recordatorios'
            ));
        }
    } catch (error) {
        console.error('Error al ejecutar recordatorios de eventos:', error);
        return res.status(500).json(new ApiResponse(
            500,
            null,
            'Error al procesar recordatorios de eventos'
        ));
    }
});

export default router
