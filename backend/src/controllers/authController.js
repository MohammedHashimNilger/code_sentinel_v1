import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import User from "../models/User.js";
import {
  getGithubOAuthUrl,
  exchangeCodeForAccessToken,
  fetchGithubUser,
} from "../services/githubService.js";

const isProduction = process.env.NODE_ENV === "production";
const cookieBaseOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

export const githubLogin = asyncHandler(async (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");

  res.cookie("oauth_state", state, {
    ...cookieBaseOptions,
    maxAge: 5 * 60 * 1000,
  });

  res.redirect(getGithubOAuthUrl(state));
});

export const githubCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  const savedState = req.cookies.oauth_state;

  res.clearCookie("oauth_state", cookieBaseOptions);

  if (!code || !state || state !== savedState) {
    res.status(401);
    throw new Error("Invalid or missing OAuth state - possible CSRF attempt");
  }

  const accessToken = await exchangeCodeForAccessToken(code);
  const githubUser = await fetchGithubUser(accessToken);

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
    user.username = githubUser.login;
    user.email = githubUser.email;
    user.avatarUrl = githubUser.avatar_url;
  }

  user.setAccessToken(accessToken);
  await user.save();

  const jwtToken = generateToken(user._id);

  res.cookie("token", jwtToken, {
    ...cookieBaseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.CLIENT_URL}/dashboard`);
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", cookieBaseOptions);
  res.status(200).json({ success: true, message: "Logged out" });
});

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
