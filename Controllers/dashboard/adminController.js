import Event from '../../models/Event.js';
import Booking from '../../models/Booking.js';
import User from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import mongoose from 'mongoose';

// Metadatos para la interfaz de usuario - estos datos serán usados por el frontend
const UI_METADATA = {
    hideHeader: true,
    hideFooter: true,
    isDashboard: true,
    dashboardType: 'admin'
};

/**
 * @desc    Get admin dashboard overview
 * @route   GET /api/v1/admin/dashboard
 * @access  Private (Admin only)
 */
export const getAdminDashboardOverview = asyncHandler(async (req, res) => {
    try {
        // Get user metrics
        const userCount = await User.countDocuments();
        const newUsersThisMonth = await User.countDocuments({
            createdAt: {
                $gte: new Date(new Date().setDate(1)) // First day of current month
            }
        });
        
        // Get event metrics
        const eventCount = await Event.countDocuments();
        const activeEventCount = await Event.countDocuments({
            date: { $gte: new Date() },
            published: true
        });
        const pendingEventCount = await Event.countDocuments({
            published: false
        });
        
        // Get booking/revenue metrics
        const bookings = await Booking.find({});
        const bookingCount = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        
        // Get popular categories
        const events = await Event.find({}, 'category');
        const categoryCount = {};
        
        events.forEach(event => {
            if (event.category) {
                if (!categoryCount[event.category]) {
                    categoryCount[event.category] = 0;
                }
                categoryCount[event.category]++;
            }
        });
        
        const popularCategories = Object.entries(categoryCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        // Get system health (placeholder - in a real app this would check various system metrics)
        const systemHealth = 98; // Placeholder value
        
        // Get recent events
        const recentEvents = await Event.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user_id', 'username');
        
        const formattedRecentEvents = recentEvents.map(event => ({
            id: event._id,
            title: event.title,
            organizer: event.user_id.username,
            date: event.date,
            status: event.published ? 'active' : 'pending',
            attendees: 0, // Placeholder - would need another query to get actual bookings
            capacity: event.totalCapacity || 0
        }));
        
        // Calculate monthly revenue and user growth (simplified)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        
        const revenueByMonth = {};
        const userGrowth = {};
        
        // Fill with some placeholder data - in a real app you'd query the database
        for (let i = 0; i < 8; i++) {
            const monthIndex = (currentMonth - i + 12) % 12;
            const monthName = months[monthIndex];
            
            revenueByMonth[monthName] = Math.floor(Math.random() * 10000) + 5000;
            userGrowth[monthName] = Math.floor(Math.random() * 100) + 50;
        }
        
        // Prepare the response data
        const dashboardData = {
            userCount,
            newUsers: newUsersThisMonth,
            totalEvents: eventCount,
            activeEventCount,
            pendingEventCount,
            bookingCount,
            totalRevenue,
            popularCategories,
            systemHealth,
            recentEvents: formattedRecentEvents,
            revenueByMonth,
            userGrowth
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            { ...dashboardData, ui: UI_METADATA },
            'Admin dashboard data retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        throw new ApiError(500, 'Failed to retrieve admin dashboard data');
    }
});

/**
 * @desc    Get user management data
 * @route   GET /api/v1/dashboard/admin/users
 * @access  Private (Admin only)
 */
export const getUserManagementData = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, role, status, search } = req.query;
    
    try {
        // Build the filter
        const filter = {};
        
        // Verificar si la solicitud viene de la página de organizadores
        const isOrganizersPage = req.originalUrl.includes('/admin/organizers');
        
        // Si estamos en la página de organizadores, forzar el filtro de rol
        if (isOrganizersPage) {
            filter.role = 'organizer';
            console.log('Detectada ruta de organizadores, filtrando por rol organizador');
        } else if (role) {
            filter.role = role;
        }
        
        if (status) {
            filter.status = status;
        }
        
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullname: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Fetch users with pagination
        const users = await User.find(filter)
            .select('-password') // Exclude password
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });
        
        // Get total count for pagination
        const totalUsers = await User.countDocuments(filter);
        
        // Format user data
        const formattedUsers = users.map(user => ({
            id: user._id,
            username: user.username,
            email: user.email,
            fullname: user.fullname || '',
            role: user.role,
            status: user.status || 'active',
            phoneNumber: user.phoneNumber || '',
            createdAt: user.createdAt,
            lastLogin: user.lastLoginDate || null,
            verified: user.isVerified || false,
            company: user.companyName || ''
        }));
        
        // Prepare pagination data
        const paginationData = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalUsers / parseInt(limit)),
            totalUsers
        };
        
        // Determinar el título de la respuesta según la ruta
        const isOrganizersPage = req.originalUrl.includes('/admin/organizers');
        const responseMessage = isOrganizersPage 
            ? 'Organizers management data retrieved successfully' 
            : 'User management data retrieved successfully';
            
        return res.status(200).json(new ApiResponse(
            200,
            {
                users: formattedUsers,
                ...paginationData,
                ui: UI_METADATA
            },
            responseMessage
        ));
    } catch (error) {
        console.error('Error fetching users:', error);
        throw new ApiError(500, 'Failed to retrieve user data');
    }
});

