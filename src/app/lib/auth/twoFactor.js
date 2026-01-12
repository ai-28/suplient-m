import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { sql } from '@/app/lib/db/postgresql';

/**
 * Generate a TOTP secret for a user
 * @param {string} email - User's email (for QR code label)
 * @param {string} platformName - Platform name (for QR code label)
 * @returns {Object} Secret object with secret, otpauth_url, and QR code data URL
 */
export async function generateSecret(email, platformName = 'Mental Coach Platform') {
  const secret = speakeasy.generateSecret({
    name: `${platformName} (${email})`,
    issuer: platformName,
    length: 32
  });

  // Generate QR code data URL
  let qrCodeDataUrl;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }

  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url,
    qrCode: qrCodeDataUrl
  };
}

/**
 * Verify a TOTP token
 * @param {string} secret - User's TOTP secret (base32)
 * @param {string} token - The 6-digit code from user
 * @returns {boolean} True if token is valid
 */
export function verifyToken(secret, token) {
  if (!secret || !token) {
    return false;
  }

  // Verify token with 2-step window (allows for clock skew)
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 3 // Allow 2 time steps (60 seconds) of clock skew
  });

  return verified;
}

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate (default: 10)
 * @returns {Array<string>} Array of backup codes
 */
export function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 * @param {string} code - Plain backup code
 * @returns {string} Hashed code
 */
export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a backup code
 * @param {Array<string>} hashedCodes - Array of hashed backup codes from database
 * @param {string} code - Plain backup code from user
 * @returns {boolean} True if code is valid
 */
export function verifyBackupCode(hashedCodes, code) {
  if (!hashedCodes || !Array.isArray(hashedCodes) || !code) {
    return false;
  }

  const hashedInput = hashBackupCode(code.toUpperCase());
  return hashedCodes.includes(hashedInput);
}

/**
 * Remove a used backup code from the array
 * @param {Array<string>} hashedCodes - Array of hashed backup codes
 * @param {string} code - Plain backup code that was used
 * @returns {Array<string>} Updated array without the used code
 */
export function removeUsedBackupCode(hashedCodes, code) {
  if (!hashedCodes || !Array.isArray(hashedCodes) || !code) {
    return hashedCodes || [];
  }

  const hashedInput = hashBackupCode(code.toUpperCase());
  return hashedCodes.filter(hashed => hashed !== hashedInput);
}

/**
 * Check if platform 2FA is enabled
 * @returns {Promise<boolean>} True if platform 2FA is enabled
 */
export async function isPlatform2FAEnabled() {
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
 * Check user's 2FA status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { has2FA: boolean, needsSetup: boolean, isPlatformRequired: boolean }
 */
export async function checkUser2FAStatus(userId) {
  try {
    const [user] = await sql`
      SELECT "twoFactorEnabled", "twoFactorSecret"
      FROM "User"
      WHERE id = ${userId}
    `;

    if (!user) {
      return {
        has2FA: false,
        needsSetup: false,
        isPlatformRequired: false
      };
    }

    const has2FA = user.twoFactorEnabled === true && user.twoFactorSecret !== null;

    return {
      has2FA,
      needsSetup: false, // No platform requirement - users control their own 2FA
      isPlatformRequired: false // No platform requirement
    };
  } catch (error) {
    console.error('Error checking user 2FA status:', error);
    return {
      has2FA: false,
      needsSetup: false,
      isPlatformRequired: false
    };
  }
}

/**
 * Rate limiting for 2FA attempts
 * Store in memory (in production, use Redis or similar)
 */
const attemptStore = new Map();

/**
 * Check if user has exceeded rate limit
 * @param {string} userId - User ID
 * @param {number} maxAttempts - Maximum attempts allowed (default: 5)
 * @param {number} windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns {Object} { allowed: boolean, remainingAttempts: number, resetAt: Date }
 */
export function checkRateLimit(userId, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const key = `2fa_${userId}`;
  const attempts = attemptStore.get(key) || { count: 0, resetAt: now + windowMs };

  // Reset if window expired
  if (now > attempts.resetAt) {
    attempts.count = 0;
    attempts.resetAt = now + windowMs;
  }

  const remainingAttempts = Math.max(0, maxAttempts - attempts.count);
  const allowed = attempts.count < maxAttempts;

  if (!allowed) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetAt: new Date(attempts.resetAt)
    };
  }

  return {
    allowed: true,
    remainingAttempts,
    resetAt: new Date(attempts.resetAt)
  };
}

/**
 * Record a failed 2FA attempt
 * @param {string} userId - User ID
 */
export function recordFailedAttempt(userId) {
  const key = `2fa_${userId}`;
  const attempts = attemptStore.get(key) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
  attempts.count += 1;
  attemptStore.set(key, attempts);
}

/**
 * Clear rate limit for user (on successful verification)
 * @param {string} userId - User ID
 */
export function clearRateLimit(userId) {
  const key = `2fa_${userId}`;
  attemptStore.delete(key);
}

