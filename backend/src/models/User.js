import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/encryption.js";

const userSchema = new mongoose.Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      // GitHub accounts can have a private/no public email, so this
      // isn't required - unlike githubId, which always exists.
    },
    avatarUrl: {
      type: String,
    },
    // Stores the encrypted GitHub access token. Never accessed directly -
    // always go through setAccessToken()/getAccessToken() below so it's
    // never accidentally stored or logged in plaintext.
    encryptedAccessToken: {
      type: String,
      required: true,
      // select: false means this field is left out of normal queries
      // (User.find(), User.findById()) unless explicitly requested with
      // .select("+encryptedAccessToken"). This is a safety net so a
      // route that accidentally returns a full user object to the
      // frontend doesn't leak the token.
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypts and stores the GitHub access token. Called during login/token
// refresh instead of setting encryptedAccessToken directly.
userSchema.methods.setAccessToken = function (rawToken) {
  this.encryptedAccessToken = encrypt(rawToken);
};

// Decrypts and returns the raw GitHub access token for making GitHub API
// calls. Requires the document to have been fetched with
// .select("+encryptedAccessToken") since the field is select: false.
userSchema.methods.getAccessToken = function () {
  if (!this.encryptedAccessToken) {
    throw new Error("Access token not loaded - query with .select('+encryptedAccessToken')");
  }
  return decrypt(this.encryptedAccessToken);
};

const User = mongoose.model("User", userSchema);

export default User;
