import { sql } from '@/app/lib/db/postgresql';

/**
 * Check if platform 2FA is enabled
 * @returns {Promise<boolean>} True if platform 2FA is enabled
 */
export async function is2FARequired() {
  try {
    const [settings] = await sql`
      SELECT "twoFactorAuthEnabled" 
      FROM "PlatformSettings" 
      LIMIT 1
    `;

    return settings?.twoFactorAuthEnabled === true;
  } catch (error) {
    console.error('Error checking platform 2FA setting:', error);
    return false; // Default to false if error
  }
}

/**
 * Check if user has 2FA enabled
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user has 2FA enabled
 */
export async function userHas2FA(userId) {
  try {
    const [user] = await sql`
      SELECT "twoFactorEnabled", "twoFactorSecret"
      FROM "User"
      WHERE id = ${userId}
    `;

    return user?.twoFactorEnabled === true && user?.twoFactorSecret !== null;
  } catch (error) {
    console.error('Error checking user 2FA:', error);
    return false;
  }
}

/**
 * Get user's 2FA status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { isRequired: boolean, has2FA: boolean, needsSetup: boolean }
 */
export async function getUser2FAStatus(userId) {
  const isRequired = await is2FARequired();
  const has2FA = await userHas2FA(userId);

  return {
    isRequired,
    has2FA,
    needsSetup: isRequired && !has2FA
  };
}

