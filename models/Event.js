// // import mongoose from "mongoose";

// // const eventSchema = new mongoose.Schema(
// //   {
// //       user_id: { 
// //             type: mongoose.Schema.Types.ObjectId, 
// //             ref: 'User' 
// //         },
// //     name: {
// //       type: String,
// //       required: true,
// //       unique: true,
// //     },
// //     venue: {
// //       type: String,
// //       required: true,
// //     },
// //     address: {
// //       type: String,
// //       required: true,
// //     },
// //     photo: {
// //       type: String,
// //       required: true,
// //     },
// //     desc: {
// //       type: String,
// //       required: true,
// //     },
// //     vipprice: {
// //       type: Number,
// //       required: true,
// //     },
// //     economyprice:{
// //       type: Number},
// //     eventDate: {
// //       type: Date,
      
// //   },
// //   eventTime: {
// //       type: Date,
      
// //   },
// //     vipSize: {
// //         type: Number,
        
// //     },
// //     TotalCapacity: {
// //       type: Number,
      
// //   },

    
// //     economySize: {
// //       type: Number,
      
// //     },
// //     availableSeats: { type: [String],
// //       default: [], 
// //      },
   
// //     featured: {
// //       type: Boolean,
// //       default: false,
// //     },
// //     reservedSeats: { 
// //       type: [String], 
// //       default: [], 
// //     }
// // ,    
// //     published: {
// //       type: Boolean,
// //       default: false,
// //     },
// //   },
// //   { timestamps: true }
// // );

// // // eventSchema.pre("save", function (next) {
// // //   if (this.isNew && this.TotalCapacity > 0) {
// // //     this.availableSeats = Array.from({ length: this.TotalCapacity }, (_, i) => i + 1);
// // //   }
// // //   next();
// // // });
// // export default mongoose.model("Event", eventSchema);
// import mongoose from "mongoose";

// const eventSchema = new mongoose.Schema(
//   {
//       user_id: { 
//             type: mongoose.Schema.Types.ObjectId, 
//             ref: 'User' 
//         },
//     name: {
//       type: String,
//       required: true,

//     },
//     venue: {
//       type: String,
   
//     },
//     address: {
//       type: String,
    
//     },
//     photo: {
//       type: String,
 
//     },
//     desc: {
//       type: String,
   
//     },
//     template: {
//       type: String,
   
//     },
//     category: {
//       type: String,
//       enum: ['Music', 'Sports', 'Conference', 'Workshop', 'Theater'], 
//     },
//     currency: {
//       type: String,
//       enum: [
//         "USD", "EUR", "GBP", "AUD", "CAD", "JPY", "INR", "SGD", "NZD", "CHF", "HKD",
//         "SEK", "NOK", "DKK", "ZAR", "MXN", "BRL", "PHP", "IDR", "MYR", "THB", "VND",
//         "KRW", "CNY", "ARS", "CLP", "COP", "PEN", "PLN", "CZK", "HUF", "RUB", "TRY",
//         "ILS", "SAR", "AED", "QAR", "EGP", "KES", "NGN", "TZS", "UGX", "XOF", "XAF",
//         "MAD", "BHD", "OMR", "JOD", "KWD"
//       ], 
//     },
//     gallery: {
//       type: [String],
//       default: [], 
//     },
//     ticket: {
//       type: String,
//       enum: ["Online", "Walk-in"], 
 
//     },
//     subscriptionPlan: {
//       type: String,
//       enum: ["Simple", "Standard", "Premium"], 
//       default: "Simple", 
//     },
//     // subscriptionPlan: {
//     //   type: String,
//     //   enum: ["Simple", "Standard", "Premium"], 
//     //   default: "Simple", 
//     // },
//     vipprice: {
//       type: Number,

//     },
//     economyprice:{
//       type: Number},
//     eventDate: {
//       type: Date,
      
//   },
//   eventTime: {
//       type: Date,
      
//   },
//     vipSize: {
//         type: Number,
        
