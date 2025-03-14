import Event from '../../models/Event.js';
import Booking from '../../models/Booking.js';
import User from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

/**
 * @desc    Get organizer dashboard overview
 * @route   GET /api/v1/dashboard/overview
 * @access  Private (Organizer & Admin)
 */
export const getOrganizerDashboardOverview = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    
    // For admins, we don't filter by user_id to show all events
    const userFilter = isAdmin ? {} : { user_id: userId };
    
    try {
        // Get all events created by this organizer
        const events = await Event.find(userFilter);
        
        // Get all event IDs
        const eventIds = events.map(event => event._id);
        
        // Get all bookings for these events
        const bookings = await Booking.find({ event_id: { $in: eventIds } });
        
        // Calculate total revenue
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        
        // Calculate upcoming events (events with future dates)
        const now = new Date();
        const upcomingEvents = events.filter(event => new Date(event.date) > now)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5) // Get only the next 5 events
            .map(event => {
                // Get bookings for this event
                const eventBookings = bookings.filter(booking => 
                    booking.event_id.toString() === event._id.toString()
                );
                
                // Calculate event sales and revenue
                const ticketsSold = eventBookings.length;
                const revenue = eventBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
                
                return {
                    id: event._id,
                    name: event.title,
                    date: event.date,
                    ticketsSold,
                    revenue
                };
            });
        
        // Get recent sales (most recent 5 bookings)
        const recentSales = await Booking.find({ event_id: { $in: eventIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('event_id', 'title')
            .populate('user_id', 'username email');
        
        const recentSalesData = recentSales.map(booking => ({
            id: booking._id,
            event: booking.event_id.title,
            date: booking.createdAt,
            customer: booking.user_id.username,
            email: booking.user_id.email,
            amount: booking.totalPrice
        }));
        
        // Calculate sales by event
        const salesByEvent = {};
        events.forEach(event => {
            const eventBookings = bookings.filter(booking => 
                booking.event_id.toString() === event._id.toString()
            );
            
            salesByEvent[event.title] = {
                count: eventBookings.length,
                revenue: eventBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
            };
        });
        
        // Prepare the response data
        const overviewData = {
            totalRevenue,
            totalTicketsSold: bookings.length,
            totalEvents: events.length,
            activeEvents: events.filter(event => 
                new Date(event.date) > now && event.published
            ).length,
            upcomingEvents,
            recentSales: recentSalesData,
            salesByEvent
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            overviewData,
            'Dashboard overview data retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching dashboard overview:', error);
        throw new ApiError(500, 'Failed to retrieve dashboard overview data');
    }
});

/**
 * @desc    Get organizer event analytics
 * @route   GET /api/v1/dashboard/event-analytics/:eventId
 * @access  Private (Organizer & Admin)
 */
