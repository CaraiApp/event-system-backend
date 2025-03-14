import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    icon: {
      type: String,
      default: '🎫'
    },
    color: {
      type: String,
      default: '#3498db'
    },
    imageUrl: {
      type: String,
      default: 'https://via.placeholder.com/300x200?text=Categoría'
    },
    active: {
      type: Boolean,
      default: true
    },
    featured: {
      type: Boolean,
      default: false
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  { timestamps: true }
);

// Middleware para generar automáticamente el slug a partir del nombre
categorySchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name')) {
    this.slug = this.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }
  next();
});

export default mongoose.model("Category", categorySchema);