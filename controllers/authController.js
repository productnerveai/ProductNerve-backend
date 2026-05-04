const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { sendEmail } = require('../config/email');
const { uploadFileToSpaces } = require('../utils/fileUpload');
const fs = require('fs');
const path = require('path');

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, company_name } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password before creating user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      first_name,
      last_name,
      company_name
    });

    // Generate 6-digit email verification code
    const verificationCode = user.getEmailVerificationCode();
    await user.save();

    // Read email template
    const templatePath = path.join(__dirname, '../templates/emailVerification.html');
    let emailTemplate = fs.readFileSync(templatePath, 'utf8');
    
    // Replace placeholders with actual values
    emailTemplate = emailTemplate.replace('{{VERIFICATION_CODE}}', verificationCode);
    emailTemplate = emailTemplate.replace('{{CURRENT_YEAR}}', new Date().getFullYear());

    // Send verification email
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Product Nerve',
      html: emailTemplate
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Still return success but log the error
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful! Please check your email to verify your account.',
        user: {
          id: user._id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name,
          plan_type: user.plan_type,
          role: user.role,
          email_verified: user.email_verified
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    console.log('Login function called');
    const { email, password } = req.body;
    console.log('Login request body:', { email, password: '***' });

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    console.log('Found user:', user ? 'Yes' : 'No');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.user_status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({
        success: false,
        error: 'Email not verified'
      });
    }

  // Update last login
  user.last_login = Date.now();
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        plan_type: user.plan_type,
        subscription_status: user.subscription_status,
        role: user.role,
        email_verified: user.email_verified,
        user_status: user.user_status,
        created_at: user.createdAt
      }
    }
  });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company_name: user.company_name,
      plan_type: user.plan_type,
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      workspace_limit: user.workspace_limit,
      project_limit: user.project_limit,
      max_workspaces: user.max_workspaces,
      max_projects_per_workspace: user.max_projects_per_workspace,
      report_access: user.report_access,
      tool_access: user.tool_access,
      role: user.role,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }
  });
});

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {},
    message: 'User logged out successfully'
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'There is no user with that email'
    });
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

  // Read email template
  const templatePath = path.join(__dirname, '../templates/passwordReset.html');
  let emailTemplate = fs.readFileSync(templatePath, 'utf8');
  
  // Replace placeholders with actual values
  emailTemplate = emailTemplate.replace('{{RESET_TOKEN}}', resetToken);
  emailTemplate = emailTemplate.replace('{{CURRENT_YEAR}}', new Date().getFullYear());

  // Send reset email
  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Reset Your Password - Product Nerve',
    html: emailTemplate
  });

  if (!emailResult.success) {
    console.error('Failed to send reset email:', emailResult.error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send reset email'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'Password reset email sent'
    }
  });
});

// @desc    Reset password page
// @route   GET /api/auth/reset-password/:token
// @access  Public
exports.resetPasswordPage = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = require('crypto')
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user by reset token and check if not expired
    const user = await User.findOne({
      password_reset_token: resetPasswordToken,
      password_reset_expires: { $gt: Date.now() }
    });

    if (!user) {
      // Redirect directly to frontend with error
      return res.redirect(302, `https://productnerve.com/forgot-password?reset=error&message=invalid_token`);
    }

    // Redirect directly to frontend with success
    res.redirect(302, `https://productnerve.com/reset-password?token=${req.params.token}&validated=true`);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = require('crypto')
      .createHash('sha256')
      .update(req.body.token)
      .digest('hex');

  const user = await User.findOne({
    password_reset_token: resetPasswordToken,
    password_reset_expires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  // Hash new password before setting
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(req.body.password, 12);

  // Set new password
  user.password = hashedPassword;
  user.password_reset_token = undefined;
  user.password_reset_expires = undefined;
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    data: {
      token,
      message: 'Password reset successful'
    }
  });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current password and new password'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if current password matches
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'New password must contain at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully'
      }
    });
  } catch (error) {
    next(error);
  };
};

// @desc    Update profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, company_name } = req.body;

    // Get user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields if provided
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (company_name !== undefined) user.company_name = company_name;

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name,
          plan_type: user.plan_type,
          subscription_status: user.subscription_status,
          role: user.role,
          email_verified: user.email_verified,
          user_status: user.user_status,
          created_at: user.createdAt,
          updated_at: user.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit profile completion
