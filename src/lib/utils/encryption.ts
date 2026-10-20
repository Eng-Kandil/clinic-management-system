import CryptoJS from "crypto-js";

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  return key;
}

/**
 * AES-encrypt a plaintext string.
 */
export function encryptField(text: string): string {
  const key = getEncryptionKey();
  return CryptoJS.AES.encrypt(text, key).toString();
}

/**
 * AES-decrypt a ciphertext string.
 */
export function decryptField(ciphertext: string): string {
  const key = getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error("Decryption failed — invalid ciphertext or wrong key");
  }
  return decrypted;
}

/**
 * Encrypt specific fields of an object, returning a shallow copy with those fields encrypted.
 */
export function encryptObject(
  obj: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...obj };
  for (const field of fields) {
    if (field in result && typeof result[field] === "string") {
      result[field] = encryptField(result[field] as string);
    }
  }
  return result;
}

/**
 * Decrypt specific fields of an object, returning a shallow copy with those fields decrypted.
 */
export function decryptObject(
  obj: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...obj };
  for (const field of fields) {
    if (field in result && typeof result[field] === "string") {
      result[field] = decryptField(result[field] as string);
    }
  }
  return result;
}
