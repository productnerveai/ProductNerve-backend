const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 8,
    select: false
  },
  first_name: {
    type: String,
    required: [true, 'Please add your first name'],
    trim: true,
    maxlength: [100, 'First name cannot be more than 100 characters']
  },
  last_name: {
    type: String,
    required: [true, 'Please add your last name'],
    trim: true,
    maxlength: [100, 'Last name cannot be more than 100 characters']
  },
  company_name: {
    type: String,
    trim: true,
    maxlength: [255, 'Company name cannot be more than 255 characters']
  },
  plan_type: {
    type: String,
    enum: ['free', 'project_unlock', 'pro', 'enterprise'],
    default: 'free'
  },
  subscription_plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise']
  },
  subscription_status: {
    type: String,
    enum: ['active', 'cancelled', 'inactive', 'past_due'],
    default: 'inactive'
  },
  subscription_start: {
    type: Date
  },
  subscription_end: {
    type: Date
  },
  workspace_limit: {
    type: Number,
    default: 1
  },
  project_limit: {
    type: Number,
    default: 1
  },
  max_workspaces: {
    type: Number
  },
  max_projects_per_workspace: {
    type: Number
  },
  report_access: {
    type: Boolean,
    default: false
  },
  tool_access: {
    type: Boolean,
    default: false
  },
  user_status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deactivated'],
    default: 'active'
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'product_analyst', 'support_specialist', 'growth_analyst'],
    default: 'user'
  },
  admin_role: {
    type: String,
    enum: ['admin', 'product_analyst', 'support_specialist', 'growth_analyst'],
    default: null
  },
  admin_permissions: {
    can_manage_users: { type: Boolean, default: false },
    can_manage_billing: { type: Boolean, default: false },
    can_view_analytics: { type: Boolean, default: false },
    can_manage_workspaces: { type: Boolean, default: false },
    can_view_kyc: { type: Boolean, default: false },
    can_view_contacts: { type: Boolean, default: false },
    can_view_communications: { type: Boolean, default: false },
    can_manage_content: { type: Boolean, default: false },
    can_manage_settings: { type: Boolean, default: false },
    can_view_security: { type: Boolean, default: false },
    can_promote_to_admin: { type: Boolean, default: false }
  },
  password_reset_token: String,
  password_reset_expires: Date,
  email_verified: {
    type: Boolean,
    default: false
  },
  email_verification_token: String,
  email_verification_expires: Date,
  email_verification_code: String,
  email_verification_code_expires: Date,
  last_login: Date,
  // Profile completion fields
  official_company_name: String,
  registration_number: String,
  website: String,
  custom_email: String,
  phone: String,
  profile_completion_status: {
    type: String,
    enum: ['not_submitted', 'pending', 'approved', 'rejected'],
    default: 'not_submitted'
  },
  profile_document_url: String,
  profile_submission_date: Date,
  profile_review_date: Date,
  profile_review_notes: String,
  // Profile completion notification tracking
  profile_notification_schedule: {
    sent_24h: { type: Date, default: null },
    sent_3d: { type: Date, default: null },
    sent_7d: { type: Date, default: null }
  },
  // Cookie consent tracking
  cookie_consent: {
    type: Boolean,
    default: null
  },
  cookie_consent_at: {
    type: Date
  }
}, {
  timestamps: true
});


// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  // Generate random token
  const resetToken = require('crypto').randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.password_reset_token = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.password_reset_expires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  // Generate random token
  const verificationToken = require('crypto').randomBytes(32).toString('hex');

  // Hash token and set to emailVerificationToken field
  this.email_verification_token = require('crypto')
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Set expire (10 minutes)
  this.email_verification_expires = Date.now() + 10 * 60 * 1000;

  return verificationToken;
};

// Generate 6-digit email verification code
userSchema.methods.getEmailVerificationCode = function () {
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Set code and expire (10 minutes)
  this.email_verification_code = code;
  this.email_verification_code_expires = Date.now() + 10 * 60 * 1000;

  return code;
};

// Verify 6-digit code
userSchema.methods.verifyEmailCode = function (enteredCode) {
  return (
    this.email_verification_code === enteredCode &&
    this.email_verification_code_expires > Date.now()
  );
};

module.exports = mongoose.model('User', userSchema);
