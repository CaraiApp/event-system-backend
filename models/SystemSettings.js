import mongoose from 'mongoose';

// Schema for System Settings document
const SystemSettingsSchema = new mongoose.Schema({
    // A single key to identify the settings document
    key: {
        type: String,
        default: 'system_settings',
        unique: true
    },
    
    // General settings
    general: {
        siteName: { type: String, default: 'EntradasMelilla' },
        siteDescription: { type: String, default: 'Compra tus entradas para los mejores eventos de Melilla' },
        contactEmail: { type: String, default: 'info@entradasmelilla.com' },
        supportPhone: { type: String, default: '+34 612 345 678' },
        logoUrl: { type: String, default: '' },
        faviconUrl: { type: String, default: '' },
        defaultLanguage: { type: String, default: 'es' },
        timeZone: { type: String, default: 'Europe/Madrid' },
        maintenanceMode: { type: Boolean, default: false },
        maintenanceMessage: { type: String, default: 'Estamos realizando tareas de mantenimiento. Por favor, vuelve más tarde.' }
    },
    
    // Payment settings
    payment: {
        currency: { type: String, default: 'EUR' },
        currencySymbol: { type: String, default: '€' },
        stripeEnabled: { type: Boolean, default: true },
        stripePublicKey: { type: String, default: '' },
        stripeSecretKey: { type: String, default: '' },
        paypalEnabled: { type: Boolean, default: false },
        paypalClientId: { type: String, default: '' },
        paypalClientSecret: { type: String, default: '' },
        bankTransferEnabled: { type: Boolean, default: true },
        bankTransferInstructions: { type: String, default: 'Realiza la transferencia a la siguiente cuenta bancaria...' },
        commissionRate: { type: Number, default: 5 },
        commissionType: { type: String, default: 'percentage', enum: ['percentage', 'fixed'] },
        commissionFixed: { type: Number, default: 0 }
    },
    
    // Email settings
    email: {
        emailProvider: { type: String, default: 'smtp', enum: ['smtp', 'sendgrid', 'mailgun', 'brevo', 'custom'] },
        useApi: { type: Boolean, default: false },
        
        // SMTP settings
        smtpSettings: {
            host: { type: String, default: 'smtp-relay.brevo.com' },
            port: { type: Number, default: 587 },
            secure: { type: Boolean, default: false },
            auth: {
                user: { type: String, default: '' },
                pass: { type: String, default: '' }
            }
        },
        
        // API settings for services like SendGrid, Mailgun, etc.
        apiSettings: {
            provider: { type: String, default: 'brevo' },
            apiKey: { type: String, default: '' }
        },
        
        // Common settings
        fromName: { type: String, default: 'EntradasMelilla' },
        fromEmail: { type: String, default: 'info@entradasmelilla.com' },
        
        // Email templates
        emailTemplates: [{
            id: { type: String, required: true },
            name: { type: String, required: true },
            subject: { type: String, required: true },
            body: { type: String, default: '' }  // HTML template body
        }]
    },
    
    // Events settings
    events: {
        maxTicketsPerPurchase: { type: Number, default: 10 },
        minTicketsPerPurchase: { type: Number, default: 1 },
        allowGuestCheckout: { type: Boolean, default: true },
        requirePhoneNumber: { type: Boolean, default: true },
        requireAddress: { type: Boolean, default: false },
        enableWaitlist: { type: Boolean, default: true },
        enableRefunds: { type: Boolean, default: true },
        refundPeriodDays: { type: Number, default: 7 },
        enablePartialRefunds: { type: Boolean, default: false },
        defaultEventDuration: { type: Number, default: 120 }, // minutes
        defaultTicketTypes: [{
            id: { type: String, required: true },
            name: { type: String, required: true },
            color: { type: String, default: '#2196F3' }
        }]
    },
    
    // Security settings
    security: {
        requireEmailVerification: { type: Boolean, default: true },
        twoFactorAuthEnabled: { type: Boolean, default: false },
        passwordMinLength: { type: Number, default: 8 },
        passwordRequireSpecialChars: { type: Boolean, default: true },
        passwordRequireNumbers: { type: Boolean, default: true },
        passwordRequireUppercase: { type: Boolean, default: true },
        accountLockoutAttempts: { type: Number, default: 5 },
        sessionTimeout: { type: Number, default: 60 }, // minutes
        jwtExpirationTime: { type: Number, default: 24 }, // hours
        allowedOrigins: [{ type: String }]
    },
    
    // Privacy settings
    privacy: {
        privacyPolicyUrl: { type: String, default: '' },
        termsOfServiceUrl: { type: String, default: '' },
        cookiePolicyUrl: { type: String, default: '' },
        dataDeletionPeriod: { type: Number, default: 365 }, // days
        gdprCompliant: { type: Boolean, default: true },
        cookieConsentRequired: { type: Boolean, default: true },
        analyticsEnabled: { type: Boolean, default: true },
        analyticsProvider: { type: String, default: 'google' },
        analyticsTrackingId: { type: String, default: '' }
    },
    
    // User settings
    users: {
        allowUserRegistration: { type: Boolean, default: true },
        allowSocialLogin: { type: Boolean, default: false },
        defaultUserRole: { type: String, default: 'user' },
        requireOrganizerApproval: { type: Boolean, default: true },
        maxEventsPerOrganizer: { type: Number, default: 0 }, // 0 = unlimited
        maxAttendeesPerEvent: { type: Number, default: 0 }, // 0 = unlimited
        organizerCommissionRate: { type: Number, default: 5 }, // percentage
        adminEmails: [{ type: String }]
    }
}, 
{ 
    timestamps: true,
    collection: 'system_settings' 
});