export const getEventAnalytics = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    
    try {
        // Get the requested event
        const event = await Event.findById(eventId);
        
        if (!event) {
            throw new ApiError(404, 'Event not found');
        }
        
        // Check if the user is the owner of this event or an admin
        if (!isAdmin && event.user_id.toString() !== userId.toString()) {
            throw new ApiError(403, 'You are not authorized to view this event analytics');
        }
        
        // Get all bookings for this event
        const bookings = await Booking.find({ event_id: eventId })
            .populate('user_id', 'username email');
        
        // Calculate analytics data
        const totalSales = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        const totalCapacity = event.totalCapacity || 0;
        const occupancyRate = totalCapacity > 0 ? (totalSales / totalCapacity) * 100 : 0;
        
        // Calculate sales by day
        const salesByDay = {};
        bookings.forEach(booking => {
            const bookingDate = new Date(booking.createdAt).toISOString().split('T')[0];
            
            if (!salesByDay[bookingDate]) {
                salesByDay[bookingDate] = {
                    count: 0,
                    revenue: 0
                };
            }
            
            salesByDay[bookingDate].count += 1;
            salesByDay[bookingDate].revenue += booking.totalPrice;
        });
        
        // Calculate ticket types distribution
        const ticketTypes = {};
        bookings.forEach(booking => {
            booking.selectedSeats.forEach(seat => {
                const type = seat.type || 'standard';
                
                if (!ticketTypes[type]) {
                    ticketTypes[type] = {
                        count: 0,
                        revenue: 0
                    };
                }
                
                ticketTypes[type].count += 1;
                // Estimate revenue for each ticket type
                const avgTicketPrice = booking.totalPrice / booking.selectedSeats.length;
                ticketTypes[type].revenue += avgTicketPrice;
            });
        });
        
        // Get attendance data
        const attendeesData = bookings.map(booking => ({
            id: booking._id,
            name: booking.user_id.username,
            email: booking.user_id.email,
            ticketId: booking._id.toString(),
            purchaseDate: booking.createdAt,
            checkedIn: booking.attended || false,
            seats: booking.selectedSeats.length
        }));
        
        // Prepare the analytics data
        const analyticsData = {
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                location: event.location,
                totalCapacity
            },
            sales: {
                totalSales,
                totalRevenue,
                occupancyRate
            },
            salesByDay,
            ticketTypes,
            attendees: attendeesData
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            analyticsData,
            'Event analytics data retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching event analytics:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to retrieve event analytics data');
    }
});

/**
 * @desc    Get organizer financial overview
 * @route   GET /api/v1/dashboard/financial-overview
 * @access  Private (Organizer & Admin)
 */
export const getFinancialOverview = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    
    // For admins, we don't filter by user_id to show all events
    const userFilter = isAdmin ? {} : { user_id: userId };
    
    // Parse query parameters for filtering
    const { startDate, endDate } = req.query;
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
    
    try {
        // Get all events created by this organizer
        const events = await Event.find(userFilter);
        
        // Get all event IDs
        const eventIds = events.map(event => event._id);
        
        // Get bookings with date filter
        const bookingsFilter = {
            event_id: { $in: eventIds },
            ...dateFilter
        };
        
        const bookings = await Booking.find(bookingsFilter);
        
        // Calculate financial metrics
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        const commissionRate = 0.05; // 5% commission rate
        const commissionPaid = totalRevenue * commissionRate;
        const netRevenue = totalRevenue - commissionPaid;
        
        // Calculate revenue by month
        const revenueByMonth = {};
        bookings.forEach(booking => {
            const date = new Date(booking.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!revenueByMonth[monthKey]) {
                revenueByMonth[monthKey] = {
                    revenue: 0,
                    bookings: 0,
                    commission: 0,
                    net: 0
                };
            }
            
            revenueByMonth[monthKey].revenue += booking.totalPrice;
            revenueByMonth[monthKey].bookings += 1;
            revenueByMonth[monthKey].commission += booking.totalPrice * commissionRate;
            revenueByMonth[monthKey].net += booking.totalPrice * (1 - commissionRate);
        });
        
        // Calculate revenue by event
        const revenueByEvent = {};
        events.forEach(event => {
            const eventBookings = bookings.filter(booking => 
                booking.event_id.toString() === event._id.toString()
            );
            
            const eventRevenue = eventBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
            const eventCommission = eventRevenue * commissionRate;
            
            revenueByEvent[event.title] = {
                revenue: eventRevenue,
                bookings: eventBookings.length,
                commission: eventCommission,
                net: eventRevenue - eventCommission
            };
        });
        
        // Prepare financial overview data
        const financialData = {
            summary: {
                totalRevenue,
                commissionPaid,
                netRevenue,
                totalBookings: bookings.length,
                commissionRate: commissionRate * 100 // as percentage
            },
            revenueByMonth,
            revenueByEvent
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            financialData,
            'Financial overview data retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching financial overview:', error);
        throw new ApiError(500, 'Failed to retrieve financial overview data');
    }
});

