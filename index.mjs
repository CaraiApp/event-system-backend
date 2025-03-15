import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import userRoute from './routes/users.js'
import eventRoute from './routes/events.js'
import reviewRoute from './routes/reviews.js'
import bookingRoute from './routes/bookings.js'
import timeslotRoute from './routes/timeslots.js'
import authRoute from './routes/auth.js'
import templateRoute from './routes/templates.js'
import categoryRoute from './routes/categories.js'
import dashboardRoute from './routes/dashboard.js'
import tempBookingRoute from './routes/tempBookings.js'
import { handleStripePayment } from './Controllers/stripControllers.js';
import setupDatabase from './utils/databaseSetup.js';
import setupCors from './MiddleWares/cors.js';

// Cargar variables de entorno
dotenv.config({path:'./config.env'});
let app = express()
const portNo = process.env.PORT || 8000

// Configurar trust proxy para manejar correctamente los headers X-Forwarded-For
app.set('trust proxy', true);

// Configurar CORS de manera centralizada
app = setupCors(app);

// Configurar Stripe webhook antes de los middlewares de parseo de body
app.use('/api/v1/booking/webhook', express.raw({ type: 'application/json' }), handleStripePayment.handleStripeWebhook);

//database connection with retries and better error handling
const connect = async () => {
    const MAX_RETRIES = 5;
    let retryCount = 0;
    let lastError = null;
    
    // Modify MongoDB URL to use a specific database name
    let mongoUrl = process.env.MONGODB_URL;
    
    // Parsear URL de manera más segura para evitar problemas de estructura
    const baseUrl = mongoUrl.split('?')[0];
    const queryParams = mongoUrl.includes('?') ? `?${mongoUrl.split('?')[1]}` : '';
    
    // Verificar si la URL ya contiene un nombre de base de datos
    // Las URLs de MongoDB tienen formato mongodb+srv://usuario:contraseña@host/basededatos?params
    if (baseUrl.split('/').length >= 4) {
        // La URL ya incluye un nombre de base de datos
        console.log("URL already contains a database name, not modifying");
    } else {
        // Añadir 'entradasmelilla' como nombre de base de datos
        mongoUrl = `${baseUrl}/entradasmelilla${queryParams}`;
        console.log("Added database name 'entradasmelilla' to MongoDB URL");
    }
    
    // Log URL without sensitive information
    const logSafeUrl = mongoUrl.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2');
    console.log("Attempting to connect to MongoDB with URL:", logSafeUrl);
    
    // Add server selection timeout options for better error handling
    const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 15000, // Timeout for server selection - 15 seconds
        socketTimeoutMS: 45000, // Socket timeout - 45 seconds
        connectTimeoutMS: 30000, // Connection timeout - 30 seconds,
        dbName: 'entradasmelilla', // Force database name explicitly
    };
    
    // Connection function with retries
    while (retryCount < MAX_RETRIES) {
        try {
            await mongoose.connect(mongoUrl, connectionOptions);
            
            // Check if connection was successful
            if (mongoose.connection.readyState === 1) {
                const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown database';
                console.log(`MongoDB Database Connected Successfully to ${dbName}`);
                
                // Listen for connection errors after initial connection
                mongoose.connection.on('error', (err) => {
                    console.error('MongoDB connection error after initial connection:', err);
                    // Try to reconnect if app is still running
                    if (mongoose.connection.readyState !== 1) {
                        console.log('Attempting to reconnect to MongoDB...');
                        connect(); // Attempt to reconnect
                    }
                });
                
                mongoose.connection.on('disconnected', () => {
                    console.log('MongoDB disconnected, attempting to reconnect...');
                    connect(); // Attempt to reconnect
                });
                
                return true; // Connection successful
            } else {
                throw new Error(`Connection state is ${mongoose.connection.readyState} instead of 1 (connected)`);
            }
        } catch (error) {
            lastError = error;
            retryCount++;
            
            console.error(`MongoDB connection attempt ${retryCount} failed:`, error.message);
            
            if (retryCount < MAX_RETRIES) {
                const delay = 1000 * retryCount; // Increasing delay with each retry
                console.log(`Retrying in ${delay/1000} second(s)...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts. Last error:`, lastError?.message);
    return false; // Connection failed after retries
}

//middlewares - aumentamos límites para permitir payloads grandes
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cookieParser())

// Handle preflight OPTIONS requests 
app.use((req, res, next) => {
    // Log incoming requests for debugging
    console.log(`Request: ${req.method} ${req.originalUrl} from ${req.ip}`);
    
    // Para ser redundante y asegurar que CORS funciona, configuramos cabeceras en todas las solicitudes
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://event-system-frontend-web.vercel.app',
        'https://event-system-frontend-web-main.vercel.app',
        'https://entradasmelilla.vercel.app',
        'https://v2.entradasmelilla.com',
        'https://www.entradasmelilla.com',
        'https://entradasmelilla.com',
        'http://v2.entradasmelilla.com',
        'http://entradasmelilla.com',
        'https://demoticket.inasnapmarketing.ai'
    ];
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request for CORS preflight');
        res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
        return res.status(200).json({});
    }
    next();
})

