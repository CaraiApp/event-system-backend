// Script para depurar en detalle la conexión a MongoDB y entender cómo 
// se está seleccionando el nombre de la base de datos
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

// Cargar variables de entorno
dotenv.config({path: './config.env'});

// Guardar registros en un archivo
const logFile = fs.createWriteStream('./mongodb-debug.log', { flags: 'a' });
const log = (message) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logFile.write(formattedMessage + '\n');
};

// Monkeypatching de mongoose.connect para rastrear todos los argumentos
const originalMongooseConnect = mongoose.connect;
mongoose.connect = function() {
  log(`mongoose.connect() llamada con ${arguments.length} argumentos:`);
  for (let i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] === 'object') {
      log(`  Argumento ${i}: ${JSON.stringify(arguments[i])}`);
    } else {
      log(`  Argumento ${i}: ${arguments[i]}`);
    }
  }
  return originalMongooseConnect.apply(this, arguments);
};

// Función para analizar la URL de MongoDB y extraer sus componentes
function parseMongoUrl(url) {
  try {
    // Separar la URL y los parámetros de consulta
    const [baseUrl, queryString] = url.split('?');
    log(`URL base: ${baseUrl}`);
    
    // Extraer el protocolo, las credenciales, el host y la base de datos
    const protocolSplit = baseUrl.split('://');
    const protocol = protocolSplit[0];
    
    const rest = protocolSplit[1];
    const atSplit = rest.split('@');
    const credentials = atSplit[0];
    
    const hostPart = atSplit[1];
    const hostDbSplit = hostPart.split('/');
    const host = hostDbSplit[0];
    
    // Extraer el nombre de la base de datos (si existe)
    const dbName = hostDbSplit.length > 1 ? hostDbSplit[1] : '';
    
    // Analizar los parámetros de consulta (si existen)
    const queryParams = {};
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        queryParams[key] = value;
      });
    }
    
    return {
      protocol,
      credentials: credentials.includes(':') ? `${credentials.split(':')[0]}:****` : credentials,
      host,
      dbName,
      queryParams
    };
  } catch (error) {
    log(`Error al analizar la URL: ${error.message}`);
    return {};
  }
}

// Comprobar la URL actual de MongoDB
const mongoUrl = process.env.MONGODB_URL;
log('Iniciando depuración de conexión a MongoDB');
log(`URL original en config.env: ${mongoUrl.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2')}`);

// Analizar los componentes de la URL
const urlParts = parseMongoUrl(mongoUrl);
log('Análisis de la URL:');
log(JSON.stringify(urlParts, null, 2));

// Verificar el nombre de la base de datos en la URL
if (!urlParts.dbName) {
  log('ADVERTENCIA: La URL no especifica un nombre de base de datos');
  log('MongoDB usará "test" por defecto si no se especifica un nombre de base de datos');
} else {
  log(`Nombre de base de datos en URL: ${urlParts.dbName}`);
}

// Probar la conexión a MongoDB con la URL original
async function testOriginalConnection() {
  try {
    log('Probando conexión con la URL original...');
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Verificar la conexión
    const actualDbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown';
    log(`¡Conexión exitosa! Base de datos actual: ${actualDbName}`);
    
    // Verificar si estamos conectados a la base de datos esperada
    if (urlParts.dbName && actualDbName !== urlParts.dbName) {
      log(`ADVERTENCIA: Conectado a "${actualDbName}" en lugar de "${urlParts.dbName}"`);
    }
    
    // Información sobre la conexión
    log(`Estado de la conexión: ${mongoose.connection.readyState}`);
    log(`URL de cliente: ${mongoose.connection.client ? mongoose.connection.client.s.url : 'N/A'}`);
    
    // Cerrar la conexión
    await mongoose.connection.close();
    log('Conexión cerrada');
  } catch (error) {
    log(`Error en la conexión original: ${error.message}`);
  }
}

// Probar una conexión con nombre de base de datos forzado
async function testExplicitDbConnection() {
  try {
    // Construir URL con base de datos explícita
    let explicitUrl = mongoUrl;
    if (!urlParts.dbName) {
      // Añadir 'entradasmelilla' como nombre de base de datos
      if (mongoUrl.includes('?')) {
        explicitUrl = mongoUrl.replace('?', '/entradasmelilla?');
      } else {
        explicitUrl = `${mongoUrl}/entradasmelilla`;
      }
      log(`URL modificada: ${explicitUrl.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+(@.+)/, '$1:****$2')}`);
    }
    
    log('Probando conexión con nombre de base de datos explícito...');
    // Conectar con la opción dbName explícita también
    await mongoose.connect(explicitUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'entradasmelilla' // Forzar el nombre aquí también
    });
    
    // Verificar la conexión
    const actualDbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown';
    log(`¡Conexión exitosa con dbName explícito! Base de datos actual: ${actualDbName}`);
    log(`Estado de la conexión: ${mongoose.connection.readyState}`);
    
    // Cerrar la conexión
    await mongoose.connection.close();
    log('Conexión cerrada');
  } catch (error) {
    log(`Error en conexión con dbName explícito: ${error.message}`);
  }
}

// Ejecutar las pruebas
async function runTests() {
  try {
    await testOriginalConnection();
    await testExplicitDbConnection();
    
    log('Terminando pruebas de conexión a MongoDB');
    log('Si el problema persiste, verifica:');
    log('1. Variables de entorno en Railway (podrían sobreescribir config.env)');
    log('2. Configuración del cluster en MongoDB Atlas');
    log('3. Permisos y roles del usuario de MongoDB');
    log('4. Verificar si hay configuraciones explícitas en otros archivos');
    
    logFile.end();
  } catch (error) {
    log(`Error durante las pruebas: ${error.message}`);
    logFile.end();
  }
}

runTests();