/**
 * Utility functions for handling impersonation
 */

/**
 * Get the active user ID for business operations
 * When impersonating, this returns the impersonated user's ID
 * Otherwise, returns the current user's ID
 * 
 * @param {Object} session - NextAuth session object
 * @returns {string} Active user ID
 */
export function getActiveUserId(session) {
    if (!session?.user?.id) {
        return null;
    }
    // When impersonating, session.user.id is already the impersonated user's ID
    // So we just return it
    return session.user.id;
}

/**
 * Get the original admin ID if impersonating
 * Used for audit logs and chat messages
 * 
 * @param {Object} session - NextAuth session object
 * @returns {string|null} Original admin ID or null if not impersonating
 */
export function getOriginalAdminId(session) {
    if (session?.user?.isImpersonating && session.user.originalAdminId) {
        return session.user.originalAdminId;
    }
    return null;
}

/**
 * Get the sender ID for chat messages
 * When impersonating, returns the admin's ID so messages show as sent by admin
 * Otherwise, returns the current user's ID
 * 
 * @param {Object} session - NextAuth session object
 * @returns {string} Sender ID for chat messages
 */
export function getChatSenderId(session) {
    if (!session?.user?.id) {
        return null;
    }
    // For chat: use admin ID if impersonating, otherwise use current user ID
    if (session.user.isImpersonating && session.user.originalAdminId) {
        return session.user.originalAdminId;
    }
    return session.user.id;
}

/**
 * Get sender name for chat messages
 * When impersonating, returns the admin's name
 * Otherwise, returns the current user's name
 * 
 * @param {Object} session - NextAuth session object
 * @returns {string} Sender name for chat messages
 */
export function getChatSenderName(session) {
    if (!session?.user?.name) {
        return null;
    }
    if (session.user.isImpersonating && session.user.originalAdminName) {
        return session.user.originalAdminName;
    }
    return session.user.name;
}

/**
 * Get sender role for chat messages
 * When impersonating, returns the admin's role
 * Otherwise, returns the current user's role
 * 
 * @param {Object} session - NextAuth session object
 * @returns {string} Sender role for chat messages
 */
export function getChatSenderRole(session) {
    if (!session?.user?.role) {
        return null;
    }
    if (session.user.isImpersonating && session.user.originalAdminRole) {
        return session.user.originalAdminRole;
    }
    return session.user.role;
}

/**
 * Check if the current session is impersonating
 * 
 * @param {Object} session - NextAuth session object
 * @returns {boolean} True if impersonating, false otherwise
 */
export function isImpersonating(session) {
    return session?.user?.isImpersonating === true;
}

