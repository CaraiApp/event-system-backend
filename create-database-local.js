// Script para crear manualmente la base de datos entradasmelilla
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

// Load environment variables
dotenv.config({path: './config.env'});

// URL de conexión modificada para usar entradasmelilla explícitamente
const mongoUrl = process.env.MONGODB_URL.includes('?')
  ? process.env.MONGODB_URL.replace('?', '/entradasmelilla?')
  : `${process.env.MONGODB_URL}/entradasmelilla`;

console.log('Connecting to MongoDB with URL (sensitive info hidden):');
console.log(mongoUrl.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2'));

// Función para crear la base de datos e inicializar
async function createDatabase() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Conexión a MongoDB exitosa');
    
    // Crear las colecciones necesarias
    await mongoose.connection.db.createCollection('users');
    console.log('Colección "users" creada');
    
    await mongoose.connection.db.createCollection('events');
    console.log('Colección "events" creada');
    
    await mongoose.connection.db.createCollection('bookings');
    console.log('Colección "bookings" creada');
    
    await mongoose.connection.db.createCollection('timeslots');
    console.log('Colección "timeslots" creada');
    
    await mongoose.connection.db.createCollection('reviews');
    console.log('Colección "reviews" creada');
    
    // Crear usuario administrador
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
    console.log('Usuario administrador creado con éxito');
    
    // Crear usuario de prueba
    const testUserPassword = await bcrypt.hash('Test123!', salt);
    
    const testUser = new User({
      username: "testuser",
      email: "test@example.com",
      password: testUserPassword,
      role: "usuario",
      fullname: "Test User"
    });
    
    await testUser.save();
    console.log('Usuario de prueba creado con éxito');
    
    console.log('');
    console.log('¡Base de datos "entradasmelilla" creada e inicializada con éxito!');
    console.log('------------------------------------------------');
    console.log('|  Usuarios creados:                           |');
    console.log('|  - Admin:                                    |');
    console.log('|    Email: admin@example.com                  |');
    console.log('|    Contraseña: Admin123!                     |');
    console.log('|  - Usuario de prueba:                        |');
    console.log('|    Email: test@example.com                   |');
    console.log('|    Contraseña: Test123!                      |');
    console.log('------------------------------------------------');
    
  } catch (error) {
    console.error('Error al crear la base de datos:', error);
  } finally {
    // Cerrar la conexión a MongoDB
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  }
}

// Ejecutar la función
createDatabase().then(() => {
  console.log('Script completado');
  process.exit(0);
}).catch(err => {
  console.error('Error en el script:', err);
  process.exit(1);
});