// Method to get default settings if none exist
SystemSettingsSchema.statics.getDefaultSettings = function() {
    return {
        key: 'system_settings',
        general: {
            siteName: 'EntradasMelilla',
            siteDescription: 'Compra tus entradas para los mejores eventos de Melilla',
            contactEmail: 'info@entradasmelilla.com',
            supportPhone: '+34 612 345 678',
            logoUrl: '',
            faviconUrl: '',
            defaultLanguage: 'es',
            timeZone: 'Europe/Madrid',
            maintenanceMode: false,
            maintenanceMessage: 'Estamos realizando tareas de mantenimiento. Por favor, vuelve más tarde.'
        },
        payment: {
            currency: 'EUR',
            currencySymbol: '€',
            stripeEnabled: true,
            stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
            stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
            paypalEnabled: false,
            paypalClientId: '',
            paypalClientSecret: '',
            bankTransferEnabled: true,
            bankTransferInstructions: 'Realiza la transferencia a la siguiente cuenta bancaria...',
            commissionRate: 5,
            commissionType: 'percentage',
            commissionFixed: 0
        },
        email: {
            emailProvider: 'smtp',
            useApi: false,
            smtpSettings: {
                host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
                port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
                secure: false,
                auth: {
                    user: process.env.BREVO_SMTP_USER || '',
                    pass: process.env.BREVO_SMTP_PASSWORD || ''
                }
            },
            apiSettings: {
                provider: 'brevo',
                apiKey: process.env.BREVO_API_KEY || ''
            },
            fromName: process.env.EMAIL_SENDER_NAME || 'EntradasMelilla',
            fromEmail: process.env.EMAIL_FROM || 'info@entradasmelilla.com',
            emailTemplates: [
                { id: 'welcome', name: 'Bienvenida', subject: 'Bienvenido a EntradasMelilla' },
                { id: 'booking_confirmation', name: 'Confirmación de Reserva', subject: 'Confirmación de tu reserva' },
                { id: 'booking_cancelled', name: 'Reserva Cancelada', subject: 'Tu reserva ha sido cancelada' },
                { id: 'payment_confirmation', name: 'Confirmación de Pago', subject: 'Confirmación de pago' },
                { id: 'event_reminder', name: 'Recordatorio de Evento', subject: 'Recordatorio: Tu evento se acerca' },
                { id: 'verification_email', name: 'Verificación de Email', subject: 'Verifica tu dirección de correo electrónico' }
            ]
        },
        events: {
            maxTicketsPerPurchase: 10,
            minTicketsPerPurchase: 1,
            allowGuestCheckout: true,
            requirePhoneNumber: true,
            requireAddress: false,
            enableWaitlist: true,
            enableRefunds: true,
            refundPeriodDays: 7,
            enablePartialRefunds: false,
            defaultEventDuration: 120,
            defaultTicketTypes: [
                { id: 'standard', name: 'Estándar', color: '#2196F3' },
                { id: 'vip', name: 'VIP', color: '#F44336' }
            ]
        },
        security: {
            requireEmailVerification: true,
            twoFactorAuthEnabled: false,
            passwordMinLength: 8,
            passwordRequireSpecialChars: true,
            passwordRequireNumbers: true,
            passwordRequireUppercase: true,
            accountLockoutAttempts: 5,
            sessionTimeout: 60,
            jwtExpirationTime: 24,
            allowedOrigins: ['https://entradasmelilla.com', 'https://admin.entradasmelilla.com']
        },
        privacy: {
            privacyPolicyUrl: 'https://entradasmelilla.com/privacy',
            termsOfServiceUrl: 'https://entradasmelilla.com/terms',
            cookiePolicyUrl: 'https://entradasmelilla.com/cookies',
            dataDeletionPeriod: 365,
            gdprCompliant: true,
            cookieConsentRequired: true,
            analyticsEnabled: true,
            analyticsProvider: 'google',
            analyticsTrackingId: 'G-XXXXXXXXXX'
        },
        users: {
            allowUserRegistration: true,
            allowSocialLogin: false,
            defaultUserRole: 'user',
            requireOrganizerApproval: true,
            maxEventsPerOrganizer: 0,
            maxAttendeesPerEvent: 0,
            organizerCommissionRate: 5,
            adminEmails: ['admin@entradasmelilla.com']
        }
    };
};

// Ensure there's always one settings document in the database
SystemSettingsSchema.statics.getSettings = async function() {
    const SystemSettings = this;
    
    let settings = await SystemSettings.findOne({ key: 'system_settings' });
    
    if (!settings) {
        // Create default settings if none exist
        settings = await SystemSettings.create(SystemSettings.getDefaultSettings());
    }
    
    return settings;
};

// Create and export the model
export default mongoose.model('SystemSettings', SystemSettingsSchema);