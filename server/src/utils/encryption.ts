import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

/**
 * Encrypts a string using AES-256-CBC
 * @param text - The text to encrypt
 * @param encryptionKey - The encryption key (must be 32 bytes for AES-256)
 * @returns Encrypted text in format: iv:encryptedData (hex)
 */
export function encrypt(text: string, encryptionKey: string): string {
  // Create a 32-byte key from the encryption key
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data (separated by :)
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string using AES-256-CBC
 * @param encryptedText - The encrypted text in format: iv:encryptedData (hex)
 * @param encryptionKey - The encryption key (must be 32 bytes for AES-256)
 * @returns Decrypted text
 */
export function decrypt(encryptedText: string, encryptionKey: string): string {
  // Create a 32-byte key from the encryption key
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  
  // Split IV and encrypted data
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  // Decrypt the text
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

