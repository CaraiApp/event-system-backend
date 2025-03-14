import express from 'express';
import { verifyToken, verifyOrganizerOrAdmin, verifyAdmin } from '../MiddleWares/auth.js';
import organizerController from '../Controllers/dashboard/organizerController.js';
import adminController from '../Controllers/dashboard/adminController.js';
import ApiResponse from '../utils/ApiResponse.js';

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
router.get('/organizer/overview', verifyToken, verifyOrganizerOrAdmin, organizerController.getOrganizerDashboardOverview);
router.get('/organizer/event-analytics/:eventId', verifyToken, verifyOrganizerOrAdmin, organizerController.getEventAnalytics);
router.get('/organizer/financial-overview', verifyToken, verifyOrganizerOrAdmin, organizerController.getFinancialOverview);
router.get('/organizer/attendees', verifyToken, verifyOrganizerOrAdmin, organizerController.getAttendeesData);
router.patch('/organizer/attendees/:bookingId/check-in', verifyToken, verifyOrganizerOrAdmin, organizerController.updateAttendeeCheckIn);
router.get('/organizer/attendees/export', verifyToken, verifyOrganizerOrAdmin, organizerController.exportAttendeesList);

// New enhanced organizer dashboard routes
router.get('/organizer/sales-report', verifyToken, verifyOrganizerOrAdmin, organizerController.getSalesReport);
router.get('/organizer/commissions', verifyToken, verifyOrganizerOrAdmin, organizerController.getCommissionDetails);
router.get('/organizer/occupancy', verifyToken, verifyOrganizerOrAdmin, organizerController.getOccupancyAnalytics);

// Admin Dashboard Routes
router.get('/admin/overview', verifyToken, verifyAdmin, adminController.getAdminDashboardOverview);

// User Management
router.get('/admin/users', verifyToken, verifyAdmin, adminController.getUserManagementData);
router.patch('/admin/users/:userId', verifyToken, verifyAdmin, adminController.updateUser);
router.delete('/admin/users/:userId', verifyToken, verifyAdmin, adminController.deleteUser);

// Ruta específica para gestión de organizadores
// Usamos el mismo controlador pero la URL se detectará diferente
router.get('/admin/organizers', verifyToken, verifyAdmin, adminController.getUserManagementData);

// Event Management
router.get('/admin/events', verifyToken, verifyAdmin, adminController.getEventManagementData);
router.patch('/admin/events/:eventId/status', verifyToken, verifyAdmin, adminController.updateEventStatus);
router.patch('/admin/events/:eventId/featured', verifyToken, verifyAdmin, adminController.toggleEventFeatured);
router.delete('/admin/events/:eventId', verifyToken, verifyAdmin, adminController.deleteEvent);

// Category Management
router.get('/admin/categories', verifyToken, verifyAdmin, adminController.getCategoryManagementData);

// Reports and Analytics
router.get('/admin/reports', verifyToken, verifyAdmin, adminController.getSystemReports);
router.get('/admin/activity-log', verifyToken, verifyAdmin, adminController.getActivityLog);
router.get('/admin/performance', verifyToken, verifyAdmin, adminController.getSystemPerformance);

// Communications with Organizers
router.get('/admin/communications', verifyToken, verifyAdmin, adminController.getCommunicationHistory);
router.post('/admin/communications', verifyToken, verifyAdmin, adminController.sendCommunication);

// System Settings
router.get('/admin/settings', verifyToken, verifyAdmin, adminController.getSystemSettings);
router.put('/admin/settings', verifyToken, verifyAdmin, adminController.updateSystemSettings);

export default router;