/**
 * @desc    Get organizer attendees data
 * @route   GET /api/v1/dashboard/attendees
 * @access  Private (Organizer & Admin)
 */
export const getAttendeesData = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const { eventId } = req.query;
    
    // For admins, we don't filter by user_id to show all events
    const userFilter = isAdmin ? {} : { user_id: userId };
    
    try {
        // If eventId is provided, filter by that specific event
        const eventsFilter = eventId ? { ...userFilter, _id: eventId } : userFilter;
        
        // Get events
        const events = await Event.find(eventsFilter);
        
        if (events.length === 0) {
            return res.status(200).json(new ApiResponse(
                200,
                { attendees: [], summary: { totalAttendees: 0, checkedIn: 0 } },
                'No events found'
            ));
        }
        
        // Get all event IDs
        const eventIds = events.map(event => event._id);
        
        // Get all bookings for these events
        const bookings = await Booking.find({ event_id: { $in: eventIds } })
            .populate('user_id', 'username email phoneNumber')
            .populate('event_id', 'title date');
        
        // Map bookings to attendees format
        const attendees = bookings.map(booking => {
            return {
                id: booking._id,
                name: booking.user_id.username,
                email: booking.user_id.email,
                phone: booking.user_id.phoneNumber || '',
                ticketId: booking._id.toString(),
                event: booking.event_id.title,
                eventId: booking.event_id._id,
                purchaseDate: booking.createdAt,
                checkedIn: booking.attended || false,
                status: booking.status,
                seatInfo: booking.selectedSeats.map(seat => seat.label).join(', ')
            };
        });
        
        // Generate summary
        const summary = {
            totalAttendees: attendees.length,
            checkedIn: attendees.filter(a => a.checkedIn).length,
            pendingAttendees: attendees.filter(a => !a.checkedIn).length
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            { attendees, summary },
            'Attendees data retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching attendees data:', error);
        throw new ApiError(500, 'Failed to retrieve attendees data');
    }
});

/**
 * @desc    Update attendee check-in status
 * @route   PATCH /api/v1/dashboard/attendees/:bookingId/check-in
 * @access  Private (Organizer & Admin)
 */
export const updateAttendeeCheckIn = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { checkedIn } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    
    try {
        // Find the booking
        const booking = await Booking.findById(bookingId)
            .populate('event_id', 'user_id');
        
        if (!booking) {
            throw new ApiError(404, 'Booking not found');
        }
        
        // Check if user is the event owner or an admin
        if (!isAdmin && booking.event_id.user_id.toString() !== userId.toString()) {
            throw new ApiError(403, 'You are not authorized to update this attendee');
        }
        
        // Update the attendance status
        booking.attended = checkedIn;
        await booking.save();
        
        return res.status(200).json(new ApiResponse(
            200,
            { booking },
            `Attendee ${checkedIn ? 'checked in' : 'checked out'} successfully`
        ));
    } catch (error) {
        console.error('Error updating attendee check-in status:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to update attendee check-in status');
    }
});

/**
 * @desc    Export attendees list
 * @route   GET /api/v1/dashboard/attendees/export
 * @access  Private (Organizer & Admin)
 */