// @route   POST /api/auth/profile-completion
// @access  Private
exports.submitProfileCompletion = async (req, res, next) => {
  try {
    // Handle both JSON and FormData
    let official_company_name, registration_number, website, custom_email, phone;
    let profileDocumentUrl = null;
    
    if (req.is('multipart/form-data')) {
      // FormData handling with validation
      official_company_name = req.body.official_company_name;
      registration_number = req.body.registration_number;
      website = req.body.website;
      custom_email = req.body.custom_email;
      phone = req.body.phone;
      
      // Manual validation for FormData
      if (!official_company_name || official_company_name.trim().length < 2 || official_company_name.trim().length > 255) {
        return res.status(400).json({
          success: false,
          error: 'Official company name must be between 2 and 255 characters'
        });
      }
      
      if (registration_number && registration_number.trim().length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Registration number cannot exceed 100 characters'
        });
      }
      
      if (website && !website.match(/^https?:\/\/.+/)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid website URL with http:// or https://'
        });
      }
      
      if (custom_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custom_email)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid business email'
        });
      }
      
      if (phone && (phone.trim().length < 10 || phone.trim().length > 20)) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be between 10 and 20 characters'
        });
      }

      // Handle file upload if present
      // Note: Without multer, we need to parse multipart data manually
      // For now, we'll implement a basic approach. In production, you might want to use a streaming parser
      if (req.body.document && req.body.document.data) {
        try {
          const fileData = req.body.document;
          const fileBuffer = Buffer.from(fileData.data, 'base64');
          const fileName = fileData.name || 'document.pdf';
          const mimeType = fileData.type || 'application/pdf';
          
          // Upload to DigitalOcean Spaces
          profileDocumentUrl = await uploadFileToSpaces(fileBuffer, fileName, mimeType);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          // Continue without file upload but log the error
        }
      }
    } else {
      // JSON handling
      ({
        official_company_name,
        registration_number,
        website,
        custom_email,
        phone
      } = req.body);
      
      // Validation for JSON data
      if (!official_company_name || official_company_name.trim().length < 2 || official_company_name.trim().length > 255) {
        return res.status(400).json({
          success: false,
          error: 'Official company name must be between 2 and 255 characters'
        });
      }
      
      if (registration_number && registration_number.trim().length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Registration number cannot exceed 100 characters'
        });
      }
      
      if (website && !website.match(/^https?:\/\/.+/)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid website URL with http:// or https://'
        });
      }
      
      if (custom_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custom_email)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid business email'
        });
      }
      
      if (phone && (phone.trim().length < 10 || phone.trim().length > 20)) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be between 10 and 20 characters'
        });
      }

      // Handle file upload from JSON data
      if (req.body.document && req.body.document.data) {
        try {
          const fileData = req.body.document;
          const fileBuffer = Buffer.from(fileData.data, 'base64');
          const fileName = fileData.name || 'document.pdf';
          const mimeType = fileData.type || 'application/pdf';
          
          // Upload to DigitalOcean Spaces
          profileDocumentUrl = await uploadFileToSpaces(fileBuffer, fileName, mimeType);
          console.log('Document uploaded successfully:', profileDocumentUrl);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          // Continue without file upload but log the error
        }
      }
    }

    // Get user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if already submitted or approved
    if (user.profile_completion_status === 'pending' || user.profile_completion_status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Profile completion is already submitted or approved'
      });
    }

    // Update profile completion fields
    user.official_company_name = official_company_name;
    user.registration_number = registration_number || '';
    user.website = website || '';
    user.custom_email = custom_email || '';
    user.phone = phone || '';
    user.profile_completion_status = 'pending';
    user.profile_submission_date = new Date();
    
    // Save document URL if uploaded
    if (profileDocumentUrl) {
      user.profile_document_url = profileDocumentUrl;
    }

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Profile completion submitted for review',
        profile_completion_status: user.profile_completion_status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get profile completion status
// @route   GET /api/auth/profile-completion
// @access  Private
exports.getProfileCompletionStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        profile_completion_status: user.profile_completion_status,
        // Basic fields from signup
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        company_name: user.company_name,
        // Profile completion fields
        official_company_name: user.official_company_name,
        registration_number: user.registration_number,
        website: user.website,
        custom_email: user.custom_email,
        phone: user.phone,
        profile_document_url: user.profile_document_url,
        profile_submission_date: user.profile_submission_date,
        profile_review_date: user.profile_review_date,
        profile_review_notes: user.profile_review_notes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with 6-digit code
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    
    console.log('Email verification request received for:', email);

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and verification code are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if email is already verified
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    // Verify the 6-digit code
    const isValidCode = user.verifyEmailCode(code);

    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    // Set email as verified and remove verification fields
    user.email_verified = true;
    user.email_verification_code = undefined;
    user.email_verification_code_expires = undefined;
    user.email_verification_token = undefined;
    user.email_verification_expires = undefined;
    await user.save();

    // Generate JWT token for automatic login
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        message: 'Email verified successfully!',
        token,
        user: {
          id: user._id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name,
          plan_type: user.plan_type,
          role: user.role,
          email_verified: user.email_verified
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if email is already verified
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    // Generate new 6-digit verification code
    const verificationCode = user.getEmailVerificationCode();
    await user.save();

    // Read email template
    const templatePath = path.join(__dirname, '../templates/emailVerification.html');
    let emailTemplate = fs.readFileSync(templatePath, 'utf8');
    
    // Replace placeholders with actual values
    emailTemplate = emailTemplate.replace('{{VERIFICATION_CODE}}', verificationCode);
    emailTemplate = emailTemplate.replace('{{CURRENT_YEAR}}', new Date().getFullYear());

    // Send verification email
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Product Nerve',
      html: emailTemplate
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Verification code sent successfully!'
      }
    });
  } catch (error) {
    next(error);
  }
};