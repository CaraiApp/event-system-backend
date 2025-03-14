// Servicio de correo electrónico para EntradasMelilla usando Nodemailer y Brevo (Sendinblue)
import nodemailer from 'nodemailer';

/**
 * Configuración del transporte de correo según el entorno
 * @returns {Object} Transporter de nodemailer configurado
 */
const createTransporter = () => {
  // Determinar entorno y configuración de proveedor de email
  const isProduction = process.env.NODE_ENV === 'production';
  const useBrevo = process.env.USE_BREVO === 'true';
  const useBrevoApi = process.env.USE_BREVO_API === 'true';
  
  // OPCIÓN 1: BREVO API (usando nodemailer-sendinblue-transport)
  if (useBrevoApi && process.env.BREVO_API_KEY) {
    console.log('🚀 Configurando transporte API de Brevo');
    
    // Crear transporte utilizando la API de Brevo (Sendinblue)
    return nodemailer.createTransport({
      host: 'api.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_FROM || 'info@entradasmelilla.com',
        pass: process.env.BREVO_API_KEY,
      },
      headers: {
        'api-key': process.env.BREVO_API_KEY,
      }
    });
  }
  
  // OPCIÓN 2: BREVO SMTP
  if (isProduction || useBrevo) {
    console.log('🚀 Configurando transporte SMTP de Brevo para producción');
    
    // Validar que las variables de entorno necesarias estén definidas
    const smtpHost = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.BREVO_SMTP_PORT || '587');
    const smtpUser = process.env.BREVO_SMTP_USER;
    const smtpPass = process.env.BREVO_SMTP_PASSWORD;
    
    // Advertir si faltan configuraciones críticas
    if (!smtpUser || !smtpPass) {
      console.error('⚠️ ADVERTENCIA: Credenciales de Brevo SMTP no configuradas correctamente');
      console.error('⚠️ Verifique las variables de entorno BREVO_SMTP_USER y BREVO_SMTP_PASSWORD');
    }
    
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // false para puerto 587, true para 465
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      // Activar depuración solo si se configura explícitamente
      debug: process.env.EMAIL_DEBUG === 'true',
      logger: process.env.EMAIL_DEBUG === 'true'
    });
  }
  
  // OPCIÓN 3: ENTORNO DE DESARROLLO - Ethereal (correos de prueba)
  console.log('🧪 Configurando transporte Ethereal para desarrollo/pruebas');
  
  // Usar credenciales de .env si están disponibles, o las predeterminadas de Ethereal
  const etherealUser = process.env.ETHEREAL_EMAIL;
  const etherealPass = process.env.ETHEREAL_PASSWORD;
  
  // Si no hay credenciales Ethereal configuradas, intentamos crear una cuenta de prueba
  if (!etherealUser || !etherealPass) {
    console.log('Creando cuenta Ethereal temporal para pruebas...');
    
    try {
      // Intentar crear una cuenta Ethereal bajo demanda
      const testAccount = nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (err) {
      console.error('⚠️ Error al crear cuenta de prueba Ethereal:', err);
      // Fallback a una configuración que no enviará realmente
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'ethereal-fallback@example.com',
          pass: 'fallback-password'
        }
      });
    }
  }
  
  // Usar credenciales Ethereal configuradas
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealUser,
      pass: etherealPass
    }
  });
};

/**
 * Enviar correo con reintentos automáticos
 * @param {Object} mailOptions - Opciones del correo a enviar
 * @param {number} maxRetries - Número máximo de intentos (default: 3)
 * @returns {Promise<Object>} - Resultado del envío
 */
