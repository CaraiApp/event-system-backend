// Script para verificar y solucionar la conexión a MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({path: './config.env'});

const verifyConnection = async () => {
    try {
        console.log("Testing MongoDB connection...");
        
        // Get MongoDB URL from environment
        let mongoUrl = process.env.MONGODB_URL;
        console.log("Original MongoDB URL:", mongoUrl);
        
        // Explicitly add database name to URL
        if (mongoUrl.includes('mongodb+srv://')) {
            const urlParts = mongoUrl.split('mongodb+srv://')[1].split('/');
            if (urlParts.length === 1 || (urlParts.length > 1 && urlParts[1].startsWith('?'))) {
                // Add entradasmelilla as the database name
                if (mongoUrl.includes('?')) {
                    // If there are query parameters, insert before them
                    mongoUrl = mongoUrl.replace('?', '/entradasmelilla?');
                } else {
                    // If no query parameters, just add at the end
                    mongoUrl = `${mongoUrl}/entradasmelilla`;
                }
                console.log("Modified MongoDB URL to include database name:", mongoUrl);
            }
        }
        
        // Try to connect with the modified URL
        await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log("MongoDB Connected Successfully");
        console.log("Connection state:", mongoose.connection.readyState);
        
        // Check if DB is defined
        if (mongoose.connection.db) {
            console.log("Database name:", mongoose.connection.db.databaseName);
        } else {
            console.error("Error: mongoose.connection.db is undefined");
            console.log("Connection object:", mongoose.connection);
        }
        
        // Suggest fix for the railway.js file
        console.log("\nSuggested fix for railway.js database initialization endpoint:");
        console.log(`
// Replace lines 332-337 in railway.js with:
const stats = {
    databaseName: mongoose.connection.readyState === 1 ? 
        (mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown') : 'not connected',
    users: await User.countDocuments(),
    events: await Event.countDocuments(),
    bookings: await Booking.countDocuments(),
    timeslots: await TimeSlot.countDocuments(),
    reviews: await Review.countDocuments()
};
        `);
        
        // Close the connection
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
        
        return true;
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        
        console.log("\nPossible solution:");
        console.log("1. Check if the MongoDB credentials are correct");
        console.log("2. Ensure the MongoDB cluster is accessible from your current network");
        console.log("3. Try updating the MONGODB_URL in config.env");
        console.log("4. Check if the MongoDB user has appropriate permissions");
        
        return false;
    }
};

// Run the verification
verifyConnection().then(() => {
    process.exit(0);
}).catch(err => {
    console.error("Uncaught error:", err);
    process.exit(1);
});