export const exportAttendeesList = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const { eventId, format = 'csv' } = req.query;
    
    // For admins, we don't filter by user_id to show all events
    const userFilter = isAdmin ? {} : { user_id: userId };
    
    try {
        // If eventId is provided, filter by that specific event
        const eventsFilter = eventId ? { ...userFilter, _id: eventId } : userFilter;
        
        // Get events
        const events = await Event.find(eventsFilter);
        
        if (events.length === 0) {
            throw new ApiError(404, 'No events found');
        }
        
        // Get all event IDs
        const eventIds = events.map(event => event._id);
        
        // Get all bookings for these events
        const bookings = await Booking.find({ event_id: { $in: eventIds } })
            .populate('user_id', 'username email phoneNumber')
            .populate('event_id', 'title date');
        
        // Map bookings to attendees format
        const attendees = bookings.map(booking => {
            return {
                TicketID: booking._id.toString(),
                Name: booking.user_id.username,
                Email: booking.user_id.email,
                Phone: booking.user_id.phoneNumber || '',
                Event: booking.event_id.title,
                EventDate: new Date(booking.event_id.date).toLocaleDateString(),
                PurchaseDate: new Date(booking.createdAt).toLocaleDateString(),
                CheckedIn: booking.attended ? 'Yes' : 'No',
                Status: booking.status,
                Seats: booking.selectedSeats.map(seat => seat.label).join(', ')
            };
        });
        
        // Generate CSV content
        if (format === 'csv') {
            if (attendees.length === 0) {
                return res.status(200).send('No attendees found');
            }
            
            const columns = Object.keys(attendees[0]);
            let csv = columns.join(',') + '\n';
            
            attendees.forEach(attendee => {
                const row = columns.map(column => {
                    // Wrap fields containing commas in quotes
                    const value = attendee[column].toString();
                    return value.includes(',') ? `"${value}"` : value;
                }).join(',');
                csv += row + '\n';
            });
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=attendees.csv');
            return res.status(200).send(csv);
        }
        
        // For JSON format
        return res.status(200).json(new ApiResponse(
            200,
            { attendees },
            'Attendees list exported successfully'
        ));
    } catch (error) {
        console.error('Error exporting attendees list:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to export attendees list');
    }
});

/**
 * @desc    Get detailed sales report with data export capabilities
 * @route   GET /api/v1/dashboard/organizer/sales-report
 * @access  Private (Organizer & Admin)
 */
