const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Signup validation
const validateSignup = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('company_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name cannot exceed 255 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Forgot password validation
const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Reset password validation
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Change password validation
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Update profile validation
const validateUpdateProfile = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('company_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name cannot exceed 255 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Workspace validation
const validateWorkspace = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Workspace name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Update workspace validation
const validateUpdateWorkspace = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Workspace name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Project validation
const validateProject = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Project name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('workspace_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid workspace ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Update project validation
const validateUpdateProject = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Project name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(['paused', 'active', 'killed', 'scaled'])
    .withMessage('Invalid project status'),
  body('stage')
    .optional()
    .isIn(['planning', 'ideation', 'validation', 'execution', 'growth'])
    .withMessage('Invalid project stage'),
  body('overall_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Overall score must be between 0 and 100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// ICP validation (for creation - minimal requirements for saving)
const validateICP = [
  body('product_context')
    .notEmpty()
    .withMessage('Product context is required'),
  body('product_context.product_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Product name is required'),
  body('workspace_id')
    .isMongoId()
    .withMessage('Invalid workspace ID'),
  // Optional fields for progressive creation
  body('product_context.product_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Product description cannot be empty'),
  body('product_context.target_user')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Target user cannot be empty'),
  body('product_context.business_goal')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Business goal cannot be empty'),
  body('product_context.feature_name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Feature name cannot be empty'),
  body('product_context.feature_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Feature description cannot be empty'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Update ICP validation
const validateUpdateICP = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters'),
  body('product_context.product')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product description cannot be empty'),
  body('product_context.core_problem')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Core problem cannot be empty'),
  body('product_context.who_experiences')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Who experiences cannot be empty'),
  body('product_context.industries_affected')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Industries affected cannot be empty'),
  body('project_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid project ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// User Story validation (for creation - minimal requirements for saving)
const validateUserStory = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters'),
  body('product_context')
    .notEmpty()
    .withMessage('Product context is required'),
  body('product_context.product_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Product name is required'),
  body('workspace_id')
    .isMongoId()
    .withMessage('Invalid workspace ID'),
  // Optional fields for progressive creation
  body('product_context.product_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Product description cannot be empty'),
  body('product_context.target_user')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Target user cannot be empty'),
  body('product_context.business_goal')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Business goal cannot be empty'),
  body('product_context.feature_name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Feature name cannot be empty'),
  body('product_context.feature_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Feature description cannot be empty'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Update User Story validation (flexible for progressive updates)
const validateUpdateUserStory = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters'),
  body('product_context.product_name')
    .optional()
    .trim()
    ,
  body('product_context.product_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Product description cannot be empty'),
  body('product_context.target_user')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Target user cannot be empty'),
  body('product_context.business_goal')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Business goal cannot be empty'),
  body('product_context.feature_name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Feature name cannot be empty'),
  body('product_context.feature_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Feature description cannot be empty'),
  body('module_definition.module_name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Module name cannot be empty'),
  body('module_definition.module_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Module description cannot be empty'),
  body('epic_definition.epic_title')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Epic title cannot be empty'),
  body('epic_definition.epic_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Epic description cannot be empty'),
  body('epic_definition.epic_objective')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Epic objective cannot be empty'),
  body('story_definition.user_persona')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('User persona cannot be empty'),
  body('story_definition.user_need')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('User need cannot be empty'),
  body('story_definition.user_goal')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('User goal cannot be empty'),
  body('story_definition.business_value')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Business value cannot be empty'),
  body('story_definition.feature_trigger')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Feature trigger cannot be empty'),
  body('user_flow.entry_point')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Entry point cannot be empty'),
  body('user_flow.user_actions')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('User actions cannot be empty'),
  body('user_flow.system_responses')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('System responses cannot be empty'),
  body('user_flow.exit_point')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Exit point cannot be empty'),
  body('project_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid project ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// PRD validation (for creation - minimal requirements for saving)
const validatePRD = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters'),
  body('workspace_id')
    .isMongoId()
    .withMessage('Invalid workspace ID'),
  // Optional fields for progressive creation
  body('prd_type')
    .optional()
    .isIn(['simple', 'growth', 'technical'])
    .withMessage('PRD type must be simple, growth, or technical'),
  body('product_context')
    .optional()
    .notEmpty()
    .withMessage('Product context cannot be empty'),
  body('product_context.product_name')
    .optional()
    .trim()
    ,
  body('product_context.product_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Product description cannot be empty'),
  body('product_context.problem_solved')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Problem solved cannot be empty'),
  body('product_context.target_users')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Target users cannot be empty'),
  body('product_context.business_goal')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Business goal cannot be empty'),
  body('strategic_context.market_opportunity')
    .optional()
    .trim(),
  body('strategic_context.key_assumptions')
    .optional()
    .trim(),
  body('strategic_context.constraints')
    .optional()
    .trim(),
  body('strategic_context.risks')
    .optional()
    .trim(),
  body('product_definition.core_features')
    .optional()
    .trim(),
  body('product_definition.user_flows')
    .optional()
    .trim(),
  body('product_definition.value_prop')
    .optional()
    .trim(),
  body('execution_context.timeline')
    .optional()
    .trim(),
  body('execution_context.team_size')
    .optional()
    .trim(),
  body('execution_context.technical_complexity')
    .optional()
    .trim(),
  body('project_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid project ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Profile completion validation
const validateProfileCompletion = [
  body('official_company_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Official company name must be between 2 and 255 characters'),
  body('registration_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Registration number cannot exceed 100 characters'),
  body('website')
    .optional()
    .trim()
    .isURL({ require_protocol: true })
    .withMessage('Please provide a valid website URL with http:// or https://'),
  body('custom_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid business email'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Update PRD validation (flexible for progressive updates)
const validateUpdatePRD = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters'),
  body('prd_type')
    .optional()
    .isIn(['simple', 'growth', 'technical'])
    .withMessage('PRD type must be simple, growth, or technical'),
  body('product_context.product_name')
    .optional()
    .trim()
    ,
  body('product_context.product_description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Product description cannot be empty'),
  body('product_context.problem_solved')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Problem solved cannot be empty'),
  body('product_context.target_users')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Target users cannot be empty'),
  body('product_context.business_goal')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Business goal cannot be empty'),
  body('strategic_context.market_opportunity')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Market opportunity cannot be empty'),
  body('strategic_context.key_assumptions')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Key assumptions cannot be empty'),
  body('strategic_context.constraints')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Constraints cannot be empty'),
  body('strategic_context.risks')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Risks cannot be empty'),
  body('product_definition.core_features')
    .optional()
    .trim()
    ,
  body('product_definition.user_flows')
    .optional()
    .trim()
    ,
  body('product_definition.value_prop')
    .optional()
    .trim()
    ,
  body('execution_context.timeline')
    .optional()
    .trim()
    ,
  body('execution_context.team_size')
    .optional()
    .trim()
    ,
  body('execution_context.technical_complexity')
    .optional()
    .trim()
    ,
  body('project_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid project ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Support ticket validation
const validateCreateTicket = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('feedback_type')
    .isIn(['support', 'bug', 'feature', 'feedback'])
    .withMessage('Invalid feedback type'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validateUpdateTicket = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('feedback_type')
    .optional()
    .isIn(['support', 'bug', 'feature', 'feedback'])
    .withMessage('Invalid feedback type'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validateUpdateTicketAdmin = [
  body('status')
    .optional()
    .isIn(['open', 'in_progress', 'resolved', 'closed'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('admin_response')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Response must be between 1 and 2000 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Phase 1 validation - more lenient for AI output and re-runs
const validatePhase1Intake = [
  body('intake_data')
    .notEmpty()
    .withMessage('Intake data is required')
    .isObject()
    .withMessage('Intake data must be an object'),
  // Allow any fields within intake_data - no strict validation
  body('project_id')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Project ID is required'),
  handleValidationErrors
];

const validatePhase1Update = [
  body('intake_data.idea_description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Idea description must be between 10 and 1000 characters'),
  body('intake_data.problem_statement')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Problem statement must be between 10 and 1000 characters'),
  body('intake_data.target_users')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Target users must be between 5 and 500 characters'),
  body('intake_data.target_market')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Target market cannot exceed 500 characters'),
  body('intake_data.monetization_model')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Monetization model cannot exceed 500 characters'),
  body('intake_data.founder_background')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Founder background cannot exceed 500 characters'),
  body('intake_data.core_assumptions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Core assumptions cannot exceed 500 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Intake chat validation
const validateIntakeChat = [
  body('conversation')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Conversation is required'),
  body('message_count')
    .isInt({ min: 1, max: 20 })
    .withMessage('Message count must be between 1 and 20'),
  body('project_id')
    .optional()
    .isMongoId()
    .withMessage('Valid project ID is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateProfileCompletion,
  validateWorkspace,
  validateUpdateWorkspace,
  validateProject,
  validateUpdateProject,
  validateICP,
  validateUpdateICP,
  validateUserStory,
  validateUpdateUserStory,
  validatePRD,
  validateUpdatePRD,
  validateCreateTicket,
  validateUpdateTicket,
  validateUpdateTicketAdmin,
  validatePhase1Intake,
  validatePhase1Update,
  validateIntakeChat
};
