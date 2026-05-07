const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { getAdminPermissions } = require('../middleware/adminAuth');
const NotificationService = require('../services/notificationService');

/**
 * @desc    Get current admin user profile
 * @route   GET /api/admin/me
 * @access  Admin
 */
exports.getAdminProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Admin user not found'
    });
  }

  const adminPermissions = getAdminPermissions(user);

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company_name: user.company_name,
      role: user.role,
      admin_role: user.admin_role,
      admin_permissions: adminPermissions,
      user_status: user.user_status,
      created_at: user.createdAt,
      last_login: user.last_login
    }
  });
});


/**
 * @desc    Promote user to admin role
 * @route   POST /api/admin/users/:id/promote
 * @access  Super Admin only
 */
exports.promoteToAdmin = asyncHandler(async (req, res) => {
  const { admin_role } = req.body;

  if (!admin_role || !['admin', 'product_analyst', 'support_specialist', 'growth_analyst'].includes(admin_role)) {
    return res.status(400).json({
      success: false,
      error: 'Valid admin role is required'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Update user to admin
  user.role = admin_role === 'admin' ? 'admin' : 'admin';
  user.admin_role = admin_role;
  
  // Set permissions based on role
  const { getAdminPermissions } = require('../middleware/adminAuth');
  const permissions = getAdminPermissions({ role: admin_role === 'admin' ? 'admin' : 'admin', admin_role });
  
  if (permissions) {
    user.admin_permissions = permissions;
  }

  await user.save();

   // Send notification about admin promotion
    const roleLabels = {
      admin: 'Admin',
      product_analyst: 'Product Analyst',
      growth_analyst: 'Growth Analyst',
      support_specialist: 'Support Specialist'
    };
  
    await NotificationService.createNotification({
      user_id: user._id,
      type: 'admin_promotion',
      title: 'Admin Role Assigned',
      message: `Congratulations! You have been promoted to ${roleLabels[admin_role] || admin_role}. You now have access to additional administrative features.`,
      metadata: { 
        admin_role: admin_role, 
        promoted_by: req.user.email, 
        promoted_at: user.promoted_at 
      },
      sendEmail: true
    });

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      admin_role: user.admin_role,
      admin_permissions: user.admin_permissions
    },
    message: `User promoted to ${admin_role}`
  });
});

/**
 * @desc    Demote admin to regular user
 * @route   POST /api/admin/users/:id/demote
 * @access  Super Admin only
 */
exports.demoteFromAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Prevent demoting yourself
  if (user._id.toString() === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Cannot demote yourself'
    });
  }

  // Store previous admin role before clearing it
  const previousAdminRole = user.admin_role;
  
  // Update user to regular user
  user.role = 'user';
  user.admin_role = null;
  user.demoted_at = new Date();
  user.admin_permissions = {
    can_manage_users: false,
    can_manage_billing: false,
    can_view_analytics: false,
    can_manage_workspaces: false,
    can_view_kyc: false,
    can_view_contacts: false,
    can_view_communications: false,
    can_manage_content: false,
    can_manage_settings: false,
    can_view_security: false,
    can_promote_to_admin: false
  };

  await user.save();

   // Send notification about admin demotion
    await NotificationService.createNotification({
      user_id: user._id,
      type: 'admin_demotion',
      title: 'Admin Demoted',
      message: `Your account has been demoted back to user. If you believe this is an error, please contact our support team.`,
      metadata: { 
        admin_role: previousAdminRole, 
        demoted_by: req.user.email, 
        demoted_at: user.demoted_at 
      },
      sendEmail: true
    });


  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    },
    message: 'User demoted to regular user'
  });
});

/**
 * @desc    Get all admin users
 * @route   GET /api/admin/admins
 * @access  Super Admin only
 */
exports.getAdminUsers = asyncHandler(async (req, res) => {
  const admins = await User.find({
    role: { $in: ['admin', 'product_analyst', 'support_specialist', 'growth_analyst'] }
  }).select('-password').sort({ createdAt: -1 });

  const adminUsers = admins.map(admin => ({
    id: admin._id,
    email: admin.email,
    first_name: admin.first_name,
    last_name: admin.last_name,
    company_name: admin.company_name,
    role: admin.role,
    admin_role: admin.admin_role,
    admin_permissions: admin.admin_permissions,
    user_status: admin.user_status,
    created_at: admin.createdAt,
    last_login: admin.last_login
  }));

  res.status(200).json({
    success: true,
    data: adminUsers
  });
});
