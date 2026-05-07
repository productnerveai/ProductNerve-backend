const asyncHandler = require('./asyncHandler');

/**
 * Role-based permission matrix
 */
const ROLE_PERMISSIONS = {
  admin: {
    can_manage_users: true,
    can_manage_billing: true,
    can_view_analytics: true,
    can_manage_workspaces: true,
    can_view_kyc: true,
    can_view_contacts: true,
    can_view_communications: true,
    can_manage_content: true,
    can_manage_settings: true,
    can_view_security: true,
    can_promote_to_admin: true
  },
  product_analyst: {
    can_manage_users: true,
    can_manage_billing: false,
    can_view_analytics: true,
    can_manage_workspaces: false,
    can_view_kyc: true,
    can_view_contacts: true,
    can_view_communications: true,
    can_manage_content: true,
    can_manage_settings: false,
    can_view_security: false,
    can_promote_to_admin: false
  },
  support_specialist: {
    can_manage_users: false,
    can_manage_billing: false,
    can_view_analytics: false,
    can_manage_workspaces: false,
    can_view_kyc: false,
    can_view_contacts: true,
    can_view_communications: true,
    can_manage_content: true,
    can_manage_settings: false,
    can_view_security: false,
    can_promote_to_admin: false
  },
  growth_analyst: {
    can_manage_users: true,
    can_manage_billing: false,
    can_view_analytics: true,
    can_manage_workspaces: false,
    can_view_kyc: false,
    can_view_contacts: true,
    can_view_communications: true,
    can_manage_content: true,
    can_manage_settings: false,
    can_view_security: false,
    can_promote_to_admin: false
  }
};

/**
 * Check if user has admin access
 */
exports.requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!req.user.role || req.user.role === 'user') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  // Update admin permissions based on role
  if (req.user.admin_role && ROLE_PERMISSIONS[req.user.admin_role]) {
    req.user.admin_permissions = ROLE_PERMISSIONS[req.user.admin_role];
  }

  next();
});

/**
 * Check specific permission
 */
exports.requirePermission = (permission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Super admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check specific permission
    if (req.user.admin_permissions && req.user.admin_permissions[permission]) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Permission required: ${permission}`
    });
  });
};

/**
 * Check if user can access specific admin routes
 */
exports.checkRouteAccess = (allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Super admin has access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user's role is in allowed roles
    if (req.user.admin_role && allowedRoles.includes(req.user.admin_role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied for this admin role'
    });
  });
};

/**
 * Get user's admin permissions
 */
exports.getAdminPermissions = (user) => {
  if (!user || user.role === 'user') {
    return null;
  }

  if (user.role === 'admin') {
    return ROLE_PERMISSIONS.admin;
  }

  if (user.admin_role && ROLE_PERMISSIONS[user.admin_role]) {
    return ROLE_PERMISSIONS[user.admin_role];
  }

  return null;
};