/**
 * @desc    Update user role or status
 * @route   PATCH /api/v1/admin/users/:userId
 * @access  Private (Admin only)
 */
export const updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role, status, fullname, phoneNumber, companyName } = req.body;
    
    try {
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        
        // Update fields if provided
        if (role) user.role = role;
        if (status) user.status = status;
        if (fullname) user.fullname = fullname;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (companyName) user.companyName = companyName;
        
        // Save the updated user
        await user.save();
        
        return res.status(200).json(new ApiResponse(
            200,
            { user: { ...user.toObject(), password: undefined } },
            'User updated successfully'
        ));
    } catch (error) {
        console.error('Error updating user:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to update user');
    }
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/admin/users/:userId
 * @access  Private (Admin only)
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    try {
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        
        // Check if the user is an admin
        if (user.role === 'admin') {
            throw new ApiError(403, 'Cannot delete admin user');
        }
        
        // Delete the user
        await User.findByIdAndDelete(userId);
        
        return res.status(200).json(new ApiResponse(
            200,
            null,
            'User deleted successfully'
        ));
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to delete user');
    }
});

/**
 * @desc    Get event management data
 * @route   GET /api/v1/admin/events
 * @access  Private (Admin only)
 */
export const getEventManagementData = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, category, organizer, search } = req.query;
    
    try {
        // Build the filter
        const filter = {};
        
        if (status) {
            filter.published = status === 'published';
        }
        
        if (category) {
            filter.category = category;
        }
        
        if (organizer) {
            filter.user_id = organizer;
        }
        
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Fetch events with pagination
        const events = await Event.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 })
            .populate('user_id', 'username companyName');
        
        // Get total count for pagination
        const totalEvents = await Event.countDocuments(filter);
        
        // Get booking counts for each event
        const eventIds = events.map(event => event._id);
        const bookings = await Booking.find({ event_id: { $in: eventIds } });
        
        // Create a map of event ID to booking count
        const bookingCounts = {};
        bookings.forEach(booking => {
            const eventId = booking.event_id.toString();
            if (!bookingCounts[eventId]) {
                bookingCounts[eventId] = 0;
            }
            bookingCounts[eventId]++;
        });
        
        // Format event data
        const formattedEvents = events.map(event => {
            const eventId = event._id.toString();
            return {
                id: eventId,
                title: event.title,
                description: event.description,
                date: event.date,
                location: event.location,
                address: event.address,
                category: event.category,
                status: event.published ? 'published' : 'pending',
                featured: event.featured || false,
                organizer: {
                    id: event.user_id._id,
                    name: event.user_id.username,
                    company: event.user_id.companyName || ''
                },
                createdAt: event.createdAt,
                updatedAt: event.updatedAt,
                totalCapacity: event.totalCapacity || 0,
                soldTickets: bookingCounts[eventId] || 0,
                price: {
                    standard: event.price,
                    vip: event.priceVIP || 0
                }
            };
        });
        
        // Prepare pagination data
        const paginationData = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalEvents / parseInt(limit)),
            totalEvents
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            {
                events: formattedEvents,
                ...paginationData
            },
            'Event management data retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching events:', error);
        throw new ApiError(500, 'Failed to retrieve event data');
    }
});

/**
 * @desc    Update event status (publish/unpublish)
 * @route   PATCH /api/v1/admin/events/:eventId/status
 * @access  Private (Admin only)
 */
export const updateEventStatus = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { status } = req.body;
    
    try {
        // Find the event
        const event = await Event.findById(eventId);
        
        if (!event) {
            throw new ApiError(404, 'Event not found');
        }
        
        // Update the status
        event.published = status === 'published';
        await event.save();
        
        return res.status(200).json(new ApiResponse(
            200,
            { event },
            `Event ${status === 'published' ? 'published' : 'unpublished'} successfully`
        ));
    } catch (error) {
        console.error('Error updating event status:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to update event status');
    }
});

/**
 * @desc    Toggle event featured status
 * @route   PATCH /api/v1/admin/events/:eventId/featured
 * @access  Private (Admin only)
 */