//     },
//     TotalCapacity: {
//       type: Number,
      
//   },
//   paymentStatus: {
//     type: String,
//     enum: ['pending', 'paid', 'failed'],
//     default: 'pending'
// },
// paymentDetails: {
//     paymentIntentId: { type: String },
//     paymentMethod: { type: String },
//     sessionStorageId: { type: String },
// },

    
//     economySize: {
//       type: Number,
      
//     },
//     availableSeats: { type: [String],
//       default: [], 
//      },
   
//     featured: {
//       type: Boolean,
//       default: false,
//     },
//     reservedSeats: { 
//       type: [String], 
//       default: [], 
//     }
// ,    
//     published: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// // eventSchema.pre("save", function (next) {
// //   if (this.isNew && this.TotalCapacity > 0) {
// //     this.availableSeats = Array.from({ length: this.TotalCapacity }, (_, i) => i + 1);
// //   }
// //   next();
// // });
// export default mongoose.model("Event", eventSchema);
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Asume que 'User' también está localizado al español
    },
    name: {
      type: String,
      required: true, // Nombre del evento en español
    },
    venue: {
      type: String, // Lugar del evento en español
    },
    address: {
      type: String, // Dirección en español
    },
    photo: {
      type: String, // URL de la foto del evento
    },
    desc: {
      type: String, // Descripción en español
    },
    template: {
      type: String, // Nombre de la plantilla en español
    },
    category: {
      type: String,
      enum: ['Música', 'Deportes', 'Conferencia', 'Taller', 'Teatro'], // Categorías en español
    },
    currency: {
      type: String,
      enum: ['EUR', 'USD'], // Moneda admitida (Euros o Dólares)
      default: 'EUR',
    },
    gallery: {
      type: [String], // Array de URLs de fotos
      default: [],
    },
    ticket: {
      type: String,
      // enum: ['En línea', 'Presencial'], // Opciones de entrada en español
      enum: ["Online", "Walk-in", "Free"], // Añadido "Free" para eventos gratuitos
    },
    subscriptionPlan: {
      type: String,
      // enum: ['Básico', 'Estándar', 'Premium'], // Planes de suscripción en español
      // default: 'Básico',
      enum: ["Simple", "Standard", "Premium"], 
      default: 'Simple',
    },
    vipprice: {
      type: Number, // Precio VIP en euros
    },
    economyprice: {
      type: Number, // Precio económico en euros
    },
    eventDate: {
      type: Date, // Fecha del evento
    },
    eventTime: {
      type: String, // Hora del evento como cadena en formatos en español (e.g., "19:00")
    },
    eventDateSec: {
      type: Date, // Fecha del evento
    },
    eventTimeSec: {
      type: String, // Hora del evento como cadena en formatos en español (e.g., "19:00")
    },
    vipSize: {
      type: Number, // Capacidad de asientos VIP
    },
    TotalCapacity: {
      type: Number, // Capacidad total de asientos
    },
    paymentStatus: {
      type: String,
      // enum: ['Pendiente', 'Pagado', 'Fallido'], // Estados de pago en español
      // default: 'Pendiente',
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentDetails: {
      paymentIntentId: { type: String }, // ID de la intención de pago
      paymentMethod: { type: String }, // Método de pago (e.g., tarjeta, transferencia bancaria)
      sessionStorageId: { type: String }, // ID de la sesión de pago
    },
    economySize: {
      type: Number, // Capacidad de asientos económicos
    },
    availableSeats: {
      type: [String], // Lista de números de asientos disponibles
      default: [],
    },
    finalSeats: {
      type: Array, 
      default: [],
    },
    featured: {
      type: Boolean, // Si el evento es destacado
      default: false,
    },
    reservedSeats: {
      type: [String], // Lista de números de asientos reservados
      default: [],
    },
    reservedSeatsSec: {
      type: [String], // Lista de números de asientos reservados
      default: [],
    },
    published: {
      type: Boolean, // Si el evento está publicado
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'cancelled', 'finished'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
