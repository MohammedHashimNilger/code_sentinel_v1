import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    githubRepoId: {
      // GitHub's own numeric repo ID. Used to match incoming webhook
      // payloads back to a repo, since a repo can be renamed but its
      // GitHub ID never changes.
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    fullName: {
      // e.g. "hashim/codesentinel" - what's shown in the UI
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
      // GitHub's ID for the webhook we created on this repo. Required to
      // delete the webhook via the GitHub API when the user disconnects.
      type: String,
      required: true,
    },
    isActive: {
      // Set to false instead of hard-deleting if we ever want a "paused"
      // state in future, but Disconnect (Phase 4) does a real delete.
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

// A user shouldn't be able to connect the same GitHub repo twice - this
// composite unique index enforces that at the database level rather than
// relying on application code to check first (which has a race condition
// if two requests come in at once).
repositorySchema.index({ owner: 1, githubRepoId: 1 }, { unique: true });

const Repository = mongoose.model("Repository", repositorySchema);

export default Repository;
