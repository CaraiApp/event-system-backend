// Script para probar la conexión directa a MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({path: './config.env'});

// URL de MongoDB
const mongoUrl = process.env.MONGODB_URL;

// Información sobre la URL
console.log('Probando conexión a MongoDB...');
console.log('URL (sin credenciales):', mongoUrl.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2'));

// Opciones de conexión
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 segundos de timeout para selección de servidor
};

// Probar la conexión
async function testConnection() {
  try {
    // Intentar conectar sin especificar base de datos
    console.log('\nPrueba 1: Conectando con la URL original...');
    await mongoose.connect(mongoUrl, options);
    console.log('¡Conexión exitosa!');
    console.log('Estado de la conexión:', mongoose.connection.readyState);
    console.log('Base de datos:', mongoose.connection.db ? mongoose.connection.db.databaseName : 'desconocida');
    await mongoose.connection.close();
    console.log('Conexión cerrada');
    
    // Intentar conectar especificando base de datos
    console.log('\nPrueba 2: Conectando con base de datos "entradasmelilla"...');
    // Modificar URL para agregar explícitamente la base de datos
    let modifiedUrl;
    if (mongoUrl.includes('?')) {
      modifiedUrl = mongoUrl.replace('?', '/entradasmelilla?');
    } else {
      modifiedUrl = `${mongoUrl}/entradasmelilla`;
    }
    console.log('URL modificada (sin credenciales):', modifiedUrl.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2'));
    
    await mongoose.connect(modifiedUrl, options);
    console.log('¡Conexión exitosa!');
    console.log('Estado de la conexión:', mongoose.connection.readyState);
    console.log('Base de datos:', mongoose.connection.db ? mongoose.connection.db.databaseName : 'desconocida');
    
    // Probar operaciones básicas
    console.log('\nProbando operaciones en la base de datos...');
    try {
      // Intentar listar colecciones
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Colecciones existentes:', collections.map(c => c.name));
      
      // Comprobar si existe la colección 'users'
      const hasUsers = collections.some(c => c.name === 'users');
      console.log('¿Existe la colección "users"?', hasUsers ? 'Sí' : 'No');
      
      if (hasUsers) {
        // Contar documentos en la colección users
        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log('Número de usuarios en la colección:', userCount);
      } else {
        console.log('La colección "users" no existe, creándola...');
        await mongoose.connection.db.createCollection('users');
        console.log('Colección "users" creada con éxito');
      }
    } catch (opError) {
      console.error('Error al realizar operaciones en la base de datos:', opError);
    }
    
    await mongoose.connection.close();
    console.log('Conexión cerrada');
    
    console.log('\n¡Pruebas completadas!');
    
  } catch (error) {
    console.error('Error de conexión:', error);
    
    // Información adicional sobre el error
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nProblema de selección de servidor MongoDB. Posibles causas:');
      console.error('1. Credenciales incorrectas');
      console.error('2. Restricciones de IP en MongoDB Atlas (no acepta conexiones desde tu IP o desde Railway)');
      console.error('3. Nombre de cluster incorrecto');
      console.error('4. Problemas de red');
    }
    
    // Sugerencias
    console.log('\nSugerencias:');
    console.log('1. Verifica las credenciales en config.env');
    console.log('2. En MongoDB Atlas, configura "Network Access" para permitir conexiones desde cualquier IP (0.0.0.0/0)');
    console.log('3. Asegúrate de que el cluster esté activo en MongoDB Atlas');
    console.log('4. Verifica la URL de conexión en MongoDB Atlas');
  } finally {
    // Asegurar que la conexión esté cerrada
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(0);
  }
}

// Ejecutar la prueba
testConnection();