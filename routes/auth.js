import express from "express";
import { 
    login, 
    register, 
    verifyEmail, 
    resendVerificationEmail, 
    forgotPassword, 
    resetPassword 
} from "../Controllers/authController.js";
import User from "../models/User.js";

const router = express.Router();

// Registro e inicio de sesión
router.post('/register', register);
router.post('/login', login);

// Verificación de correo electrónico
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Recuperación de contraseña
// Manejador especial que imprime diagnóstico para la ruta de forgot-password
router.post('/forgot-password', (req, res, next) => {
    console.log('🛠️ Manejando forgot-password con diagnóstico adicional');
    console.log('🔍 Headers recibidos:', JSON.stringify(req.headers));
    console.log('📱 IP real:', req.ip);
    console.log('📱 X-Forwarded-For:', req.headers['x-forwarded-for']);
    console.log('⚙️ Trust proxy setting:', req.app.get('trust proxy'));
    
    // Continuar con el controlador normal
    forgotPassword(req, res, next);
});
router.post('/reset-password/:token', resetPassword);
router.all('/validate-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Verificar si el token existe y es válido
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                status: "failed",
                success: false,
                message: "Token de recuperación inválido o expirado"
            });
        }
        
        // El token es válido
        return res.status(200).json({
            status: "success",
            success: true,
            message: "Token válido",
            email: user.email.replace(/(?<=.).(?=.*@)/g, '*') // Ocultar parte del email por seguridad
        });
    } catch (err) {
        console.error('Error al validar token:', err);
        return res.status(500).json({
            status: "failed",
            success: false,
            message: "Error al validar el token de recuperación"
        });
    }
});

export default router;