export const toggleEventFeatured = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { featured } = req.body;
    
    try {
        // Find the event
        const event = await Event.findById(eventId);
        
        if (!event) {
            throw new ApiError(404, 'Event not found');
        }
        
        // Update the featured status
        event.featured = featured;
        await event.save();
        
        return res.status(200).json(new ApiResponse(
            200,
            { event },
            `Event ${featured ? 'marked as featured' : 'removed from featured'} successfully`
        ));
    } catch (error) {
        console.error('Error updating event featured status:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to update event featured status');
    }
});

/**
 * @desc    Delete event
 * @route   DELETE /api/v1/admin/events/:eventId
 * @access  Private (Admin only)
 */
export const deleteEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    
    try {
        // Find the event
        const event = await Event.findById(eventId);
        
        if (!event) {
            throw new ApiError(404, 'Event not found');
        }
        
        // Check if the event has bookings
        const bookingsCount = await Booking.countDocuments({ event_id: eventId });
        
        if (bookingsCount > 0) {
            throw new ApiError(400, 'Cannot delete event with active bookings');
        }
        
        // Delete the event
        await Event.findByIdAndDelete(eventId);
        
        return res.status(200).json(new ApiResponse(
            200,
            null,
            'Event deleted successfully'
        ));
    } catch (error) {
        console.error('Error deleting event:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to delete event');
    }
});

/**
 * @desc    Get system reports
 * @route   GET /api/v1/admin/reports
 * @access  Private (Admin only)
 */
export const getSystemReports = asyncHandler(async (req, res) => {
    const { reportType = 'sales', startDate, endDate } = req.query;
    
    try {
        // Build date filter
        const dateFilter = {};
        
        if (startDate) {
            dateFilter.createdAt = { $gte: new Date(startDate) };
        }
        
        if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999); // Set to end of the day
            
            dateFilter.createdAt = {
                ...dateFilter.createdAt,
                $lte: endDateObj
            };
        }
        
        let reportData = {};
        
        // Handle different report types
        switch (reportType) {
            case 'sales':
                reportData = await generateSalesReport(dateFilter);
                break;
            case 'users':
                reportData = await generateUsersReport(dateFilter);
                break;
            case 'events':
                reportData = await generateEventsReport(dateFilter);
                break;
            default:
                throw new ApiError(400, 'Invalid report type');
        }
        
        return res.status(200).json(new ApiResponse(
            200,
            reportData,
            'Report generated successfully'
        ));
    } catch (error) {
        console.error('Error generating report:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to generate report');
    }
});

/**
 * Helper function to generate sales report
 */
const generateSalesReport = async (dateFilter) => {
    // Get bookings with date filter
    const bookings = await Booking.find(dateFilter)
        .populate('event_id', 'title category');
    
    // Calculate basic metrics
    const totalSales = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const averageTicketPrice = totalRevenue / (totalSales || 1);
    
    // Calculate sales by month
    const salesByMonth = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    bookings.forEach(booking => {
        const date = new Date(booking.createdAt);
        const monthKey = months[date.getMonth()];
        
        if (!salesByMonth[monthKey]) {
            salesByMonth[monthKey] = 0;
        }
        
        salesByMonth[monthKey] += booking.totalPrice;
    });
    
    // Calculate sales by category
    const salesByCategory = {};
    
    bookings.forEach(booking => {
        if (booking.event_id && booking.event_id.category) {
            const category = booking.event_id.category;
            
            if (!salesByCategory[category]) {
                salesByCategory[category] = 0;
            }
            
            salesByCategory[category] += booking.totalPrice;
        }
    });
    
    // Get top events by sales
    const eventSales = {};
    
    bookings.forEach(booking => {
        if (booking.event_id) {
            const eventId = booking.event_id._id.toString();
            
            if (!eventSales[eventId]) {
                eventSales[eventId] = {
                    id: eventId,
                    name: booking.event_id.title,
                    category: booking.event_id.category,
                    sales: 0,
                    revenue: 0
                };
            }
            
            eventSales[eventId].sales++;
            eventSales[eventId].revenue += booking.totalPrice;
        }
    });
    
    const topEvents = Object.values(eventSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    // Calculate payment method distribution
    const paymentMethods = {
        'Tarjeta de crédito': 65.5,
        'PayPal': 25.8,
        'Transferencia bancaria': 8.7
    };
    
    // Return report data
    return {
        summary: {
            totalSales,
            totalRevenue,
            averageTicketPrice,
            refunds: 0, // Placeholder
            refundAmount: 0 // Placeholder
        },
        salesByMonth,
        salesByCategory,
        topEvents,
        salesByPaymentMethod: paymentMethods
    };
};

/**
 * Helper function to generate users report
 */
const generateUsersReport = async (dateFilter) => {
    // Get users with date filter
    const users = await User.find(dateFilter);
    
    // Calculate basic metrics
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const organizerCount = users.filter(user => user.role === 'organizer').length;
    
    // Calculate user growth by month
    const userGrowth = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize with zeros
    months.forEach(month => {
        userGrowth[month] = 0;
    });
    
    users.forEach(user => {
        const date = new Date(user.createdAt);
        const monthKey = months[date.getMonth()];
        userGrowth[monthKey]++;
    });
    
    // Calculate user types distribution
    const usersByType = {
        'Usuarios regulares': users.filter(user => user.role === 'user').length,
        'Organizadores': organizerCount
    };
    
    // Get top organizers
    const organizers = users.filter(user => user.role === 'organizer');
    
    // Find events created by each organizer
    const topOrganizers = [];
    for (const organizer of organizers.slice(0, 4)) { // Top 4 for simplicity
        const events = await Event.find({ user_id: organizer._id });
        const eventIds = events.map(event => event._id);
        
        // Find bookings for these events
        const bookings = await Booking.find({ event_id: { $in: eventIds } });
        const revenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        
        topOrganizers.push({
            id: organizer._id,
            name: organizer.username,
            company: organizer.companyName || '',
            events: events.length,
            revenue
        });
    }
    
    // Sort by revenue
    topOrganizers.sort((a, b) => b.revenue - a.revenue);
    
    // Calculate user activity (placeholders)
    const userActivity = {
        'Compra de entradas': 65.2,
        'Navegación': 24.8,
        'Búsqueda': 10.0
    };
    
    // Return report data
    return {
        summary: {
            totalUsers,
            newUsers: users.filter(user => {
                const today = new Date();
                const userCreatedAt = new Date(user.createdAt);
                return userCreatedAt.getMonth() === today.getMonth() &&
                       userCreatedAt.getFullYear() === today.getFullYear();
            }).length,
            activeUsers,
            organizerCount
        },
        userGrowth,
        usersByType,
        topOrganizers,
        userActivity
    };
};

/**
 * Helper function to generate events report
 */
const generateEventsReport = async (dateFilter) => {
    // Get events with date filter
    const events = await Event.find(dateFilter);
    
    // Calculate basic metrics
    const totalEvents = events.length;
    const activeEvents = events.filter(event => 
        event.published && new Date(event.date) > new Date()
    ).length;
    const pendingEvents = events.filter(event => !event.published).length;
    const completedEvents = events.filter(event => 
        event.published && new Date(event.date) < new Date()
    ).length;
    
    // Calculate events by month
    const eventsByMonth = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    events.forEach(event => {
        const date = new Date(event.createdAt);
        const monthKey = months[date.getMonth()];
        
        if (!eventsByMonth[monthKey]) {
            eventsByMonth[monthKey] = 0;
        }
        
        eventsByMonth[monthKey]++;
    });
    
    // Calculate events by category
    const eventsByCategory = {};
    
    events.forEach(event => {
        if (event.category) {
            if (!eventsByCategory[event.category]) {
                eventsByCategory[event.category] = 0;
            }
            
            eventsByCategory[event.category]++;
        }
    });
    
    // Calculate most popular events
    const mostPopularEvents = [];
    for (const event of events.slice(0, 5)) { // Top 5 for simplicity
        const bookings = await Booking.countDocuments({ event_id: event._id });
        const capacity = event.totalCapacity || 100; // Default to 100 if not set
        
        mostPopularEvents.push({
            id: event._id,
            name: event.title,
            attendance: Math.min(bookings, capacity), // Can't exceed capacity
            capacity
        });
    }
    
    // Sort by attendance percentage
    mostPopularEvents.sort((a, b) => 
        (b.attendance / b.capacity) - (a.attendance / a.capacity)
    );
    
    // Return report data
    return {
        summary: {
            totalEvents,
            activeEvents,
            pendingEvents,
            completedEvents
        },
        eventsByMonth,
        eventsByCategory,
        mostPopularEvents
    };
};

/**
 * @desc    Get category management data
 * @route   GET /api/v1/admin/categories
 * @access  Private (Admin only)
 */
export const getCategoryManagementData = asyncHandler(async (req, res) => {
    try {
        // Import the Category model
        const Category = mongoose.model('Category');
        
        // Get all categories - for admin, include both active and inactive
        const categories = await Category.find({}).sort({ featured: -1, name: 1 });
        
        // Get events to calculate count for each category
        const events = await Event.find({});
        
        // Extract event counts by category
        const categoryCounts = {};
        
        events.forEach(event => {
            if (event.category) {
                const categoryId = event.category.toString();
                if (!categoryCounts[categoryId]) {
                    categoryCounts[categoryId] = 0;
                }
                
                categoryCounts[categoryId]++;
            }
        });
        
        // Format category data
        const formattedCategories = categories.map(category => ({
            id: category._id,
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color,
            active: category.active,
            imageUrl: category.imageUrl,
            eventCount: categoryCounts[category._id.toString()] || 0,
            featured: category.featured,
            slug: category.slug,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt
        }));
        
        return res.status(200).json(new ApiResponse(
            200,
            { categories: formattedCategories },
            'Category management data retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw new ApiError(500, 'Failed to retrieve category data');
    }
});

/**
 * @desc    Get system settings
 * @route   GET /api/v1/admin/settings
 * @access  Private (Admin only)
 */
export const getSystemSettings = asyncHandler(async (req, res) => {
    try {
        // Note: In a real app, you would have a dedicated Settings model
        // For this implementation, we'll use a static object
        
        const settings = {
            general: {
                siteName: 'EntradasMelilla',
                siteDescription: 'Compra tus entradas para los mejores eventos de Melilla',
                contactEmail: 'info@entradasmelilla.com',
                supportPhone: '+34 612 345 678',
                logoUrl: '',
                faviconUrl: '',
                defaultLanguage: 'es',
                timeZone: 'Europe/Madrid',
                maintenanceMode: false,
                maintenanceMessage: 'Estamos realizando tareas de mantenimiento. Por favor, vuelve más tarde.'
            },
            payment: {
                currency: 'EUR',
                currencySymbol: '€',
                stripeEnabled: true,
                stripePublicKey: 'pk_test_********************************',
                stripeSecretKey: 'sk_test_********************************',
                paypalEnabled: false,
                paypalClientId: '',
                paypalClientSecret: '',
                bankTransferEnabled: true,
                bankTransferInstructions: 'Realiza la transferencia a la siguiente cuenta bancaria...',
                commissionRate: 5,
                commissionType: 'percentage', // percentage | fixed
                commissionFixed: 0
            },
            email: {
                emailProvider: 'brevo',
                smtpHost: 'smtp-relay.brevo.com',
                smtpPort: 587,
                smtpUser: 'info@entradasmelilla.com',
                smtpPassword: '********************',
                smtpEncryption: 'tls',
                fromName: 'EntradasMelilla',
                fromEmail: 'info@entradasmelilla.com',
                emailTemplates: [
                    { id: 'welcome', name: 'Bienvenida', subject: 'Bienvenido a EntradasMelilla' },
                    { id: 'booking_confirmation', name: 'Confirmación de Reserva', subject: 'Confirmación de tu reserva' },
                    { id: 'booking_cancelled', name: 'Reserva Cancelada', subject: 'Tu reserva ha sido cancelada' },
                    { id: 'payment_confirmation', name: 'Confirmación de Pago', subject: 'Confirmación de pago' },
                    { id: 'event_reminder', name: 'Recordatorio de Evento', subject: 'Recordatorio: Tu evento se acerca' }
                ]
            },
            events: {
                maxTicketsPerPurchase: 10,
                minTicketsPerPurchase: 1,
                allowGuestCheckout: true,
                requirePhoneNumber: true,
                requireAddress: false,
                enableWaitlist: true,
                enableRefunds: true,
                refundPeriodDays: 7,
                enablePartialRefunds: false,
                defaultEventDuration: 120, // minutes
                defaultTicketTypes: [
                    { id: 'standard', name: 'Estándar', color: '#2196F3' },
                    { id: 'vip', name: 'VIP', color: '#F44336' }
                ]
            },
            security: {
                requireEmailVerification: true,
                twoFactorAuthEnabled: false,
                passwordMinLength: 8,
                passwordRequireSpecialChars: true,
                passwordRequireNumbers: true,
                passwordRequireUppercase: true,
                accountLockoutAttempts: 5,
                sessionTimeout: 60, // minutes
                jwtExpirationTime: 24, // hours
                allowedOrigins: ['https://entradasmelilla.com', 'https://admin.entradasmelilla.com']
            },
            privacy: {
                privacyPolicyUrl: 'https://entradasmelilla.com/privacy',
                termsOfServiceUrl: 'https://entradasmelilla.com/terms',
                cookiePolicyUrl: 'https://entradasmelilla.com/cookies',
                dataDeletionPeriod: 365, // days
                gdprCompliant: true,
                cookieConsentRequired: true,
                analyticsEnabled: true,
                analyticsProvider: 'google',
                analyticsTrackingId: 'G-XXXXXXXXXX'
            },
            users: {
                allowUserRegistration: true,
                allowSocialLogin: false,
                defaultUserRole: 'user',
                requireOrganizerApproval: true,
                maxEventsPerOrganizer: 0, // 0 = unlimited
                maxAttendeesPerEvent: 0, // 0 = unlimited
                organizerCommissionRate: 5, // percentage
                adminEmails: ['admin@entradasmelilla.com']
            }
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            settings,
            'System settings retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching system settings:', error);
        throw new ApiError(500, 'Failed to retrieve system settings');
    }
});

/**
 * @desc    Update system settings
 * @route   PUT /api/v1/admin/settings
 * @access  Private (Admin only)
 */
export const updateSystemSettings = asyncHandler(async (req, res) => {
    const settings = req.body;
    
    try {
        // In a real application, you would validate and save to a Settings model
        // For this implementation, we'll simply return success
        
        return res.status(200).json(new ApiResponse(
            200,
            settings,
            'System settings updated successfully'
        ));
    } catch (error) {
        console.error('Error updating system settings:', error);
        throw new ApiError(500, 'Failed to update system settings');
    }
});

/**
 * @desc    Get communication history with organizers
 * @route   GET /api/v1/admin/communications
 * @access  Private (Admin only)
 */
export const getCommunicationHistory = asyncHandler(async (req, res) => {
    const { organizerId, startDate, endDate, type } = req.query;
    
    try {
        // In a real app, you'd have a Message or Communication model
        // For this example, we'll return mock data
        
        // Get organizer info if organizerId is provided
        let organizer = null;
        if (organizerId) {
            organizer = await User.findById(organizerId);
            if (!organizer || organizer.role !== 'organizer') {
                throw new ApiError(404, 'Organizer not found');
            }
        }
        
        // Generate mock communications data
        const generateMockCommunications = (count) => {
            const types = ['email', 'notification', 'system-message', 'support-ticket'];
            const subjects = [
                'Verificación de evento',
                'Actualización de comisiones',
                'Problema con el sistema de reservas',
                'Cambios en los términos de servicio',
                'Recordatorio de pago pendiente',
                'Nueva característica disponible',
                'Respuesta a su consulta'
            ];
            const statuses = ['sent', 'delivered', 'read', 'replied'];
            
            const communications = [];
            
            // Get all organizers if no specific organizerId
            const organizers = [
                { id: "5f8d0e3542f2c71d1c9b0e1a", name: "María López", email: "maria@example.com" },
                { id: "5f8d0e3542f2c71d1c9b0e1b", name: "Carlos Rodríguez", email: "carlos@ejemplo.com" },
                { id: "5f8d0e3542f2c71d1c9b0e1c", name: "Ana Martínez", email: "ana@ejemplo.com" }
            ];
            
            // If organizerId is provided, filter to just that organizer
            const recipientList = organizerId 
                ? [{ id: organizerId, name: organizer.username, email: organizer.email }]
                : organizers;
            
            // Generate mock communications
            for (let i = 0; i < count; i++) {
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days
                
                const recipient = recipientList[Math.floor(Math.random() * recipientList.length)];
                const messageType = types[Math.floor(Math.random() * types.length)];
                const subject = subjects[Math.floor(Math.random() * subjects.length)];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                
                communications.push({
                    id: `comm-${i}`,
                    type: messageType,
                    subject,
                    content: `Este es un mensaje de ejemplo para ${recipient.name} sobre ${subject.toLowerCase()}.`,
                    sentDate: date.toISOString(),
                    recipient: {
                        id: recipient.id,
                        name: recipient.name,
                        email: recipient.email
                    },
                    sender: {
                        id: "admin",
                        name: "Admin Sistema",
                        email: "admin@entradasmelilla.com"
                    },
                    status,
                    readDate: status === 'read' || status === 'replied' ? new Date(date.getTime() + 3600000).toISOString() : null,
                    repliedDate: status === 'replied' ? new Date(date.getTime() + 7200000).toISOString() : null
                });
            }
            
            // Apply filters
            let filtered = [...communications];
            
            if (type) {
                filtered = filtered.filter(comm => comm.type === type);
            }
            
            if (startDate) {
                const startDateObj = new Date(startDate);
                filtered = filtered.filter(comm => new Date(comm.sentDate) >= startDateObj);
            }
            
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
                filtered = filtered.filter(comm => new Date(comm.sentDate) <= endDateObj);
            }
            
            return filtered.sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate));
        };
        
        const communications = generateMockCommunications(20);
        
        // Prepare response data
        const responseData = {
            communications,
            summary: {
                total: communications.length,
                read: communications.filter(c => c.status === 'read' || c.status === 'replied').length,
                unread: communications.filter(c => c.status !== 'read' && c.status !== 'replied').length,
                replied: communications.filter(c => c.status === 'replied').length
            }
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            responseData,
            'Communication history retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching communication history:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to retrieve communication history');
    }
});

