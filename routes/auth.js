const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  resetPasswordPage,
  verifyEmail,
  resendVerification,
  changePassword,
  updateProfile,
  submitProfileCompletion,
  getProfileCompletionStatus
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateProfileCompletion
} = require('../middleware/validator');
const {
  authLimiter,
  signupLimiter,
  passwordResetLimiter
} = require('../middleware/rateLimiter');

router.post('/debug', (req, res) => {
  console.log('Debug route called:', req.body);
  res.json({ success: true, message: 'Debug route works', body: req.body });
});
router.post('/signup', signupLimiter, validateSignup, signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.get('/reset-password/:token', resetPasswordPage);
router.post('/reset-password', validateResetPassword, resetPassword);
router.put('/change-password', protect, validateChangePassword, changePassword);
router.put('/update-profile', protect, validateUpdateProfile, updateProfile);
router.post('/profile-completion', protect, validateProfileCompletion, submitProfileCompletion);
router.get('/profile-completion', protect, getProfileCompletionStatus);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

module.exports = router;
