import User from '../models/User.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { sendRegistrationEmail, sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js'

// Utilidad para generar tokens aleatorios
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

//1) USER REGISTRATION
export const register = async (req, res)=>{
    try{
        // Verificar si el correo ya existe
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({
                status: "failed", 
                success: "false", 
                message: "El correo electrónico ya está registrado"
            });
        }

        // Generar token de verificación
        const verificationToken = generateToken();
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        //hashing password
        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(req.body.password, salt)

        const newUser = new User({
            username: req.body.username,
            email: req.body.email,  
            password: hash,                                 
            role: req.body.role ? req.body.role : "user",
            photo: req.body.photo,
            verificationToken: verificationToken,
            verificationTokenExpires: verificationTokenExpires,
            isVerified: false
        })

        const registerUser = await newUser.save()
        
        // Enviar correo de verificación
        try {
            const emailResult = await sendVerificationEmail(registerUser, verificationToken);
            console.log('Resultado del envío de correo de verificación:', emailResult);
        } catch (emailError) {
            console.error('Error al enviar correo de verificación:', emailError);
            // No devolvemos error al cliente, ya que el usuario se registró correctamente
        }
        
        res.status(201).json({
            status: "success", 
            success: "true", 
            message: "Usuario registrado correctamente. Por favor, verifica tu correo electrónico.", 
            data: {
                id: registerUser._id,
                username: registerUser.username,
                email: registerUser.email,
                role: registerUser.role
            }
        })

    }catch(err){
        console.error('Error de registro:', err);
        res.status(500).json({
            status: "failed", 
            success: "false", 
            message: "No se pudo registrar el usuario. Inténtalo de nuevo."
        })
    }
}

//2) VERIFICACIÓN DE CORREO ELECTRÓNICO
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                status: "failed",
                success: "false",
                message: "Token de verificación inválido o expirado"
            });
        }
        
        // Activar la cuenta
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        
        // Enviar correo de bienvenida
        try {
            const emailResult = await sendRegistrationEmail(user);
            console.log('Resultado del envío de correo de bienvenida:', emailResult);
        } catch (emailError) {
            console.error('Error al enviar correo de bienvenida:', emailError);
        }
        
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Correo electrónico verificado correctamente. Ahora puedes iniciar sesión."
        });
    } catch (err) {
        console.error('Error en verificación de correo:', err);
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al verificar el correo electrónico"
        });
    }
};

//3) SOLICITAR NUEVO TOKEN DE VERIFICACIÓN
export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                status: "failed",
                success: "false",
                message: "No existe ningún usuario con este correo electrónico"
            });
        }
        
        if (user.isVerified) {
            return res.status(400).json({
                status: "failed",
                success: "false",
                message: "Este correo electrónico ya ha sido verificado"
            });
        }
        
        // Generar nuevo token
        const verificationToken = generateToken();
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
        
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();
        
        // Enviar nuevo correo de verificación
        const emailResult = await sendVerificationEmail(user, verificationToken);
        
        if (!emailResult.success) {
            return res.status(500).json({
                status: "failed",
                success: "false",
                message: "Error al enviar el correo de verificación. Inténtalo de nuevo más tarde."
            });
        }
        
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Se ha enviado un nuevo correo de verificación"
        });
    } catch (err) {
        console.error('Error al reenviar correo de verificación:', err);
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al procesar la solicitud"
        });
    }
};

//4) SOLICITAR RECUPERACIÓN DE CONTRASEÑA
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                status: "failed",
                success: "false",
                message: "No existe ningún usuario con este correo electrónico"
            });
        }
        
        // Generar token de recuperación
        const resetToken = generateToken();
        const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpires;
        await user.save();
        
        // Enviar correo con enlace de recuperación
        const emailResult = await sendPasswordResetEmail(user, resetToken);
        
        if (!emailResult.success) {
            return res.status(500).json({
                status: "failed",
                success: "false",
                message: "Error al enviar el correo de recuperación. Inténtalo de nuevo más tarde."
            });
        }
        
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Se ha enviado un correo con instrucciones para recuperar tu contraseña"
        });
    } catch (err) {
        console.error('Error en recuperación de contraseña:', err);
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al procesar la solicitud de recuperación de contraseña"
        });
    }
};

//5) RESTABLECER CONTRASEÑA
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                status: "failed",
                success: "false",
                message: "Token de recuperación inválido o expirado"
            });
        }
        
        // Hashear la nueva contraseña
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        
        // Actualizar contraseña y eliminar tokens
        user.password = hash;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña."
        });
    } catch (err) {
        console.error('Error al restablecer contraseña:', err);
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al restablecer la contraseña"
        });
    }
};

//6) USER LOGIN
export const login = async (req, res)=>{
    const email = req.body.email;

    try{
        //getting the user
        const user = await User.findOne({email: email});
        
        if(!user){
            return res.status(404).json({
                status: "failed", 
                success: "false", 
                message: "No existe ningún usuario con este correo electrónico"
            });
        }
        
        // Verificar si el correo ha sido verificado
        if (!user.isVerified) {
            return res.status(401).json({
                status: "failed", 
                success: "false", 
                message: "Por favor, verifica tu correo electrónico antes de iniciar sesión"
            });
        }

        const checkPassword = await bcrypt.compare(req.body.password, user.password);
        
        if(!checkPassword){
            return res.status(401).json({
                status: "failed", 
                success: "false", 
                message: "Correo electrónico o contraseña incorrectos"
            });
        }

        const{password, role, ...rest} = user._doc;

        //creating jwt token
        const token = jwt.sign(
            {id: user._id, role: user.role}, 
            process.env.JWT_SECRET_KEY, 
            {expiresIn: "15d"}
        );
        
        //setting token in cookies
        res.cookie('accessToken', token, {
            httpOnly: true,
            expiresIn: token.expiresIn
        }).status(200).json({
            status: "success", 
            success: "true", 
            message: "Inicio de sesión exitoso", 
            token, 
            data: {...rest}, 
            role
        });

    }catch(err){
        console.error('Error en inicio de sesión:', err);
        res.status(500).json({
            status: "failed", 
            success: "false", 
            message: "Error al iniciar sesión. Inténtalo de nuevo."
        });
    }
};

