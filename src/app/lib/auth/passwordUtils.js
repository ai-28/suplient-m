import crypto from 'crypto';

export function generateSalt() {
    return crypto.randomBytes(16).toString('base64');
}

export function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('base64');
}

export async function hashPasswordAsync(password) {
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);
    return { hashedPassword, salt };
}

export function verifyPassword(password, hashedPassword, salt) {
    const hash = hashPassword(password, salt);
    return hash === hashedPassword;
}