/**
 * @desc    Send communication to organizer
 * @route   POST /api/v1/admin/communications
 * @access  Private (Admin only)
 */
export const sendCommunication = asyncHandler(async (req, res) => {
    const { recipientId, subject, message, type = 'email' } = req.body;
    
    if (!recipientId || !subject || !message) {
        throw new ApiError(400, 'Recipient, subject and message are required');
    }
    
    try {
        // Verify recipient exists and is an organizer
        const recipient = await User.findById(recipientId);
        
        if (!recipient) {
            throw new ApiError(404, 'Recipient not found');
        }
        
        // In a real app, you would:
        // 1. Save the communication to a Communications collection
        // 2. Send actual email or notification depending on type
        // 3. Track delivery status
        
        // For this example, we'll simulate success
        
        // Mock response data
        const communicationData = {
            id: `comm-${Date.now()}`,
            type,
            subject,
            content: message,
            sentDate: new Date().toISOString(),
            recipient: {
                id: recipient._id,
                name: recipient.username,
                email: recipient.email
            },
            sender: {
                id: req.user._id,
                name: req.user.username,
                email: req.user.email
            },
            status: 'sent'
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            communicationData,
            'Communication sent successfully'
        ));
    } catch (error) {
        console.error('Error sending communication:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to send communication');
    }
});