export const getSalesReport = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const { startDate, endDate, eventId, format = 'json' } = req.query;
    
    // For admins, we don't filter by user_id to show all events
    const userFilter = isAdmin ? {} : { user_id: userId };
    
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
        
        // Get events based on filters
        let eventsQuery = userFilter;
        if (eventId) {
            eventsQuery = { ...userFilter, _id: eventId };
        }
        
        const events = await Event.find(eventsQuery);
        const eventIds = events.map(event => event._id);
        
        // Get all bookings for these events with date filter
        const bookingsFilter = {
            event_id: { $in: eventIds },
            ...dateFilter
        };
        
        const bookings = await Booking.find(bookingsFilter)
            .populate('user_id', 'username email phoneNumber')
            .populate('event_id', 'title location date price priceVIP');
        
        // Calculate summary metrics
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        const totalTickets = bookings.reduce((sum, booking) => sum + booking.selectedSeats.length, 0);
        const commissionRate = 0.05; // 5% commission
        const commissionPaid = totalRevenue * commissionRate;
        const netRevenue = totalRevenue - commissionPaid;
        
        // Calculate revenue by event
        const salesByEvent = {};
        
        bookings.forEach(booking => {
            const eventId = booking.event_id._id.toString();
            const eventTitle = booking.event_id.title;
            
            if (!salesByEvent[eventId]) {
                salesByEvent[eventId] = {
                    id: eventId,
                    title: eventTitle,
                    bookings: 0,
                    tickets: 0,
                    revenue: 0,
                    commission: 0,
                    net: 0
                };
            }
            
            salesByEvent[eventId].bookings += 1;
            salesByEvent[eventId].tickets += booking.selectedSeats.length;
            salesByEvent[eventId].revenue += booking.totalPrice;
            salesByEvent[eventId].commission += booking.totalPrice * commissionRate;
            salesByEvent[eventId].net += booking.totalPrice * (1 - commissionRate);
        });
        
        // Calculate sales by day
        const salesByDay = {};
        
        bookings.forEach(booking => {
            const date = new Date(booking.createdAt).toISOString().split('T')[0];
            
            if (!salesByDay[date]) {
                salesByDay[date] = {
                    date,
                    bookings: 0,
                    tickets: 0,
                    revenue: 0
                };
            }
            
            salesByDay[date].bookings += 1;
            salesByDay[date].tickets += booking.selectedSeats.length;
            salesByDay[date].revenue += booking.totalPrice;
        });
        
        // Prepare detailed sales data for export
        const detailedSales = bookings.map(booking => ({
            bookingId: booking._id.toString(),
            bookingDate: new Date(booking.createdAt).toISOString(),
            event: booking.event_id.title,
            eventDate: new Date(booking.event_id.date).toISOString(),
            customer: booking.user_id.username,
            email: booking.user_id.email,
            phone: booking.user_id.phoneNumber || '',
            ticketCount: booking.selectedSeats.length,
            seats: booking.selectedSeats.map(seat => seat.label).join(', '),
            totalPrice: booking.totalPrice,
            commission: booking.totalPrice * commissionRate,
            netAmount: booking.totalPrice * (1 - commissionRate),
            paymentStatus: booking.paymentStatus,
            paymentMethod: 'Tarjeta', // Placeholder, would come from actual payment data
            attended: booking.attended ? 'Sí' : 'No'
        }));
        
        // Handle different export formats
        if (format === 'csv') {
            // Generate CSV
            if (detailedSales.length === 0) {
                return res.status(200).send('No sales data found');
            }
            
            const columns = Object.keys(detailedSales[0]);
            let csv = columns.join(',') + '\n';
            
            detailedSales.forEach(sale => {
                const row = columns.map(column => {
                    const value = sale[column].toString();
                    return value.includes(',') ? `"${value}"` : value;
                }).join(',');
                csv += row + '\n';
            });
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
            return res.status(200).send(csv);
        } else if (format === 'excel') {
            // In a real implementation, you would generate an Excel file
            // For this example, we'll just return JSON with a message
            return res.status(200).json(new ApiResponse(
                200,
                {
                    message: 'Excel export would be implemented here in production'
                },
                'Excel export feature placeholder'
            ));
        }
        
        // Default: return JSON
        const reportData = {
            summary: {
                totalBookings,
                totalTickets,
                totalRevenue,
                commissionRate: commissionRate * 100, // as percentage
                commissionPaid,
                netRevenue,
                period: {
                    start: startDate || 'All time',
                    end: endDate || 'Present'
                }
            },
            salesByEvent: Object.values(salesByEvent),
            salesByDay: Object.values(salesByDay),
            detailedSales
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            reportData,
            'Sales report generated successfully'
        ));
    } catch (error) {
        console.error('Error generating sales report:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to generate sales report');
    }
});

/**
 * @desc    Get commission details and statements
 * @route   GET /api/v1/dashboard/organizer/commissions
 * @access  Private (Organizer & Admin)
 */
