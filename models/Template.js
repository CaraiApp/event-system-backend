import mongoose from 'mongoose';

// Definición del esquema para los asientos
const seatSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['VIP', 'ECONOMY', 'DISABLED', 'RESERVED'],
    default: 'ECONOMY'
  },
  section: {
    type: String,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// Definición del esquema para las secciones
const sectionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  }
}, { _id: false });

// Definición del esquema para los textos informativos
const textSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  fontSize: {
    type: Number,
    default: 14
  },
  color: {
    type: String,
    default: 'white'
  }
}, { _id: false });

// Esquema principal para la plantilla
const templateSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  seats: [seatSchema],
  sections: [sectionSchema],
  texts: [textSchema],
  stageDimensions: {
    width: {
      type: Number,
      default: 30
    },
    height: {
      type: Number,
      default: 10
    }
  },
  image: {
    type: String,
    default: 'https://via.placeholder.com/450x250?text=Template'
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateModified: {
    type: Date,
    default: Date.now
  },
  rows: {
    type: Number,
    default: 1
  },
  columns: {
    type: Number,
    default: 1
  },
  defaultSeats: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export default mongoose.model('Template', templateSchema);