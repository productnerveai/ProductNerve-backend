const mongoose = require('mongoose');

const contentPageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Page title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: [true, 'Page slug is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Page content is required']
  },
  meta_title: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  meta_description: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  is_published: {
    type: Boolean,
    default: false
  },
  page_type: {
    type: String,
    enum: ['page', 'blog', 'help', 'legal', 'about'],
    default: 'page'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  view_count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
contentPageSchema.index({ slug: 1 });
contentPageSchema.index({ is_published: 1 });
contentPageSchema.index({ page_type: 1 });

// Generate slug from title before saving
contentPageSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('ContentPage', contentPageSchema);