export const getCommissionDetails = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const { startDate, endDate, status } = req.query;
    
    // For admins, we don't filter by user_id
    const userFilter = isAdmin ? {} : { user_id: userId };
    
    try {
        // Build date filter
        const dateFilter = {};
        
        if (startDate) {
            dateFilter.createdAt = { $gte: new Date(startDate) };
        }
        
        if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            
            dateFilter.createdAt = {
                ...dateFilter.createdAt,
                $lte: endDateObj
            };
        }
        
        // Get events
        const events = await Event.find(userFilter);
        const eventIds = events.map(event => event._id);
        
        // Get bookings with filters
        const bookingsFilter = {
            event_id: { $in: eventIds },
            ...dateFilter
        };
        
        if (status === 'paid') {
            bookingsFilter.commissionPaid = true;
        } else if (status === 'pending') {
            bookingsFilter.commissionPaid = { $ne: true };
        }
        
        const bookings = await Booking.find(bookingsFilter)
            .populate('event_id', 'title date');
        
        // Default commission rate - in a real app this might be stored per event or in settings
        const commissionRate = 0.05; // 5%
        
        // Calculate commission metrics
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        const totalCommission = totalRevenue * commissionRate;
        
        // Group by month for statements
        const statements = [];
        const statementsByMonth = {};
        
        bookings.forEach(booking => {
            const date = new Date(booking.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = new Date(date.getFullYear(), date.getMonth(), 1).toLocaleString('default', { month: 'long' });
            
            if (!statementsByMonth[monthKey]) {
                statementsByMonth[monthKey] = {
                    id: monthKey,
                    period: `${monthName} ${date.getFullYear()}`,
                    startDate: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
                    endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString(),
                    bookingCount: 0,
                    revenue: 0,
                    commission: 0,
                    status: 'pending', // In a real app, this would be fetched from a Commission model
                    paymentDate: null,
                    events: {}
                };
            }
            
            // Add to monthly total
            statementsByMonth[monthKey].bookingCount += 1;
            statementsByMonth[monthKey].revenue += booking.totalPrice;
            statementsByMonth[monthKey].commission += booking.totalPrice * commissionRate;
            
            // Track per-event breakdown
            const eventId = booking.event_id._id.toString();
            if (!statementsByMonth[monthKey].events[eventId]) {
                statementsByMonth[monthKey].events[eventId] = {
                    id: eventId,
                    name: booking.event_id.title,
                    bookingCount: 0,
                    revenue: 0,
                    commission: 0
                };
            }
            
            statementsByMonth[monthKey].events[eventId].bookingCount += 1;
            statementsByMonth[monthKey].events[eventId].revenue += booking.totalPrice;
            statementsByMonth[monthKey].events[eventId].commission += booking.totalPrice * commissionRate;
        });
        
        // Convert to array and sort by date (most recent first)
        Object.values(statementsByMonth).forEach(statement => {
            statement.events = Object.values(statement.events);
            statements.push(statement);
        });
        
        statements.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        // Get commission rates and details (placeholder - would be from a settings model)
        const commissionDetails = {
            standardRate: commissionRate * 100, // as percentage
            tieredRates: [
                { threshold: 0, rate: 5 },
                { threshold: 10000, rate: 4.5 },
                { threshold: 50000, rate: 4 },
                { threshold: 100000, rate: 3.5 }
            ],
            paymentSchedule: 'monthly',
            paymentMethod: 'bank transfer',
            nextPaymentDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toISOString(),
            commissionTerms: 'Las comisiones se calculan como un porcentaje del precio total de las entradas vendidas y se facturan mensualmente.'
        };
        
        return res.status(200).json(new ApiResponse(
            200,
            {
                summary: {
                    totalRevenue,
                    totalCommission,
                    pendingCommission: totalCommission, // In a real app, this would be calculated from unpaid commissions
                    paidCommission: 0, // In a real app, this would be from a Commission model
                    commissionRate: commissionRate * 100 // as percentage
                },
                commissionDetails,
                statements
            },
            'Commission details retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching commission details:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to retrieve commission details');
    }
});

/**
 * @desc    Get occupancy and capacity analytics
 * @route   GET /api/v1/dashboard/organizer/occupancy
 * @access  Private (Organizer & Admin)
 */