const sendMailWithRetry = async (mailOptions, maxRetries = 3) => {
  let lastError = null;
  
  // Sistema de reintentos con backoff exponencial
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Obtener el transporter adecuado para el entorno
      const transporter = createTransporter();
      
      // Configuración del remitente
      const senderName = process.env.EMAIL_SENDER_NAME || 'EntradasMelilla';
      const senderEmail = process.env.EMAIL_FROM || 'noreply@entradasmelilla.com';
      const from = `${senderName} <${senderEmail}>`;
      
      // Configuración de la carta completa
      const emailConfig = {
        from: from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text || 'Por favor, usa un cliente de correo que soporte HTML'
      };
      
      // Agregar adjuntos si existen
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        emailConfig.attachments = mailOptions.attachments;
      }
      
      // Agregar variables para la API de Brevo
      if (process.env.USE_BREVO_API === 'true') {
        // Las variables esperadas por la API de Brevo
        emailConfig.headers = {
          'X-Mailin-Tag': mailOptions.subject.split(':')[0] || 'EntradasMelilla'
        };
      }
      
      // Intentar enviar el correo
      const info = await transporter.sendMail(emailConfig);
      
      console.log(`✅ Email enviado exitosamente (intento ${attempt}):`, info.messageId);
      
      // Para entornos de desarrollo, mostrar la URL de vista previa
      if (process.env.NODE_ENV !== 'production' && info.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log('🔍 URL de vista previa:', previewUrl);
        }
      }
      
      return { 
        success: true, 
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      lastError = error;
      console.error(`❌ Error en intento ${attempt}/${maxRetries} al enviar correo:`, error.message);
      
      // Mostrar más detalles del error si están disponibles
      if (error.response) {
        console.error('Detalles del error:', error.response);
      }
      
      // Si no es el último intento, esperar antes de reintentar
      if (attempt < maxRetries) {
        // Backoff exponencial: 1s, 2s, 4s, 8s, etc.
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Reintentando en ${delay/1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Si llegamos aquí, fallaron todos los intentos
  console.error(`⛔ Todos los intentos de envío fallaron después de ${maxRetries} intentos`);
  
  return { 
    success: false, 
    error: lastError?.message || 'Error desconocido al enviar correo',
    details: lastError?.response || {},
    fallback: true
  };
};

/**
 * Función principal para enviar correos
 * @param {Object} mailOptions - Opciones del correo
 * @returns {Promise} - Resultado del envío
 */
const sendMail = async (mailOptions) => {
  try {
    return await sendMailWithRetry(mailOptions);
  } catch (error) {
    console.error('Error general en sendMail:', error);
    return { 
      success: false, 
      error: error.message,
      fallback: true,
      message: 'Error al enviar email, pero la operación principal puede continuar'
    };
  }
};

/**
 * Enviar correo de confirmación de registro
 * @param {Object} user - Objeto con la información del usuario
 * @param {string} user.email - Correo electrónico del usuario
 * @param {string} user.username - Nombre de usuario
 * @param {string} verificationToken - Token de verificación (opcional)
 * @returns {Promise} - Resultado del envío del correo
 */
export const sendRegistrationEmail = async (user, verificationToken = null) => {
  try {
    // Base URL del frontend (con fallback seguro)
    const frontendUrl = process.env.FRONTEND_URL || 'https://v2.entradasmelilla.com';
    
    // URL de verificación (si se usa un token)
    const verificationUrl = verificationToken 
      ? `${frontendUrl}/verificar-correo/${verificationToken}`
      : null;
    
    // Fecha actual para el pie del correo
    const currentYear = new Date().getFullYear();
    
    // Asegurarse de que el usuario tenga los campos requeridos
    const username = user.username || user.fullname || 'Usuario';
    const email = user.email;
    
    if (!email) {
      console.error('Error: Se intentó enviar un correo de registro a un usuario sin email');
      return { success: false, error: 'Usuario sin email' };
    }
    
    // Contenido del correo
    const mailOptions = {
      to: email,
      subject: '¡Bienvenido a EntradasMelilla! Confirmación de registro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">¡Bienvenido a EntradasMelilla!</h1>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Hola ${username},</p>
            <p>Gracias por registrarte en EntradasMelilla. Tu cuenta ha sido creada correctamente.</p>
            ${verificationToken ? `
              <p>Para completar tu registro y verificar tu cuenta, por favor haz clic en el siguiente enlace:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verificar mi cuenta</a>
              </p>
              <p style="font-size: 12px; color: #888;">Si el botón no funciona, copia y pega este enlace en tu navegador: ${verificationUrl}</p>
            ` : `
              <p>Ya puedes iniciar sesión y disfrutar de todos nuestros servicios.</p>
            `}
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; text-align: center;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>© ${currentYear} EntradasMelilla. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      text: `¡Bienvenido a EntradasMelilla! 
      
Hola ${username},

Gracias por registrarte en EntradasMelilla. Tu cuenta ha sido creada correctamente.

${verificationToken ? `Para completar tu registro y verificar tu cuenta, por favor visita este enlace: ${verificationUrl}` : 'Ya puedes iniciar sesión y disfrutar de todos nuestros servicios.'}

Este es un correo automático, por favor no respondas a este mensaje.

© ${currentYear} EntradasMelilla. Todos los derechos reservados.`
    };
    
    // Enviar el correo
    return await sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar correo de registro:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar correo de confirmación de compra/reserva
 * Esta versión modificada funciona con la estructura de datos proporcionada en stripControllers.js
 * 
 * @param {Object} options - Opciones para el correo de confirmación
 * @param {string} options.email - Email del destinatario
 * @param {string} options.name - Nombre del usuario
 * @param {string} options.eventName - Nombre del evento
 * @param {string} options.eventDate - Fecha del evento (formateada)
 * @param {string} options.eventTime - Hora del evento
 * @param {string} options.venue - Lugar del evento
 * @param {string} options.seats - Asientos reservados (separados por coma)
 * @param {number} options.totalPrice - Precio total
 * @param {string} options.currency - Moneda (EUR por defecto)
 * @param {string} options.bookingId - ID de la reserva
 * @param {string} options.qrCodeUrl - URL del código QR (opcional)
 * @param {Array} options.attachments - Archivos adjuntos (opcional)
 * @returns {Promise} - Resultado del envío del correo
 */
export const sendBookingConfirmationEmail = async (options) => {
  try {
    // Validar opciones requeridas
    if (!options || !options.email || !options.eventName) {
      console.error('Error: Faltan datos requeridos para el correo de confirmación de reserva');
      return { success: false, error: 'Datos incompletos para el correo' };
    }
    
    // Fecha actual para el pie del correo
    const currentYear = new Date().getFullYear();
    
    // Extraer valores de las opciones con valores por defecto
    const {
      email,
      name = 'Usuario',
      eventName,
      eventDate = 'Fecha por confirmar',
      eventTime = 'Hora por confirmar',
      venue = 'Lugar por confirmar',
      seats = 'No especificados',
      totalPrice = 0,
      currency = 'EUR',
      bookingId = 'N/A',
      qrCodeUrl = null,
      attachments = []
    } = options;
    
    // Contenido del correo
    const mailOptions = {
      to: email,
      subject: `Confirmación de reserva: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">¡Reserva Confirmada!</h1>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Hola ${name},</p>
            <p>Tu reserva para <strong>${eventName}</strong> ha sido confirmada.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Detalles de la reserva:</h3>
              <p><strong>Evento:</strong> ${eventName}</p>
              <p><strong>Lugar:</strong> ${venue}</p>
              <p><strong>Fecha:</strong> ${eventDate}</p>
              <p><strong>Hora:</strong> ${eventTime}</p>
              <p><strong>Asientos reservados:</strong> ${seats}</p>
              <p><strong>Precio total:</strong> ${totalPrice} ${currency}</p>
              <p><strong>ID de reserva:</strong> ${bookingId}</p>
            </div>
            
            ${qrCodeUrl ? `
              <div style="text-align: center; margin: 20px 0;">
                <p><strong>Tu código QR:</strong></p>
                <img src="${qrCodeUrl}" alt="Código QR" style="max-width: 200px; height: auto;">
                <p style="font-size: 12px; color: #888;">Muestra este código QR en la entrada del evento.</p>
              </div>
            ` : ''}
            
            <p>¡Gracias por tu reserva! Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; text-align: center;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>© ${currentYear} EntradasMelilla. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      text: `¡Reserva Confirmada! 
      
Hola ${name},

Tu reserva para ${eventName} ha sido confirmada.

Detalles de la reserva:
- Evento: ${eventName}
- Lugar: ${venue}
- Fecha: ${eventDate}
- Hora: ${eventTime}
- Asientos reservados: ${seats}
- Precio total: ${totalPrice} ${currency}
- ID de reserva: ${bookingId}

${qrCodeUrl ? 'Tu código QR ha sido generado. Por favor visualízalo en la versión HTML de este correo o accede a tu cuenta para verlo.' : ''}

¡Gracias por tu reserva! Si tienes alguna pregunta, no dudes en contactarnos.

Este es un correo automático, por favor no respondas a este mensaje.

© ${currentYear} EntradasMelilla. Todos los derechos reservados.`
    };
    
    // Añadir archivos adjuntos si existen
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    
    // Enviar el correo
    const result = await sendMail(mailOptions);
    
    // Registrar el resultado para depuración
    if (result.success) {
      console.log(`✅ Correo de confirmación de reserva enviado a ${email} para el evento ${eventName}`);
    } else {
      console.error(`❌ Error al enviar correo de confirmación a ${email}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error al enviar correo de confirmación de reserva:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar correo para recuperación de contraseña
 * @param {Object} user - Objeto con la información del usuario
 * @param {string} user.email - Correo electrónico del usuario
 * @param {string} resetToken - Token de restablecimiento de contraseña
 * @returns {Promise} - Resultado del envío del correo
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    // Base URL del frontend (con fallback seguro)
    const frontendUrl = process.env.FRONTEND_URL || 'https://v2.entradasmelilla.com';
    
    // URL de restablecimiento
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    
    // Fecha actual para el pie del correo
    const currentYear = new Date().getFullYear();
    
    // Validación de datos
    if (!user || !user.email) {
      console.error('Error: Se intentó enviar un correo de recuperación a un usuario sin email');
      return { success: false, error: 'Usuario sin email' };
    }
    
    if (!resetToken) {
      console.error('Error: Se intentó enviar un correo de recuperación sin token');
      return { success: false, error: 'Token no proporcionado' };
    }
    
    // Contenido del correo
    const mailOptions = {
      to: user.email,
      subject: 'Recuperación de contraseña - EntradasMelilla',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">Recuperación de contraseña</h1>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Hola ${user.username || user.fullname || 'Usuario'},</p>
            <p>Has solicitado restablecer tu contraseña en EntradasMelilla.</p>
            <p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Restablecer mi contraseña</a>
            </p>
            <p style="font-size: 12px; color: #888;">Si el botón no funciona, copia y pega este enlace en tu navegador: ${resetUrl}</p>
            <p>Si no has solicitado restablecer tu contraseña, puedes ignorar este mensaje y tu contraseña seguirá siendo la misma.</p>
            <p>Este enlace de restablecimiento caducará en 15 minutos.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; text-align: center;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>© ${currentYear} EntradasMelilla. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      text: `Recuperación de contraseña - EntradasMelilla
      
Hola ${user.username || user.fullname || 'Usuario'},

Has solicitado restablecer tu contraseña en EntradasMelilla.

Para crear una nueva contraseña, visita este enlace: ${resetUrl}

Si no has solicitado restablecer tu contraseña, puedes ignorar este mensaje y tu contraseña seguirá siendo la misma.

Este enlace de restablecimiento caducará en 15 minutos.

Este es un correo automático, por favor no respondas a este mensaje.

© ${currentYear} EntradasMelilla. Todos los derechos reservados.`
    };
    
    // Enviar el correo
    return await sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar correo de recuperación de contraseña:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar correo de verificación de cuenta
 * @param {Object} user - Objeto con la información del usuario
 * @param {string} verificationToken - Token de verificación
 * @returns {Promise} - Resultado del envío del correo
 */
export const sendVerificationEmail = async (user, verificationToken) => {
  try {
    // Base URL del frontend (con fallback seguro)
    const frontendUrl = process.env.FRONTEND_URL || 'https://v2.entradasmelilla.com';
    
    // URL de verificación
    const verificationUrl = `${frontendUrl}/verificar-correo/${verificationToken}`;
    
    // Fecha actual para el pie del correo
    const currentYear = new Date().getFullYear();
    
    // Validación de datos
    if (!user || !user.email) {
      console.error('Error: Se intentó enviar un correo de verificación a un usuario sin email');
      return { success: false, error: 'Usuario sin email' };
    }
    
    if (!verificationToken) {
      console.error('Error: Se intentó enviar un correo de verificación sin token');
      return { success: false, error: 'Token no proporcionado' };
    }
    
    // Contenido del correo
    const mailOptions = {
      to: user.email,
      subject: 'Verifica tu cuenta - EntradasMelilla',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">Verificación de cuenta</h1>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Hola ${user.username || user.fullname || 'Usuario'},</p>
            <p>Gracias por registrarte en EntradasMelilla. Para activar tu cuenta, por favor verifica tu dirección de correo electrónico haciendo clic en el botón de abajo:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verificar mi cuenta</a>
            </p>
            <p style="font-size: 12px; color: #888;">Si el botón no funciona, copia y pega este enlace en tu navegador: ${verificationUrl}</p>
            <p>Si no has creado una cuenta en EntradasMelilla, puedes ignorar este mensaje.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; text-align: center;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>© ${currentYear} EntradasMelilla. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      text: `Verificación de cuenta - EntradasMelilla
      
Hola ${user.username || user.fullname || 'Usuario'},

Gracias por registrarte en EntradasMelilla. Para activar tu cuenta, por favor verifica tu dirección de correo electrónico visitando el siguiente enlace:

${verificationUrl}

Si no has creado una cuenta en EntradasMelilla, puedes ignorar este mensaje.

Este es un correo automático, por favor no respondas a este mensaje.

© ${currentYear} EntradasMelilla. Todos los derechos reservados.`
    };
    
    // Enviar el correo
    return await sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar correo de verificación:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar notificación a organizador sobre nueva reserva
 * @param {Object} options - Opciones para el correo de notificación
 * @param {string} options.email - Email del organizador
 * @param {string} options.name - Nombre del organizador
 * @param {string} options.eventName - Nombre del evento
 * @param {string} options.bookingId - ID de la reserva
 * @param {number} options.totalPrice - Precio total
 * @param {number} options.numTickets - Número de entradas reservadas
 * @returns {Promise} - Resultado del envío del correo
 */
export const sendOrganizerBookingNotification = async (options) => {
  try {
    // Validar opciones requeridas
    if (!options || !options.email || !options.eventName) {
      console.error('Error: Faltan datos requeridos para la notificación al organizador');
      return { success: false, error: 'Datos incompletos para el correo' };
    }
    
    // Fecha actual para el pie del correo
    const currentYear = new Date().getFullYear();
    
    // Extraer valores de opciones con valores por defecto
    const {
      email,
      name = 'Organizador',
      eventName,
      bookingId = 'N/A',
      totalPrice = 0,
      numTickets = 1,
      currency = 'EUR'
    } = options;
    
    // Contenido del correo
    const mailOptions = {
      to: email,
      subject: `Nueva reserva: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">Nueva Reserva</h1>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Hola ${name},</p>
            <p>Has recibido una nueva reserva para tu evento <strong>${eventName}</strong>.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Detalles de la reserva:</h3>
              <p><strong>ID de reserva:</strong> ${bookingId}</p>
              <p><strong>Entradas vendidas:</strong> ${numTickets}</p>
              <p><strong>Ingreso total:</strong> ${totalPrice} ${currency}</p>
            </div>
            
            <p>Puedes acceder a los detalles completos desde tu panel de organizador.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; text-align: center;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>© ${currentYear} EntradasMelilla. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      text: `Nueva Reserva
      
Hola ${name},

Has recibido una nueva reserva para tu evento ${eventName}.

Detalles de la reserva:
- ID de reserva: ${bookingId}
- Entradas vendidas: ${numTickets}
- Ingreso total: ${totalPrice} ${currency}

Puedes acceder a los detalles completos desde tu panel de organizador.

Este es un correo automático, por favor no respondas a este mensaje.

© ${currentYear} EntradasMelilla. Todos los derechos reservados.`
    };
    
    // Enviar el correo
    const result = await sendMail(mailOptions);
    
    // Registrar el resultado para depuración
    if (result.success) {
      console.log(`✅ Notificación de reserva enviada al organizador ${email} para el evento ${eventName}`);
    } else {
      console.error(`❌ Error al enviar notificación al organizador ${email}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error al enviar notificación al organizador:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar recordatorio de evento próximo
 * @param {Object} options - Opciones para el correo de recordatorio
 * @param {string} options.email - Email del usuario
 * @param {string} options.name - Nombre del usuario
 * @param {string} options.eventName - Nombre del evento
 * @param {string} options.eventDate - Fecha del evento (formateada)
 * @param {string} options.eventTime - Hora del evento
 * @param {string} options.venue - Lugar del evento
 * @param {string} options.seats - Asientos reservados
 * @param {string} options.qrCodeUrl - URL del código QR (opcional)
 * @returns {Promise} - Resultado del envío del correo
 */
export const sendEventReminder = async (options) => {
  try {
    // Validar opciones requeridas
    if (!options || !options.email || !options.eventName) {
      console.error('Error: Faltan datos requeridos para el recordatorio de evento');
      return { success: false, error: 'Datos incompletos para el correo' };
    }
    
    // Fecha actual para el pie del correo
    const currentYear = new Date().getFullYear();
    
    // Extraer valores de las opciones con valores por defecto
    const {
      email,
      name = 'Usuario',
      eventName,
      eventDate = 'Próximamente',
      eventTime = 'Por confirmar',
      venue = 'Por confirmar',
      seats = 'No especificados',
      qrCodeUrl = null
    } = options;
    
    // Contenido del correo
    const mailOptions = {
      to: email,
      subject: `Recordatorio: ${eventName} - Mañana`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">Recordatorio de Evento</h1>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Hola ${name},</p>
            <p>Te recordamos que mañana asistirás al evento <strong>${eventName}</strong>.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Información del evento:</h3>
              <p><strong>Evento:</strong> ${eventName}</p>
              <p><strong>Fecha:</strong> ${eventDate}</p>
              <p><strong>Hora:</strong> ${eventTime}</p>
              <p><strong>Lugar:</strong> ${venue}</p>
              <p><strong>Asientos reservados:</strong> ${seats}</p>
            </div>
            
            ${qrCodeUrl ? `
              <div style="text-align: center; margin: 20px 0;">
                <p><strong>Tu código QR:</strong></p>
                <img src="${qrCodeUrl}" alt="Código QR" style="max-width: 200px; height: auto;">
                <p style="font-size: 12px; color: #888;">No olvides llevar este código QR para acceder al evento.</p>
              </div>
            ` : ''}
            
            <p>¡No olvides llevar tu entrada! Esperamos que disfrutes del evento.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; text-align: center;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>© ${currentYear} EntradasMelilla. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      text: `Recordatorio: ${eventName} - Mañana
      
Hola ${name},

Te recordamos que mañana asistirás al evento ${eventName}.

Información del evento:
- Evento: ${eventName}
- Fecha: ${eventDate}
- Hora: ${eventTime}
- Lugar: ${venue}
- Asientos reservados: ${seats}

${qrCodeUrl ? 'No olvides llevar tu código QR para acceder al evento.' : ''}

¡Esperamos que disfrutes del evento!

Este es un correo automático, por favor no respondas a este mensaje.

© ${currentYear} EntradasMelilla. Todos los derechos reservados.`
    };
    
    // Enviar el correo
    const result = await sendMail(mailOptions);
    
    // Registrar el resultado para depuración
    if (result.success) {
      console.log(`✅ Recordatorio de evento enviado a ${email} para el evento ${eventName}`);
    } else {
      console.error(`❌ Error al enviar recordatorio a ${email}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error al enviar recordatorio de evento:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendRegistrationEmail,
  sendBookingConfirmationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendOrganizerBookingNotification,
  sendEventReminder
};