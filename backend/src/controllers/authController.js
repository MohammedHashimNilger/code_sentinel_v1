import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import User from "../models/User.js";
import {
  getGithubOAuthUrl,
  exchangeCodeForAccessToken,
  fetchGithubUser,
} from "../services/githubService.js";

// Cookies that carry auth state need different settings depending on
// environment. In production, the frontend (Vercel) and backend (Render)
// are on different domains, so the cookie must be sameSite: "none" +
// secure: true for the browser to send it cross-site at all. In local
// dev, both run on localhost, so sameSite: "lax" works and doesn't
// require HTTPS.
const isProduction = process.env.NODE_ENV === "production";
const cookieBaseOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

// @route   GET /api/auth/github
// Starts the OAuth flow by redirecting the browser to GitHub's
// authorization page.
export const githubLogin = asyncHandler(async (req, res) => {
  // A random, unguessable value tied to this specific login attempt.
  // Stored in a short-lived cookie and checked again in the callback to
  // prevent an attacker from tricking a user into completing an OAuth
  // flow the attacker initiated (a CSRF attack on the login flow itself).
  const state = crypto.randomBytes(16).toString("hex");

  res.cookie("oauth_state", state, {
    ...cookieBaseOptions,
    maxAge: 5 * 60 * 1000, // 5 minutes - just long enough to complete login
  });

  res.redirect(getGithubOAuthUrl(state));
});

// @route   GET /api/auth/github/callback
// GitHub redirects here after the user approves (or denies) access.
export const githubCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  const savedState = req.cookies.oauth_state;

  // Clear the state cookie immediately - it's single-use regardless of
  // whether this check passes or fails.
  res.clearCookie("oauth_state", cookieBaseOptions);

  if (!code || !state || state !== savedState) {
    res.status(401);
    throw new Error("Invalid or missing OAuth state - possible CSRF attempt");
  }

  const accessToken = await exchangeCodeForAccessToken(code);
  const githubUser = await fetchGithubUser(accessToken);

  // Find the existing user by their GitHub ID, or create a new one.
  // We need the encryptedAccessToken field back since we're about to
  // update it, so we explicitly select it despite select: false.
  let user = await User.findOne({ githubId: String(githubUser.id) }).select(
    "+encryptedAccessToken"
  );

  if (!user) {
    user = new User({
      githubId: String(githubUser.id),
      username: githubUser.login,
      email: githubUser.email,
      avatarUrl: githubUser.avatar_url,
    });
  } else {
    // Keep profile info fresh in case the user changed their username
    // or avatar on GitHub since last login.
    user.username = githubUser.login;
    user.email = githubUser.email;
    user.avatarUrl = githubUser.avatar_url;
  }

  // GitHub access tokens (for the OAuth Apps flow we're using) don't
  // expire, but they can be revoked by the user at any time from their
  // GitHub settings. We always overwrite with the freshest token on
  // every login.
  user.setAccessToken(accessToken);
  await user.save();

  const jwtToken = generateToken(user._id);

  res.cookie("token", jwtToken, {
    ...cookieBaseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches JWT expiry
  });

  // Send the user back to the frontend dashboard now that they're logged in.
  res.redirect(`${process.env.CLIENT_URL}/dashboard`);
});

// @route   POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", cookieBaseOptions);
  res.status(200).json({ success: true, message: "Logged out" });
});

// @route   GET /api/auth/me
// Protected route - req.user is attached by authMiddleware.
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
    },
  });
});