export const getOccupancyAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const { eventId } = req.query;
    
    // For admins, we don't filter by user_id
    const userFilter = isAdmin ? {} : { user_id: userId };
    
    try {
        // If eventId is provided, filter by specific event
        const eventsFilter = eventId ? { ...userFilter, _id: eventId } : userFilter;
        
        // Get events
        const events = await Event.find(eventsFilter)
            .sort({ date: -1 }) // Most recent first
            .limit(eventId ? 1 : 10); // Limit to 10 events unless specific event requested
        
        if (events.length === 0) {
            return res.status(200).json(new ApiResponse(
                200,
                { 
                    events: [],
                    summary: {
                        averageOccupancy: 0,
                        totalCapacity: 0,
                        totalBookings: 0
                    }
                },
                'No events found'
            ));
        }
        
        // Get event IDs
        const eventIds = events.map(event => event._id);
        
        // Get bookings for these events
        const bookings = await Booking.find({ event_id: { $in: eventIds } });
        
        // Calculate occupancy metrics for each event
        const occupancyData = [];
        let totalCapacity = 0;
        let totalBookings = 0;
        
        for (const event of events) {
            const eventBookings = bookings.filter(booking => 
                booking.event_id.toString() === event._id.toString()
            );
            
            const ticketsSold = eventBookings.reduce((sum, booking) => sum + booking.selectedSeats.length, 0);
            const capacity = event.totalCapacity || 0;
            totalCapacity += capacity;
            totalBookings += ticketsSold;
            
            const occupancyRate = capacity > 0 ? (ticketsSold / capacity) * 100 : 0;
            
            // Get section occupancy if available
            const sectionOccupancy = {};
            
            if (event.sections && event.sections.length > 0) {
                // Initialize sections
                event.sections.forEach(section => {
                    sectionOccupancy[section.id] = {
                        id: section.id,
                        name: section.name,
                        capacity: section.capacity || 0,
                        booked: 0,
                        occupancyRate: 0
                    };
                });
                
                // Count bookings by section
                eventBookings.forEach(booking => {
                    booking.selectedSeats.forEach(seat => {
                        if (seat.section && sectionOccupancy[seat.section]) {
                            sectionOccupancy[seat.section].booked += 1;
                        }
                    });
                });
                
                // Calculate section occupancy rates
                Object.values(sectionOccupancy).forEach(section => {
                    section.occupancyRate = section.capacity > 0 
                        ? (section.booked / section.capacity) * 100 
                        : 0;
                });
            }
            
            occupancyData.push({
                id: event._id,
                title: event.title,
                date: event.date,
                venue: event.location,
                capacity,
                ticketsSold,
                occupancyRate,
                sections: Object.values(sectionOccupancy),
                // Breakdown by ticket type
                ticketTypes: [{
                    type: 'standard',
                    sold: eventBookings.reduce((sum, booking) => 
                        sum + booking.selectedSeats.filter(seat => !seat.type || seat.type === 'standard').length, 0),
                    revenue: eventBookings.reduce((sum, booking) => {
                        const standardTickets = booking.selectedSeats.filter(
                            seat => !seat.type || seat.type === 'standard'
                        ).length;
                        return sum + (standardTickets * event.price);
                    }, 0)
                }, {
                    type: 'vip',
                    sold: eventBookings.reduce((sum, booking) => 
                        sum + booking.selectedSeats.filter(seat => seat.type === 'vip').length, 0),
                    revenue: eventBookings.reduce((sum, booking) => {
                        const vipTickets = booking.selectedSeats.filter(
                            seat => seat.type === 'vip'
                        ).length;
                        return sum + (vipTickets * (event.priceVIP || event.price));
                    }, 0)
                }]
            });
        }
        
        // Calculate overall average occupancy
        const averageOccupancy = totalCapacity > 0 
            ? (totalBookings / totalCapacity) * 100 
            : 0;
        
        return res.status(200).json(new ApiResponse(
            200,
            {
                events: occupancyData,
                summary: {
                    averageOccupancy,
                    totalCapacity,
                    totalBookings
                }
            },
            'Occupancy analytics retrieved successfully'
        ));
    } catch (error) {
        console.error('Error fetching occupancy analytics:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to retrieve occupancy analytics');
    }
});

export default {
    getOrganizerDashboardOverview,
    getEventAnalytics,
    getFinancialOverview,
    getAttendeesData,
    updateAttendeeCheckIn,
    exportAttendeesList,
    getSalesReport,
    getCommissionDetails,
    getOccupancyAnalytics
};