/**
 * @desc    Get system activity log
 * @route   GET /api/v1/admin/activity-log
 * @access  Private (Admin only)
 */
export const getActivityLog = asyncHandler(async (req, res) => {
    const { startDate, endDate, type, userId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    try {
        // In a real app, you'd have an ActivityLog collection
        // For this example, we'll generate mock data
        
        // Generate mock activity log entries
        const generateMockActivityLog = (count) => {
            const types = ['user-login', 'user-registration', 'event-created', 'booking-completed', 'payment-processed', 'admin-action', 'system'];
            const actions = [
                'Inicio de sesión',
                'Nuevo usuario registrado',
                'Evento creado',
                'Evento modificado',
                'Evento publicado',
                'Reserva completada',
                'Pago procesado',
                'Usuario modificado',
                'Configuración del sistema modificada'
            ];
            
            const activityLog = [];
            
            for (let i = 0; i < count; i++) {
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 14)); // Random date in last 14 days
                date.setHours(date.getHours() - Math.floor(Math.random() * 24)); // Random hour
                
                const activityType = types[Math.floor(Math.random() * types.length)];
                const action = actions[Math.floor(Math.random() * actions.length)];
                
                const mockUserId = Math.random() > 0.5 ? "5f8d0e3542f2c71d1c9b0e1a" : "5f8d0e3542f2c71d1c9b0e1b";
                const mockUserName = mockUserId === "5f8d0e3542f2c71d1c9b0e1a" ? "María López" : "Carlos Rodríguez";
                
                activityLog.push({
                    id: `log-${i}`,
                    type: activityType,
                    action,
                    timestamp: date.toISOString(),
                    userId: activityType === 'system' ? null : mockUserId,
                    username: activityType === 'system' ? 'Sistema' : mockUserName,
                    details: `Detalles de la acción: ${action}`,
                    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                });
            }
            
            // Apply filters
            let filtered = [...activityLog];
            
            if (type) {
                filtered = filtered.filter(log => log.type === type);
            }
            
            if (userId) {
                filtered = filtered.filter(log => log.userId === userId);
            }
            
            if (startDate) {
                const startDateObj = new Date(startDate);
                filtered = filtered.filter(log => new Date(log.timestamp) >= startDateObj);
            }
            
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
                filtered = filtered.filter(log => new Date(log.timestamp) <= endDateObj);
            }
            
            return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        };
        
        const allLogs = generateMockActivityLog(100);
        
        // Apply pagination
        const totalLogs = allLogs.length;
        const skip = (page - 1) * limit;
        const paginatedLogs = allLogs.slice(skip, skip + limit);
        
        // Get activity summary
        const summary = {
            totalActivities: totalLogs,
            byType: {}
        };
        
        // Count activities by type
        allLogs.forEach(log => {
            if (!summary.byType[log.type]) {
                summary.byType[log.type] = 0;
            }
            summary.byType[log.type]++;
        });
        
        // Prepare pagination data
        const paginationData = {
            currentPage: page,
            totalPages: Math.ceil(totalLogs / limit),
            totalItems: totalLogs,
            itemsPerPage: limit
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            {
                logs: paginatedLogs,
                summary,
                pagination: paginationData
            },
            'Activity log retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching activity log:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to retrieve activity log');
    }
});