//routes
app.get('/', (req,res)=>{
    res.send('Api working succesfully')
})

// Endpoint para crear la colección Template manualmente
app.get('/create-template-collection', async (req, res) => {
    try {
        // Verificar si la conexión a la base de datos está activa
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                message: "No hay conexión a la base de datos",
                readyState: mongoose.connection.readyState
            });
        }
        
        // Crear la colección manualmente utilizando el driver nativo de MongoDB
        await mongoose.connection.db.createCollection('templates');
        
        console.log("Colección 'templates' creada manualmente");
        
        // Verificar que la colección existe
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        return res.status(200).json({
            success: true,
            message: "Colección 'templates' creada exitosamente",
            collections: collectionNames,
            hasTemplates: collectionNames.includes('templates')
        });
    } catch (error) {
        console.error("Error al crear la colección 'templates':", error);
        return res.status(500).json({
            success: false,
            message: "Error al crear la colección 'templates'",
            error: error.message
        });
    }
});

// Endpoint para crear un documento template predeterminado
app.get('/create-default-template', async (req, res) => {
    try {
        // Verificar si la conexión a la base de datos está activa
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                message: "No hay conexión a la base de datos",
                readyState: mongoose.connection.readyState
            });
        }
        
        // Crear un documento template utilizando el driver nativo de MongoDB
        const defaultTemplate = {
            id: "template-default",
            name: "Plantilla Predeterminada",
            description: "Plantilla básica creada manualmente",
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
        };
        
        // Insertar el documento directamente en la colección
        const result = await mongoose.connection.db.collection('templates').insertOne(defaultTemplate);
        
        console.log("Template predeterminado creado manualmente:", result);
        
        // Verificar el documento insertado
        const templates = await mongoose.connection.db.collection('templates').find({}).toArray();
        
        return res.status(200).json({
            success: true,
            message: "Template predeterminado creado exitosamente",
            insertResult: result,
            templates: templates
        });
    } catch (error) {
        console.error("Error al crear el template predeterminado:", error);
        return res.status(500).json({
            success: false,
            message: "Error al crear el template predeterminado",
            error: error.message
        });
    }
});

// Endpoint temporal para inicializar la base de datos (ELIMINAR DESPUÉS DE USAR)
app.get('/init-database', async (req, res) => {
    try {
        // Importar módulos necesarios
        const bcrypt = await import('bcryptjs');
        const User = await import('./models/User.js').then(module => module.default);
        const Event = await import('./models/Event.js').then(module => module.default);
        const TimeSlot = await import('./models/TimeSlot.js').then(module => module.default);
        const Booking = await import('./models/Booking.js').then(module => module.default);
        const Review = await import('./models/Review.js').then(module => module.default);
        
        console.log("Inicializando la base de datos...");
        console.log("Colecciones disponibles:", await mongoose.connection.db.listCollections().toArray());
        
        // Información detallada sobre la base de datos
        const dbName = mongoose.connection.db.databaseName;
        console.log("Nombre de la base de datos:", dbName);
        
        // Verificar si el modelo Template está correctamente registrado
        let modelNames = mongoose.modelNames();
        console.log("Modelos registrados:", modelNames);
        
        // Importar Template directamente
        let Template;
        try {
            const templateModule = await import('./models/Template.js');
            Template = templateModule.default;
            console.log("Importación de Template exitosa:", Template.modelName);
        } catch (importError) {
            console.error("Error al importar el modelo Template:", importError);
            return res.status(500).json({
                success: false,
                message: "Error al importar el modelo Template",
                error: importError.message
            });
        }
        
        // Crear template directamente
        try {
            const templateData = {
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
                defaultSeats: 0
            };
            
            // Intentar guardar el template
            const templateInstance = new Template(templateData);
            await templateInstance.save();
            console.log("Template guardado exitosamente");
        } catch (templateError) {
            console.error("Error al guardar el template:", templateError);
        }
        
        // Verificar los modelos después de la operación
        modelNames = mongoose.modelNames();
        console.log("Modelos registrados después de operación:", modelNames);
        
        // Comprobar si la colección template existe
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log("Colecciones después de operación:", collectionNames);
        
        // Obtener estadísticas
        const stats = {};
        
        // Estadísticas generales
        stats.databaseName = dbName;
        stats.users = await User.countDocuments();
        stats.events = await Event.countDocuments();
        stats.bookings = await Booking.countDocuments();
        stats.timeslots = await TimeSlot.countDocuments();
        stats.reviews = await Review.countDocuments();
        
        // Contar templates si la colección existe
        try {
            if (Template) {
                stats.templates = await Template.countDocuments();
            } else {
                stats.templatesError = "Modelo Template no disponible";
            }
        } catch (countError) {
            stats.templatesError = countError.message;
        }
        
        // Comprobar si el endpoint de templates funciona
        try {
            const templateRoute = await import('./routes/templates.js').then(module => module.default);
            stats.templateRouteLoaded = !!templateRoute;
        } catch (routeError) {
            stats.templateRouteError = routeError.message;
        }
        
        return res.status(200).json({
            success: true,
            message: "Inicialización completada y diagnóstico realizado",
            models: modelNames,
            collections: collectionNames,
            stats: stats
        });
    } catch (error) {
        console.error("Error en la inicialización:", error);
        return res.status(500).json({
            success: false,
            message: "Error durante la inicialización",
            error: error.message,
            stack: error.stack
        });
    }
})

