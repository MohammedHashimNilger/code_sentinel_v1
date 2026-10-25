import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    githubRepoId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    htmlUrl: {
      type: String,
      required: true,
    },
    defaultBranch: {
      type: String,
      default: "main",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    webhookId: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastScanAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

repositorySchema.index({ owner: 1, githubRepoId: 1 }, { unique: true });

const Repository = mongoose.model("Repository", repositorySchema);

export default Repository;
