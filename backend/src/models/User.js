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
    },
    avatarUrl: {
      type: String,
    },
    encryptedAccessToken: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.setAccessToken = function (rawToken) {
  this.encryptedAccessToken = encrypt(rawToken);
};

userSchema.methods.getAccessToken = function () {
  if (!this.encryptedAccessToken) {
    throw new Error("Access token not loaded - query with .select('+encryptedAccessToken')");
  }
  return decrypt(this.encryptedAccessToken);
};

const User = mongoose.model("User", userSchema);

export default User;