/**
 * @desc    Get system performance metrics
 * @route   GET /api/v1/admin/performance
 * @access  Private (Admin only)
 */
export const getSystemPerformance = asyncHandler(async (req, res) => {
    try {
        // In a real app, you would fetch actual system metrics
        // For this example, we'll generate mock data
        
        // Generate mock server metrics
        const generateServerMetrics = () => {
            return {
                cpu: {
                    usage: Math.floor(Math.random() * 40) + 10, // 10-50%
                    cores: 4,
                    model: 'Intel Xeon @ 2.20GHz'
                },
                memory: {
                    total: 8192, // MB
                    used: Math.floor(Math.random() * 3000) + 2000, // 2000-5000 MB
                    free: Math.floor(Math.random() * 2000) + 1000 // 1000-3000 MB
                },
                disk: {
                    total: 100, // GB
                    used: Math.floor(Math.random() * 40) + 30, // 30-70 GB
                    free: Math.floor(Math.random() * 20) + 10 // 10-30 GB
                },
                uptime: Math.floor(Math.random() * 30) + 1, // 1-30 days
                lastRestart: new Date(Date.now() - (Math.floor(Math.random() * 30) + 1) * 86400000).toISOString()
            };
        };
        
        // Generate mock database metrics
        const generateDatabaseMetrics = () => {
            return {
                connections: Math.floor(Math.random() * 50) + 10, // 10-60 connections
                size: Math.floor(Math.random() * 1000) + 500, // 500-1500 MB
                operations: {
                    reads: Math.floor(Math.random() * 10000) + 5000, // 5000-15000
                    writes: Math.floor(Math.random() * 5000) + 1000, // 1000-6000
                    deletes: Math.floor(Math.random() * 500) + 100 // 100-600
                },
                responseTime: Math.floor(Math.random() * 100) + 20, // 20-120 ms
                collections: {
                    users: Math.floor(Math.random() * 1000) + 500, // 500-1500 documents
                    events: Math.floor(Math.random() * 500) + 100, // 100-600 documents
                    bookings: Math.floor(Math.random() * 5000) + 1000, // 1000-6000 documents
                    reviews: Math.floor(Math.random() * 1000) + 200 // 200-1200 documents
                }
            };
        };
        
        // Generate mock performance history
        const generatePerformanceHistory = () => {
            const history = [];
            const now = new Date();
            
            for (let i = 0; i < 24; i++) {
                const date = new Date(now);
                date.setHours(date.getHours() - i);
                
                history.push({
                    timestamp: date.toISOString(),
                    cpu: Math.floor(Math.random() * 40) + 10, // 10-50%
                    memory: Math.floor(Math.random() * 40) + 30, // 30-70%
                    requests: Math.floor(Math.random() * 1000) + 100, // 100-1100 requests
                    responseTime: Math.floor(Math.random() * 100) + 20 // 20-120 ms
                });
            }
            
            return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        };
        
        // System health check
        const systemHealth = {
            status: 'healthy', // healthy, warning, critical
            services: {
                web: { status: 'running', uptime: '30 days', healthScore: 98 },
                database: { status: 'running', uptime: '30 days', healthScore: 95 },
                email: { status: 'running', uptime: '28 days', healthScore: 99 },
                payments: { status: 'running', uptime: '30 days', healthScore: 100 }
            },
            alerts: [
                {
                    id: 'alert-1',
                    severity: 'low',
                    message: 'CPU usage above 40% for 30 minutes',
                    timestamp: new Date(Date.now() - 1800000).toISOString(),
                    resolved: true
                },
                {
                    id: 'alert-2',
                    severity: 'info',
                    message: 'Database backup completed successfully',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    resolved: true
                }
            ]
        };
        
        // Prepare response data
        const performanceData = {
            server: generateServerMetrics(),
            database: generateDatabaseMetrics(),
            history: generatePerformanceHistory(),
            health: systemHealth
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            performanceData,
            'System performance metrics retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching system performance:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to retrieve system performance metrics');
    }
});

export default {
    getAdminDashboardOverview,
    getUserManagementData,
    updateUser,
    deleteUser,
    getEventManagementData,
    updateEventStatus,
    toggleEventFeatured,
    deleteEvent,
    getSystemReports,
    getCategoryManagementData,
    getSystemSettings,
    updateSystemSettings,
    getCommunicationHistory,
    sendCommunication,
    getActivityLog,
    getSystemPerformance
};