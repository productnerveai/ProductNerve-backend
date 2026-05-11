const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a workspace name'],
    trim: true,
    maxlength: [100, 'Workspace name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'locked', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Cascade delete: When workspace is deleted, delete associated projects
workspaceSchema.pre('deleteOne', { document: true, query: false }, async function() {
  // TODO: Delete associated projects when Project model is created
  console.log(`Deleting workspace ${this._id} and associated projects`);
});

module.exports = mongoose.model('Workspace', workspaceSchema);