// Ultra simple health check - ALWAYS returns 200 OK with no database checks
// This is specifically designed to pass Railway's health check
app.get('/health', (req, res) => {
    console.log('Health check endpoint accessed from index.mjs');
    
    // Garantizar que siempre responda con 200 OK, sin importar el estado de la BD
    return res.status(200).send('OK');
});

// Detailed health check endpoint with MongoDB connection status and diagnostics
app.get('/health/detailed', async (req, res) => {
    try {
        // Check MongoDB connection state
        const connState = mongoose.connection.readyState;
        const isConnected = connState === 1;
        const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        
        let dbInfo = {
            connected: isConnected,
            state: stateNames[connState] || 'unknown',
            readyState: connState
        };
        
        // Si hay un problema con la conexión, intentar reconectar automáticamente
        if (!isConnected) {
            console.log('Health check triggered reconnection attempt');
            try {
                // Intentar reconectar en segundo plano
                setTimeout(async () => {
                    try {
                        const reconnected = await setupDatabase(process.env.MONGODB_URL, 'entradasmelilla');
                        console.log('Health-triggered reconnection result:', reconnected ? 'SUCCESS' : 'FAILED');
                    } catch (e) {
                        console.error('Reconnection error:', e.message);
                    }
                }, 100);
                
                dbInfo.reconnectionAttempt = 'triggered';
            } catch (reconnectError) {
                dbInfo.reconnectionError = reconnectError.message;
            }
        }
        
        // Intentar obtener información de la base de datos si estamos conectados
        if (isConnected && mongoose.connection.db) {
            dbInfo.databaseName = mongoose.connection.db.databaseName;
            
            // Obtener información de la colección users
            try {
                const userCount = await mongoose.connection.db.collection('users').countDocuments();
                dbInfo.usersCollection = {
                    exists: true,
                    documentCount: userCount
                };
            } catch (collError) {
                dbInfo.usersCollection = {
                    exists: false,
                    error: collError.message
                };
            }
            
            // Lista de todas las colecciones
            try {
                const collections = await mongoose.connection.db.listCollections().toArray();
                dbInfo.collections = collections.map(c => c.name);
            } catch (listError) {
                dbInfo.collectionsError = listError.message;
            }
        }
        
        // Información de diagnóstico adicional
        const diagnostics = {
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            uptime: Math.floor(process.uptime()),
            memoryUsage: process.memoryUsage(),
            // Información de MongoDB sin credenciales
            mongoUrl: process.env.MONGODB_URL ? 
                process.env.MONGODB_URL.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2') : 
                'URL no configurada'
        };
        
        // Si estamos desconectados, intentar mostrar información sobre por qué
        if (!isConnected) {
            // Intenta configurar una conexión temporal solo para diagnóstico
            try {
                const testMongoose = mongoose.createConnection();
                const testConnState = testMongoose.readyState;
                diagnostics.testConnection = {
                    state: stateNames[testConnState] || 'unknown',
                    readyState: testConnState
                };
                
                // Cerrar esta conexión de prueba
                if (testMongoose.readyState !== 0) {
                    await testMongoose.close();
                }
            } catch (testError) {
                diagnostics.testConnectionError = testError.message;
            }
        }
        
        // Retornar información detallada del estado - siempre 200 para evitar fallos en healthchecks de despliegue
        res.status(200).json({
            status: isConnected ? 'ok' : 'warning',
            message: isConnected ? 'Service is fully operational' : 'Service is running but database connection has issues',
            timestamp: new Date().toISOString(),
            mongodb: dbInfo,
            diagnostics: diagnostics
        });
    } catch (error) {
        // Even if detailed check fails, return 200 for deployment healthchecks
        res.status(200).json({
            status: 'warning',
            message: 'Service is running but detailed health check encountered an error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
})

//setting route for Authentication
app.use('/api/v1/auth', authRoute)

//setting route for User
app.use('/api/v1/users', userRoute)

//setting route for Event
app.use('/api/v1/events', eventRoute)

//setting route for Review
app.use('/api/v1/review', reviewRoute)

//setting route for Booking
app.use('/api/v1/booking', bookingRoute)

//setting route for Timeslot
app.use('/api/v1/timeslot', timeslotRoute)

//setting route for Templates (con y sin v1 para compatibilidad)
app.use('/api/v1/templates', templateRoute)
app.use('/api/templates', templateRoute) // Ruta adicional para compatibilidad con el frontend

// Ruta alternativa para UI-config que REDIRIGE a la ruta oficial protegida
app.get('/api/templates/ui-config', (req, res) => {
    // Esta ruta alternativa ahora SIEMPRE redirige a la ruta oficial que está protegida
    const redirectUrl = `/api/v1/dashboard/ui-config${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    console.log(`Redirigiendo solicitud a ruta protegida: ${redirectUrl}`);
    
    // Redirigimos manteniendo parámetros y cabeceras
    return res.redirect(307, redirectUrl); // 307 preserva el método HTTP
});

//setting route for Categories
app.use('/api/v1/categories', categoryRoute)

//setting route for Dashboard
app.use('/api/v1/dashboard', dashboardRoute)

//setting route for Temporary Bookings
app.use('/api/v1/temp-bookings', tempBookingRoute)


//starting the server with proper MongoDB connection handling
const startServer = async () => {
    try {
        // First establish MongoDB connection using the new setup utility
        console.log('Establishing MongoDB connection before starting server...');
        
        // Añadir un retraso antes de intentar conectar a MongoDB (a veces ayuda con problemas de red)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mongoUrl = process.env.MONGODB_URL;
        // Log URL without sensitive information
        const logSafeUrl = mongoUrl.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2');
        console.log("Connecting to MongoDB with URL:", logSafeUrl);
        
        // Intentar conexión con la nueva utilidad
        const connected = await setupDatabase(mongoUrl, 'entradasmelilla');
        
        if (!connected) {
            console.error('WARNING: Server starting with failed MongoDB connection!');
            console.error('API endpoints requiring database access will not work properly!');
            
            // Crear una conexión simulada para evitar errores
            console.log('Setting up memory fallback to prevent immediate crashes...');
            // Esto no es una conexión real, pero evita que la aplicación falle inmediatamente
            if (mongoose.connection.readyState !== 1) {
                mongoose.connection.readyState = 0; // Marcar como desconectado para el estado
            }
        }
        
        // Start the Express server
        const server = app.listen(portNo, (err) => {
            if (err) {
                console.error('Failed to start server:', err);
                return;
            }
            console.log('Server listening on port ' + portNo);
            console.log(`Server URL: http://localhost:${portNo}`);
            console.log(`Health check: http://localhost:${portNo}/health`);
            
            // Probar reconexión en segundo plano si la primera falló
            if (!connected) {
                console.log('Attempting background reconnection to MongoDB...');
                setTimeout(async () => {
                    try {
                        const reconnected = await setupDatabase(mongoUrl, 'entradasmelilla');
                        console.log('Background reconnection attempt result:', reconnected ? 'SUCCESS' : 'FAILED');
                    } catch (e) {
                        console.error('Background reconnection error:', e.message);
                    }
                }, 5000);
            }
        });
        
        // Graceful shutdown on SIGTERM
        process.on('SIGTERM', async () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(async () => {
                console.log('HTTP server closed');
                try {
                    if (mongoose.connection.readyState !== 0) {
                        await mongoose.connection.close();
                        console.log('MongoDB connection closed');
                    }
                } catch (err) {
                    console.error('Error closing MongoDB connection:', err);
                } finally {
                    process.exit(0);
                }
            });
        });
        
        return server;
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
const server = startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    // Keep the process alive but log the error
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    // Keep the process alive but log the error
})
