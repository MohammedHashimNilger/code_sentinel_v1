import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import repoRoutes from "./routes/repoRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

// Load environment variables before anything else touches process.env
dotenv.config();

connectDB();

const app = express();

// Render (and most PaaS hosts) terminate TLS at a reverse proxy in front
// of the app, so Express sees every request as plain HTTP even when the
// real client connection was HTTPS. Without this, req.secure and
// anything else that depends on knowing the connection was encrypted
// would be wrong in production. "1" means trust exactly one hop in
// front of us, which matches Render's setup.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Allow requests from the frontend, and allow cookies to be sent
// cross-origin (needed since auth will use an httpOnly JWT cookie).
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Mounted BEFORE express.json(). The webhook route parses its own body
// with express.raw() so it can verify GitHub's HMAC signature against
// the exact bytes received. If express.json() ran first for this path,
// it would consume and parse the body, leaving nothing for the raw
// parser to read.
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", scanRoutes);
app.use("/api", issueRoutes);
app.use("/api/reports", reportRoutes);

// Any route that doesn't match the ones registered above falls through
// to notFound, then errorHandler. These must be registered last -
// Express matches middleware/routes in the order they're added.
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
