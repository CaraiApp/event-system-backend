// import mongoose from "mongoose";

// const bookingSchema = new mongoose.Schema(
//   {
//     user_id: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'User' 
//     },
//     event_id: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'Event' 
//     },
//     seatNumbers: {
//         type: [String],
//         default: []    
//     },
//     bookingDate: {
//         type: Date,
//         required: true
//     },
//     guestSize: {
//         type: Number,
//         required: true
//     }
//     ,
//     totalPrice:{
//         type: Number
//     },
//     qrCodeToken: {type:String}, 
//     qrCodeScanStatus: { type: Boolean, default: false },
//     qrCodeUrl: { 
//         type: String, 
//         default: null // Initially, this will be null, updated after QR code generation
//     },
//     paymentStatus: {
//         type: String,
//         enum: ['pending', 'paid', 'failed'],
//         default: 'pending'
//     },
//     paymentDetails: {
//         paymentIntentId: { type: String },
//         paymentMethod: { type: String },
//         sessionStorageId: { type: String },
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.model("Booking", bookingSchema);
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', // Referencia al esquema de Usuario
    },
    event_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Event', // Referencia al esquema de Evento
    },
    seatNumbers: {
      type: [String], // Lista de números de asiento reservados
      default: [],    
    },
    bookingDate: {
      type: Date, // Fecha de la reserva
      required: true,
    },
    guestSize: {
      type: Number, // Número de invitados
      required: true,
    },
    totalPrice: {
      type: Number, // Precio total de la reserva en KRW
    },
    qrCodeToken: {
      type: String, // Token para la generación del código QR
    },
    qrCodeScanStatus: { 
      type: Boolean, 
      default: false, // Inicialmente no escaneado
    },
    qrCodeUrl: { 
      type: String, 
      default: null, // Inicialmente nulo, se actualizará con la URL del código QR
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'paid', 'Fallido'], // Pendiente, Pagado, Fallido en español
      default: 'Pending',
    },
    paymentDetails: {
      paymentIntentId: { 
        type: String, // ID de la intención de pago del pasarela de pago
      },
      paymentMethod: { 
        type: String, // Método de pago (por ejemplo, tarjeta, transferencia bancaria)
      },
      sessionStorageId: { 
        type: String, // ID de almacenamiento de sesión para el seguimiento del pago
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
