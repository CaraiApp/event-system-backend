// Script para corregir el endpoint de inicialización de la base de datos en railway.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo railway.js
const railwayFilePath = path.join(__dirname, 'railway.js');

try {
    // Leer el contenido actual
    console.log(`Leyendo archivo: ${railwayFilePath}`);
    const content = fs.readFileSync(railwayFilePath, 'utf-8');
    
    // Buscar la sección del código que necesita ser corregida
    const problemSection = `        // Get stats for response
        const stats = {
            databaseName: mongoose.connection.db.databaseName,`;
    
    // Reemplazar con la versión corregida
    const fixedSection = `        // Get stats for response
        const stats = {
            databaseName: mongoose.connection.readyState === 1 ? 
                (mongoose.connection.db ? mongoose.connection.db.databaseName : 'entradasmelilla') : 'not connected',`;
    
    // Verificar si el problema existe en el archivo
    if (content.includes(problemSection)) {
        console.log('Se encontró la sección problemática, aplicando corrección...');
        
        // Aplicar el parche
        const updatedContent = content.replace(problemSection, fixedSection);
        
        // Guardar el archivo corregido
        fs.writeFileSync(railwayFilePath, updatedContent, 'utf-8');
        console.log('¡Corrección aplicada con éxito!');
        
        console.log('\nAhora puedes subir los cambios a GitHub con:');
        console.log('git add railway.js');
        console.log('git commit -m "Fix database initialization endpoint in railway.js"');
        console.log('git push');
        
        console.log('\nLuego, Railway detectará los cambios y redesplegará automáticamente.');
        console.log('Después del redespliegue, podrás inicializar la base de datos accediendo a:');
        console.log('https://event-system-backend-production.up.railway.app/init-database');
    } else {
        console.log('No se encontró la sección problemática en el archivo. Es posible que:');
        console.log('1. El archivo haya sido modificado previamente');
        console.log('2. La estructura del código sea diferente');
        console.log('\nVerifica manualmente el archivo railway.js en las líneas cercanas a 335');
    }
} catch (error) {
    console.error('Error al procesar el archivo:', error.message);
}