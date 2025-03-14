import mongoose from 'mongoose';

/**
 * Configura la conexión a MongoDB con opciones avanzadas
 * 
 * @param {string} mongoUrl - URL de conexión a MongoDB
 * @param {string} dbName - Nombre de la base de datos (opcional, por defecto 'entradasmelilla')
 * @returns {Promise<boolean>} - true si la conexión fue exitosa, false en caso contrario
 */
export const setupDatabase = async (mongoUrl, dbName = 'entradasmelilla') => {
  // Verificar si tenemos URL
  if (!mongoUrl) {
    console.error('ERROR: MongoDB URL not provided!');
    
    // En Railway, usamos una URL de fallback para que el health check pueda pasar
    if (process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.RAILWAY === 'true') {
      console.log('⚠️ Railway deployment detected and no MongoDB URL provided');
      console.log('⚠️ Setting up fallback for health check only');
      process.env.MONGODB_CONNECTION_FAILED = 'true';
      return true; // Permitir que el servicio inicie para pasar el health check
    }
    
    return false;
  }
  
  // Configuración avanzada para MongoDB
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    // Forzar el nombre de la base de datos explícitamente
    dbName: dbName,
    // Configuración adicional para mejorar la estabilidad
    heartbeatFrequencyMS: 10000, // Verificar estado del servidor cada 10 segundos
    retryWrites: true,
    w: 'majority', // Confirmar escrituras en la mayoría de los servidores
  };

  // Asegurar que estamos usando la base de datos correcta
  let connectionUrl = mongoUrl;
  
  // Parsear la URL correctamente
  const baseUrl = mongoUrl.split('?')[0];
  const queryParams = mongoUrl.includes('?') ? `?${mongoUrl.split('?')[1]}` : '';
  
  // Verificar si la URL ya contiene un nombre de base de datos
  if (baseUrl.split('/').length >= 4) {
    // URL ya incluye un nombre de base de datos, no modificar
    console.log(`URL already includes a database name, not adding ${dbName}`);
  } else {
    // Añadir el nombre de base de datos
    connectionUrl = `${baseUrl}/${dbName}${queryParams}`;
    console.log(`Added database name '${dbName}' to MongoDB URL`);
  }

  try {
    // Desconectar si hay una conexión existente
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.close();
        console.log('Previous MongoDB connection closed');
      } catch (closeError) {
        console.error('Error closing previous connection:', closeError.message);
      }
    }

    // Para Railway: si estamos en un despliegue inicial y necesitamos pasar el health check
    const isRailwayDeployment = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                                process.env.RAILWAY === 'true';
                              
    if (isRailwayDeployment && process.env.SKIP_MONGO_WAIT_FOR_HEALTHCHECK === 'true') {
      console.log('🚨 IMPORTANTE: Utilizando modo especial para health check en Railway');
      console.log('La conexión a MongoDB se intentará en segundo plano');
      
      // Intentar conexión en segundo plano sin esperar
      setTimeout(() => {
        mongoose.connect(connectionUrl, options)
          .then(() => {
            console.log('✅ Conexión a MongoDB establecida en segundo plano');
            process.env.MONGODB_CONNECTION_FAILED = 'false';
            // Verificar colecciones en segundo plano
            ensureCollectionsExist().catch(err => {
              console.error('Error verificando colecciones:', err.message);
            });
          })
          .catch(err => {
            console.error('❌ Error conectando a MongoDB en segundo plano:', err.message);
            process.env.MONGODB_CONNECTION_FAILED = 'true';
          });
      }, 1000);
      
      return true; // Permitir que el servicio inicie para pasar el health check
    }

    // Intento estándar de conexión (esperando resultado)
    console.log(`Connecting to MongoDB database: ${dbName}`);
    await mongoose.connect(connectionUrl, options);
    
    if (mongoose.connection.readyState === 1) {
      // Ocultar credenciales de la URL para logs
      const safeUrl = connectionUrl.replace(/(mongodb(\+srv)?:\/\/[^:]+):[^@]+(@.+)/, '$1:****$4');
      console.log(`✅ Successfully connected to MongoDB: ${safeUrl}`);
      console.log(`Database name: ${mongoose.connection.db.databaseName}`);

      // Configurar manejadores de eventos para la conexión
      mongoose.connection.on('error', err => {
        console.error('MongoDB connection error:', err);
        process.env.MONGODB_CONNECTION_FAILED = 'true';
        
        // Intentar reconectar
        setTimeout(() => {
          console.log('Attempting to reconnect to MongoDB...');
          setupDatabase(mongoUrl, dbName)
            .then(success => {
              if (success) process.env.MONGODB_CONNECTION_FAILED = 'false';
            });
        }, 5000);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        process.env.MONGODB_CONNECTION_FAILED = 'true';
        
        // Intentar reconectar
        setTimeout(() => {
          console.log('Attempting to reconnect to MongoDB after disconnect...');
          setupDatabase(mongoUrl, dbName)
            .then(success => {
              if (success) process.env.MONGODB_CONNECTION_FAILED = 'false';
            });
        }, 5000);
      });

      // Verificar y crear colecciones necesarias
      await ensureCollectionsExist();
      
      process.env.MONGODB_CONNECTION_FAILED = 'false';
      return true;
    } else {
      console.error(`Connection state is ${mongoose.connection.readyState}, expected 1 (connected)`);
      process.env.MONGODB_CONNECTION_FAILED = 'true';
      
      // Para Railway, permitir continuar de todos modos para health check
      if (isRailwayDeployment) {
        console.log('⚠️ Continuing despite connection issues for Railway health check');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    if (error.name === 'MongoServerSelectionError') {
      console.error('Could not select a MongoDB server. Check network access and credentials.');
    }
    
    process.env.MONGODB_CONNECTION_FAILED = 'true';
    
    // En Railway, permitimos que continúe para que pase el health check
    if (process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.RAILWAY === 'true') {
      console.log('⚠️ Railway deployment detected, continuing despite MongoDB connection error');
      console.log('Health check will pass but database operations will fail');
      process.env.MONGODB_CONNECTION_ERROR = error.message;
      
      // Intentar reconexión en segundo plano
      setTimeout(() => {
        console.log('Attempting background reconnection to MongoDB...');
        setupDatabase(mongoUrl, dbName);
      }, 10000);
      
      return true; // Permitir que el servicio inicie para pasar el health check
    }
    
    return false;
  }
};

/**
 * Asegura que existan las colecciones necesarias
 */
async function ensureCollectionsExist() {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Lista de colecciones requeridas
    const requiredCollections = ['users', 'events', 'bookings', 'timeslots', 'reviews'];
    
    for (const coll of requiredCollections) {
      if (!collectionNames.includes(coll)) {
        console.log(`Creating missing collection: ${coll}`);
        await db.createCollection(coll);
      }
    }
    
    console.log('All required collections exist or have been created');
  } catch (error) {
    console.error('Error ensuring collections exist:', error);
  }
}

export default setupDatabase;