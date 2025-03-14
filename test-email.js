// Script para probar el envío de correos electrónicos usando Brevo API
import dotenv from "dotenv";
import {
  sendRegistrationEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./utils/emailService.js";

// Cargar variables de entorno
dotenv.config({ path: "./config.env" });

// Crear un usuario de prueba
const testUser = {
  username: "Usuario de Prueba",
  fullname: "Usuario de Prueba",
  email: "luisocro@gmail.com", // Correo para recibir la prueba
};

// Token de prueba para verificación/reset
const testToken = "test-token-" + Date.now();

// Forzar el uso de Brevo API para las pruebas
process.env.USE_BREVO_API = "true";

// Probar todos los tipos de correo
async function testEmailSending() {
  console.log("=======================================================");
  console.log("PRUEBA DE ENVÍO DE CORREOS ELECTRÓNICOS CON BREVO API");
  console.log("=======================================================");
  console.log("Configuración:");
  console.log(
    `- API Key: ${
      process.env.BREVO_API_KEY
        ? "*****" +
          process.env.BREVO_API_KEY.substring(
            process.env.BREVO_API_KEY.length - 4
          )
        : "xkeysib-...TlC"
    }`
  );
  console.log(
    `- Remitente: ${
      process.env.EMAIL_FROM || "EntradasMelilla <info@v2.entradasmelilla.com>"
    }`
  );
  console.log(`- Destinatario: ${testUser.email}`);

  try {
    // 1. Prueba de correo de verificación
    console.log("\n-------------------------------------------------------");
    console.log("1. PRUEBA DE CORREO DE VERIFICACIÓN");
    console.log("-------------------------------------------------------");
    const startTime1 = Date.now();
    const result1 = await sendVerificationEmail(testUser, testToken);
    const duration1 = Date.now() - startTime1;

    if (result1.success) {
      console.log("✅ ¡CORREO DE VERIFICACIÓN ENVIADO CON ÉXITO!");
      console.log(`✅ Tiempo de envío: ${duration1}ms`);
      console.log(`✅ ID del mensaje: ${result1.messageId || "N/A"}`);
    } else {
      console.error("❌ ERROR AL ENVIAR EL CORREO DE VERIFICACIÓN:");
      console.error(`❌ ${result1.error}`);
    }

    // Esperar un segundo antes de la siguiente prueba
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Prueba de correo de bienvenida/registro
    console.log("\n-------------------------------------------------------");
    console.log("2. PRUEBA DE CORREO DE BIENVENIDA");
    console.log("-------------------------------------------------------");
    const startTime2 = Date.now();
    const result2 = await sendRegistrationEmail(testUser);
    const duration2 = Date.now() - startTime2;

    if (result2.success) {
      console.log("✅ ¡CORREO DE BIENVENIDA ENVIADO CON ÉXITO!");
      console.log(`✅ Tiempo de envío: ${duration2}ms`);
      console.log(`✅ ID del mensaje: ${result2.messageId || "N/A"}`);
    } else {
      console.error("❌ ERROR AL ENVIAR EL CORREO DE BIENVENIDA:");
      console.error(`❌ ${result2.error}`);
    }

    // Esperar un segundo antes de la siguiente prueba
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Prueba de correo de recuperación de contraseña
    console.log("\n-------------------------------------------------------");
    console.log("3. PRUEBA DE CORREO DE RECUPERACIÓN DE CONTRASEÑA");
    console.log("-------------------------------------------------------");
    const startTime3 = Date.now();
    const result3 = await sendPasswordResetEmail(testUser, testToken);
    const duration3 = Date.now() - startTime3;

    if (result3.success) {
      console.log("✅ ¡CORREO DE RECUPERACIÓN ENVIADO CON ÉXITO!");
      console.log(`✅ Tiempo de envío: ${duration3}ms`);
      console.log(`✅ ID del mensaje: ${result3.messageId || "N/A"}`);
    } else {
      console.error("❌ ERROR AL ENVIAR EL CORREO DE RECUPERACIÓN:");
      console.error(`❌ ${result3.error}`);
    }

    console.log("\n=======================================================");
    console.log("RESUMEN DE PRUEBAS:");
    console.log(`Verificación: ${result1.success ? "✅ OK" : "❌ Error"}`);
    console.log(`Bienvenida: ${result2.success ? "✅ OK" : "❌ Error"}`);
    console.log(`Recuperación: ${result3.success ? "✅ OK" : "❌ Error"}`);
    console.log("=======================================================");
    console.log(
      "Por favor, verifica tu bandeja de entrada (y carpeta de spam)"
    );
    console.log("para confirmar que has recibido los correos de prueba.");
  } catch (error) {
    console.error("❌ ERROR DURANTE LAS PRUEBAS:");
    console.error(error);
    console.log("=======================================================");
  }
}

// Ejecutar la prueba
testEmailSending();
