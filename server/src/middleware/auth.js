/**
 * auth.js — Authorization & Role-Based Access Control (RBAC) Middleware.
 *
 * Enforces strict separation between Teacher and Student permissions.
 */

const ALLOWED_ROLES = new Set(['student', 'teacher']);
const SAFE_USER_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function extractUserContext(req) {
  const rawRoleHeader = req.headers['x-user-role'] || req.headers['x-role'];
  const rawUserHeader = req.headers['x-user-id'];

  const roleStr = typeof rawRoleHeader === 'string' ? rawRoleHeader.trim().toLowerCase() : 'student';
  const role = ALLOWED_ROLES.has(roleStr) ? roleStr : 'student';

  let userId = role === 'teacher' ? 'default_teacher' : 'default_user';
  if (typeof rawUserHeader === 'string') {
    const trimmedId = rawUserHeader.trim();
    if (SAFE_USER_ID_REGEX.test(trimmedId)) {
      userId = trimmedId;
    }
  }

  return { userId, role };
}

/**
 * Middleware ensuring request possesses Teacher privileges.
 * Responds with 403 Forbidden for students or unauthorized actors.
 */
function requireTeacher(req, res, next) {
  const { userId, role } = extractUserContext(req);

  if (role !== 'teacher') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Access denied. Teacher privileges required.',
      code: 'AUTH_TEACHER_REQUIRED'
    });
  }

  req.user = { id: userId, role: 'teacher' };
  next();
}

/**
 * Optional user context extractor attached to req.user.
 */
function attachUser(req, res, next) {
  const { userId, role } = extractUserContext(req);
  req.user = { id: userId, role };
  next();
}

module.exports = {
  requireTeacher,
  attachUser,
  extractUserContext
};
