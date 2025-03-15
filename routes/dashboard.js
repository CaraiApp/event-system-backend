import express from 'express';
import { verifyJWT, verifyAdmin, verifyOrganizer } from '../utils/verifyToken.js';
import organizerController from '../Controllers/dashboard/organizerController.js';
import adminController from '../Controllers/dashboard/adminController.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = express.Router();

// Middleware de diagnóstico para depuración de JWT (solo imprime información)
const debugJWT = (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    console.log(`[DEBUG] Ruta ${req.originalUrl} - Token presente: ${!!token}`);
    next();
};

// Ruta para proporcionar configuración UI al frontend (PROTEGIDA)
router.get('/ui-config', debugJWT, verifyJWT, (req, res) => {
    const route = req.query.route || '';
    let uiConfig = { hideHeader: false, hideFooter: false };
    
    if (route.includes('/admin') || route.includes('/organizer')) {
        uiConfig = {
            hideHeader: true,
            hideFooter: true,
            isDashboard: true,
            dashboardType: route.includes('/admin') ? 'admin' : 'organizer'
        };
        
        // Elemento de navegación específicos según el tipo de dashboard
        if (route.includes('/admin')) {
            uiConfig.navItems = [
                { path: '/admin/overview', label: 'Dashboard', icon: 'dashboard' },
                { path: '/admin/users', label: 'Usuarios', icon: 'people' },
                { path: '/admin/organizers', label: 'Organizadores', icon: 'business' },
                { path: '/admin/events', label: 'Eventos', icon: 'event' },
                { path: '/admin/categories', label: 'Categorías', icon: 'category' },
                { path: '/admin/reports', label: 'Informes', icon: 'bar_chart' },
                { path: '/admin/settings', label: 'Configuración', icon: 'settings' }
            ];
        } else if (route.includes('/organizer')) {
            uiConfig.navItems = [
                { path: '/organizer/overview', label: 'Dashboard', icon: 'dashboard' },
                { path: '/organizer/events', label: 'Mis Eventos', icon: 'event' },
                { path: '/organizer/sales', label: 'Ventas', icon: 'payments' },
                { path: '/organizer/attendees', label: 'Asistentes', icon: 'people' },
                { path: '/organizer/settings', label: 'Configuración', icon: 'settings' }
            ];
        }
    }
    
    console.log(`Enviando configuración UI para ruta: ${route}`);
    
    return res.status(200).json(new ApiResponse(
        200,
        uiConfig,
        'UI configuration retrieved successfully'
    ));
});

// Organizer Dashboard Routes - Todas protegidas
router.get('/organizer/overview', verifyJWT, verifyOrganizer, organizerController.getOrganizerDashboardOverview);
router.get('/organizer/event-analytics/:eventId', verifyJWT, verifyOrganizer, organizerController.getEventAnalytics);
router.get('/organizer/financial-overview', verifyJWT, verifyOrganizer, organizerController.getFinancialOverview);
router.get('/organizer/attendees', verifyJWT, verifyOrganizer, organizerController.getAttendeesData);
router.patch('/organizer/attendees/:bookingId/check-in', verifyJWT, verifyOrganizer, organizerController.updateAttendeeCheckIn);
router.get('/organizer/attendees/export', verifyJWT, verifyOrganizer, organizerController.exportAttendeesList);

// New enhanced organizer dashboard routes - Todas protegidas
router.get('/organizer/sales-report', verifyJWT, verifyOrganizer, organizerController.getSalesReport);
router.get('/organizer/commissions', verifyJWT, verifyOrganizer, organizerController.getCommissionDetails);
router.get('/organizer/occupancy', verifyJWT, verifyOrganizer, organizerController.getOccupancyAnalytics);

// Admin Dashboard Routes - Todas protegidas
router.get('/admin/overview', verifyJWT, verifyAdmin, adminController.getAdminDashboardOverview);

// User Management - Todas protegidas
router.get('/admin/users', verifyJWT, verifyAdmin, adminController.getUserManagementData);
router.patch('/admin/users/:userId', verifyJWT, verifyAdmin, adminController.updateUser);
router.delete('/admin/users/:userId', verifyJWT, verifyAdmin, adminController.deleteUser);

// Ruta específica para gestión de organizadores
router.get('/admin/organizers', verifyJWT, verifyAdmin, adminController.getUserManagementData);

// Event Management - Todas protegidas
router.get('/admin/events', verifyJWT, verifyAdmin, adminController.getEventManagementData);
router.patch('/admin/events/:eventId/status', verifyJWT, verifyAdmin, adminController.updateEventStatus);
router.patch('/admin/events/:eventId/featured', verifyJWT, verifyAdmin, adminController.toggleEventFeatured);
router.delete('/admin/events/:eventId', verifyJWT, verifyAdmin, adminController.deleteEvent);

// Category Management - Todas protegidas
router.get('/admin/categories', verifyJWT, verifyAdmin, adminController.getCategoryManagementData);

// Reports and Analytics - Todas protegidas
router.get('/admin/reports', verifyJWT, verifyAdmin, adminController.getSystemReports);
router.get('/admin/activity-log', verifyJWT, verifyAdmin, adminController.getActivityLog);
router.get('/admin/performance', verifyJWT, verifyAdmin, adminController.getSystemPerformance);

// Communications with Organizers - Todas protegidas
router.get('/admin/communications', verifyJWT, verifyAdmin, adminController.getCommunicationHistory);
router.post('/admin/communications', verifyJWT, verifyAdmin, adminController.sendCommunication);

// System Settings - Todas protegidas
router.get('/admin/settings', verifyJWT, verifyAdmin, adminController.getSystemSettings);
router.put('/admin/settings', verifyJWT, verifyAdmin, adminController.updateSystemSettings);

// Email Settings - Todas protegidas
router.get('/admin/settings/email', verifyJWT, verifyAdmin, adminController.getEmailSettings);
router.put('/admin/settings/email', verifyJWT, verifyAdmin, adminController.updateEmailSettings);
router.post('/admin/send-test-email', verifyJWT, verifyAdmin, adminController.sendTestEmail);

// Rutas alternativas también protegidas (para compatibilidad con frontend)
router.get('/email/config', verifyJWT, verifyAdmin, adminController.getEmailSettings);
router.put('/email/config', verifyJWT, verifyAdmin, adminController.updateEmailSettings);
router.post('/email/test', verifyJWT, verifyAdmin, adminController.sendTestEmail);

export default router;