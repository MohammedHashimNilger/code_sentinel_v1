import crypto from "crypto";

// GitHub access tokens let us act on a user's repos (read code, manage
// webhooks). Storing them in plaintext in MongoDB means a single DB leak
// hands over every connected user's GitHub access. Encrypting them at rest
// with a key that only lives in our server's env keeps a DB dump alone
// from being useful to an attacker.

const ALGORITHM = "aes-256-gcm";

// The key must be exactly 32 bytes for AES-256. We derive it from the
// env secret with a hash so the user can set ENCRYPTION_KEY to any string
// length and still get a valid key.
const getKey = () => {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables");
  }
  return crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY).digest();
};

export const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // GCM produces an auth tag that lets decrypt() detect if the ciphertext
  // was tampered with. We store iv, tag, and data together so decrypt()
  // has everything it needs.
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

export const decrypt = (encryptedString) => {
  const [ivHex, authTagHex, encryptedData] = encryptedString.split(":");

  if (!ivHex || !authTagHex || !encryptedData) {
    throw new Error("Invalid encrypted string format");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
