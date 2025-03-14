// Script para inicializar la base de datos manualmente
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Event from './models/Event.js';
import TimeSlot from './models/TimeSlot.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';
import Template from './models/Template.js';

// Load environment variables
dotenv.config({path: './config.env'});

// Connect to MongoDB
const connectDB = async () => {
    try {
        console.log("Connecting to MongoDB...");
        console.log("URL:", process.env.MONGODB_URL);
        
        await mongoose.connect(process.env.MONGODB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log("MongoDB Connected Successfully");
        return true;
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        return false;
    }
};

// Create admin user
const createAdminUser = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (adminExists) {
            console.log("Admin user already exists");
            return;
        }
        
        // Generate hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123!', salt);
        
        const adminUser = new User({
            username: "admin",
            email: "admin@example.com",
            password: hashedPassword,
            role: "admin",
            fullname: "Admin User"
        });
        
        await adminUser.save();
        console.log("Admin user created successfully");
    } catch (error) {
        console.error("Error creating admin user:", error);
    }
};

// Create a test user
const createTestUser = async () => {
    try {
        const testUserExists = await User.findOne({ email: 'test@example.com' });
        
        if (testUserExists) {
            console.log("Test user already exists");
            return;
        }
        
        // Generate hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Test123!', salt);
        
        const testUser = new User({
            username: "testuser",
            email: "test@example.com",
            password: hashedPassword,
            role: "usuario",
            fullname: "Test User"
        });
        
        await testUser.save();
        console.log("Test user created successfully");
    } catch (error) {
        console.error("Error creating test user:", error);
    }
};

// Create default template if none exists
const createDefaultTemplate = async () => {
    try {
        const templateExists = await Template.findOne({ isDefault: true });
        
        if (templateExists) {
            console.log("Default template already exists");
            return;
        }
        
        // Crear una plantilla básica para iniciar
        const defaultTemplate = new Template({
            id: "template-default",
            name: "Plantilla Predeterminada",
            description: "Plantilla básica creada automáticamente",
            isDefault: true,
            seats: [],
            sections: [
                { id: 'SECTION_1', name: 'Sección Principal', x: 200, y: 100, width: 400, height: 200 }
            ],
            texts: [
                { id: 'text-1', content: 'Escenario', x: 400, y: 50, fontSize: 16, color: 'white' }
            ],
            stageDimensions: { width: 30, height: 10 },
            rows: 0,
            columns: 0,
            defaultSeats: 0,
            dateCreated: new Date(),
            dateModified: new Date()
        });
        
        await defaultTemplate.save();
        console.log("Default template created successfully");
    } catch (error) {
        console.error("Error creating default template:", error);
    }
};

// Log database stats
const logDatabaseStats = async () => {
    try {
        console.log("--- Database Statistics ---");
        console.log(`Users: ${await User.countDocuments()}`);
        console.log(`Events: ${await Event.countDocuments()}`);
        console.log(`TimeSlots: ${await TimeSlot.countDocuments()}`);
        console.log(`Bookings: ${await Booking.countDocuments()}`);
        console.log(`Reviews: ${await Review.countDocuments()}`);
        console.log(`Templates: ${await Template.countDocuments()}`);
        console.log("---------------------------");
    } catch (error) {
        console.error("Error fetching database stats:", error);
    }
};

// Main initialization function
const initializeDatabase = async () => {
    const connected = await connectDB();
    
    if (!connected) {
        console.error("Failed to connect to database. Aborting initialization.");
        process.exit(1);
    }
    
    console.log("Starting database initialization...");
    
    await createAdminUser();
    await createTestUser();
    await createDefaultTemplate();
    await logDatabaseStats();
    
    console.log("Database initialization complete");
    
    // Close the connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    
    process.exit(0);
};

// Run the initialization
initializeDatabase();