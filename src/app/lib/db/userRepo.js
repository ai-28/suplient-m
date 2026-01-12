import { sql } from './postgresql';
const crypto = require('crypto');

const HASH_ITERATIONS = 10000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

function generateSalt() {
  return crypto.randomBytes(16).toString('base64');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('base64');
}

export const userRepo = {
  authenticate,
  register,
  checkEmailExists,
  getUserByEmail
};

async function authenticate(email, inputPassword) {
  try {
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Fetch user by email (case-insensitive)
    const result = await sql`SELECT * FROM "User" WHERE LOWER(email) = LOWER(${normalizedEmail})`;
    const user = result[0];

    if (!user) {
      throw new Error("Invalid email");
    }

    // Hash input password with stored salt
    const inputHash = hashPassword(inputPassword, user.salt);

    if (inputHash !== user.password) {
      throw new Error("Invalid password");
    }

    // Check approval status for coaches
    if (user.role === 'coach' && user.approvalStatus === 'pending') {
      throw new Error("Your account is pending admin approval. Please wait for approval or contact support.");
    }

    if (user.role === 'coach' && user.approvalStatus === 'denied') {
      throw new Error("Your account has been denied. Please contact support for assistance.");
    }

    if (!user.isActive) {
      throw new Error("User is not active");
    }

    // Return user object without sensitive fields
    const { password, salt, ...safeUser } = user;
    return safeUser;
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}

async function register(userData) {
  try {
    const {
      name,
      email,
      password,
      phone,
      role = 'coach',
      expectedPlatformBestAt,
      currentClientsPerMonth,
      currentPlatform
    } = userData;

    // Normalize email to lowercase for storage and comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists (case-insensitive)
    const existingUser = await sql`SELECT id FROM "User" WHERE LOWER(email) = LOWER(${normalizedEmail})`;
    if (existingUser.length > 0) {
      throw new Error("Email already exists");
    }

    // Generate salt and hash password
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    // For coaches, set approvalStatus to 'pending' and isActive to false
    const isActive = role === 'coach' ? false : true;
    const approvalStatus = role === 'coach' ? 'pending' : 'approved';

    // Insert new user (store email in lowercase)
    const result = await sql`
      INSERT INTO "User" (
        name, email, password, salt, phone, role, 
        "isActive", "approvalStatus",
        "expectedPlatformBestAt", "currentClientsPerMonth", "currentPlatform",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${name}, ${normalizedEmail}, ${hashedPassword}, ${salt}, ${phone}, ${role}, 
        ${isActive}, ${approvalStatus},
        ${expectedPlatformBestAt || null}, ${currentClientsPerMonth || null}, ${currentPlatform || null},
        NOW(), NOW()
      )
      RETURNING id, name, email, phone, role, "isActive", "approvalStatus", "createdAt"
    `;

    const newUser = result[0];
    return newUser;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

async function checkEmailExists(email) {
  try {
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();
    const result = await sql`SELECT id FROM "User" WHERE LOWER(email) = LOWER(${normalizedEmail})`;
    return result.length > 0;
  } catch (error) {
    console.error("Email check error:", error);
    throw error;
  }
}

async function getUserByEmail(email) {
  try {
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();
    const result = await sql`SELECT * FROM "User" WHERE LOWER(email) = LOWER(${normalizedEmail})`;
    return result[0];
  } catch (error) {
    console.error("User fetch error:", error);
    throw error;
  }
}
