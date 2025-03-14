// Test directo de la API de Brevo sin usar nuestro servicio
import SibApiV3Sdk from 'sib-api-v3-sdk';

// Inicializar la API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY || 'your_brevo_api_key_here';

async function testBrevoApi() {
  try {
    console.log('Iniciando prueba directa de Brevo API...');
    
    // Configuración de destinatario
    const recipientEmail = 'luisocro@gmail.com';
    
    // 1. Enviar un correo transaccional
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    // Crear objeto de correo transaccional
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    // Configurar remitente (usando el formato exacto de Brevo)
    sendSmtpEmail.sender = {
      name: 'EntradasMelilla',
      email: '87d564001@smtp-brevo.com'
    };
    
    // Configurar destinatario
    sendSmtpEmail.to = [{ email: recipientEmail }];
    
    // Configurar contenido
    sendSmtpEmail.subject = 'Prueba directa de Brevo API';
    sendSmtpEmail.htmlContent = '<html><body><h1>Esta es una prueba directa de Brevo API</h1><p>Si ves esto, la API está funcionando correctamente.</p></body></html>';
    sendSmtpEmail.textContent = 'Esta es una prueba directa de Brevo API. Si ves esto, la API está funcionando correctamente.';
    
    // Enviar correo
    console.log('Enviando correo...');
    console.log('Datos:', JSON.stringify(sendSmtpEmail, null, 2));
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Correo enviado con éxito:', result);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error en prueba directa:', error);
    console.error('Detalles del error:', error.response?.body || 'Sin detalles disponibles');
    return { success: false, error: error.message };
  }
}

// Ejecutar la prueba
testBrevoApi()
  .then(result => {
    if (result.success) {
      console.log('✅ Prueba completada con éxito');
    } else {
      console.log('❌ Prueba fallida');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });