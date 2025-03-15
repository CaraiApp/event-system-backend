import express from 'express';
import { verifyJWT, verifyAdmin, verifyOrganizer } from '../utils/verifyToken.js';
import organizerController from '../Controllers/dashboard/organizerController.js';
import adminController from '../Controllers/dashboard/adminController.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Ruta para proporcionar configuración UI al frontend
router.get('/ui-config', (req, res) => {
    const route = req.query.route || '';
    let uiConfig = { hideHeader: false, hideFooter: false };
    
    if (route.includes('/admin') || route.includes('/organizer')) {
        uiConfig = {
            hideHeader: true,
            hideFooter: true,
            isDashboard: true,
            dashboardType: route.includes('/admin') ? 'admin' : 'organizer'
        };
    }
    
    return res.status(200).json(new ApiResponse(
        200,
        uiConfig,
        'UI configuration retrieved successfully'
    ));
});

// Organizer Dashboard Routes
router.get('/organizer/overview', verifyJWT, verifyOrganizer, organizerController.getOrganizerDashboardOverview);
router.get('/organizer/event-analytics/:eventId', verifyJWT, verifyOrganizer, organizerController.getEventAnalytics);
router.get('/organizer/financial-overview', verifyJWT, verifyOrganizer, organizerController.getFinancialOverview);
router.get('/organizer/attendees', verifyJWT, verifyOrganizer, organizerController.getAttendeesData);
router.patch('/organizer/attendees/:bookingId/check-in', verifyJWT, verifyOrganizer, organizerController.updateAttendeeCheckIn);
router.get('/organizer/attendees/export', verifyJWT, verifyOrganizer, organizerController.exportAttendeesList);

// New enhanced organizer dashboard routes
router.get('/organizer/sales-report', verifyJWT, verifyOrganizer, organizerController.getSalesReport);
router.get('/organizer/commissions', verifyJWT, verifyOrganizer, organizerController.getCommissionDetails);
router.get('/organizer/occupancy', verifyJWT, verifyOrganizer, organizerController.getOccupancyAnalytics);

// Admin Dashboard Routes
router.get('/admin/overview', verifyJWT, verifyAdmin, adminController.getAdminDashboardOverview);

// User Management
router.get('/admin/users', verifyJWT, verifyAdmin, adminController.getUserManagementData);
router.patch('/admin/users/:userId', verifyJWT, verifyAdmin, adminController.updateUser);
router.delete('/admin/users/:userId', verifyJWT, verifyAdmin, adminController.deleteUser);

// Ruta específica para gestión de organizadores
// Usamos el mismo controlador pero la URL se detectará diferente
router.get('/admin/organizers', verifyJWT, verifyAdmin, adminController.getUserManagementData);

// Event Management
router.get('/admin/events', verifyJWT, verifyAdmin, adminController.getEventManagementData);
router.patch('/admin/events/:eventId/status', verifyJWT, verifyAdmin, adminController.updateEventStatus);
router.patch('/admin/events/:eventId/featured', verifyJWT, verifyAdmin, adminController.toggleEventFeatured);
router.delete('/admin/events/:eventId', verifyJWT, verifyAdmin, adminController.deleteEvent);

// Category Management
router.get('/admin/categories', verifyJWT, verifyAdmin, adminController.getCategoryManagementData);

// Reports and Analytics
router.get('/admin/reports', verifyJWT, verifyAdmin, adminController.getSystemReports);
router.get('/admin/activity-log', verifyJWT, verifyAdmin, adminController.getActivityLog);
router.get('/admin/performance', verifyJWT, verifyAdmin, adminController.getSystemPerformance);

// Communications with Organizers
router.get('/admin/communications', verifyJWT, verifyAdmin, adminController.getCommunicationHistory);
router.post('/admin/communications', verifyJWT, verifyAdmin, adminController.sendCommunication);

// System Settings
router.get('/admin/settings', verifyJWT, verifyAdmin, adminController.getSystemSettings);
router.put('/admin/settings', verifyJWT, verifyAdmin, adminController.updateSystemSettings);

// Email Settings - Middleware opcional
// Creamos middleware personalizado que intenta verificar, pero no rechaza si no hay token
const optionalJWTMiddleware = (req, res, next) => {
    // Si no hay token, solo continúa sin usuario autenticado
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        console.log("Acceso sin autenticación a configuración de correo");
        return next();
    }
    
    // Si hay token, intenta verificarlo y agregar req.user
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
        User.findById(decodedToken?.id).select("-password")
            .then(user => {
                if (user) {
                    req.user = user;
                }
                next();
            })
            .catch(err => {
                console.log("Error al buscar usuario:", err.message);
                next(); // Sigue adelante incluso si hay error
            });
    } catch (error) {
        console.log("Token inválido, continuando sin autenticación:", error.message);
        next(); // Sigue adelante incluso si el token es inválido
    }
};

// Rutas de configuración de correo con autenticación opcional
router.get('/admin/settings/email', optionalJWTMiddleware, adminController.getEmailSettings);
router.put('/admin/settings/email', verifyJWT, verifyAdmin, adminController.updateEmailSettings);
router.post('/admin/send-test-email', verifyJWT, verifyAdmin, adminController.sendTestEmail);

// Rutas alternativas también con autenticación opcional
router.get('/email/config', optionalJWTMiddleware, adminController.getEmailSettings);
router.put('/email/config', verifyJWT, verifyAdmin, adminController.updateEmailSettings);
router.post('/email/test', verifyJWT, verifyAdmin, adminController.sendTestEmail);

export default router;