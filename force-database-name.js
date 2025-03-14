// Script para forzar el uso de la base de datos "entradasmelilla" en MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

// Cargar variables de entorno
dotenv.config({path: './config.env'});

// Función para registrar con marca de tiempo
const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

// Obtener URL de MongoDB
const mongoUrl = process.env.MONGODB_URL;
log(`MongoDB URL configurada: ${mongoUrl.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2')}`);

// Opciones de conexión con el nombre de base de datos forzado
const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'entradasmelilla', // Forzar el nombre de base de datos con esta opción
  // Opciones adicionales para mejor manejo
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
};

async function createDatabaseStructure() {
  try {
    log('Conectando a MongoDB...');
    await mongoose.connect(mongoUrl, connectOptions);
    
    // Verificar la conexión
    const dbName = mongoose.connection.db.databaseName;
    log(`Conectado a la base de datos: ${dbName}`);
    
    if (dbName !== 'entradasmelilla') {
      throw new Error(`No se pudo forzar el nombre de base de datos "entradasmelilla", conectado a "${dbName}"`);
    }
    
    // Crear colecciones principales
    log('Creando estructura de la base de datos...');
    
    // Lista de colecciones a crear
    const collections = [
      'users',
      'events',
      'bookings',
      'timeslots',
      'reviews'
    ];
    
    // Verificar colecciones existentes
    const existingCollections = await mongoose.connection.db.listCollections().toArray();
    const existingNames = existingCollections.map(c => c.name);
    
    log(`Colecciones existentes: ${existingNames.join(', ') || 'ninguna'}`);
    
    // Crear colecciones faltantes
    for (const collection of collections) {
      if (!existingNames.includes(collection)) {
        log(`Creando colección: ${collection}`);
        await mongoose.connection.db.createCollection(collection);
      } else {
        log(`La colección ${collection} ya existe`);
      }
    }
    
    // Crear usuario de prueba básico para verificar escritura
    const usersCollection = mongoose.connection.db.collection('users');
    const userCount = await usersCollection.countDocuments();
    
    if (userCount === 0) {
      log('Creando usuario administrador de prueba...');
      await usersCollection.insertOne({
        username: 'admin',
        email: 'admin@example.com',
        password: '$2a$10$CwTycUXWue0Thq9StjUM0uQxTmrjh1/B8UOwIIrRyFRNk.cSZqjey', // 'password' encriptado
        role: 'admin',
        fullname: 'Admin User',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      log('Usuario administrador creado con éxito');
    } else {
      log(`Ya existen ${userCount} usuarios en la base de datos`);
    }
    
    // Verificar la estructura final
    const finalCollections = await mongoose.connection.db.listCollections().toArray();
    log('Estructura de base de datos creada:');
    for (const collection of finalCollections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      log(`- ${collection.name}: ${count} documentos`);
    }
    
    log('Proceso completado con éxito. La base de datos "entradasmelilla" está configurada correctamente.');
  } catch (error) {
    log(`ERROR: ${error.message}`);
    console.error(error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      log('Conexión a MongoDB cerrada');
    }
  }
}

// Ejecutar la función principal
createDatabaseStructure();