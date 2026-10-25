import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";

// Protects routes that require a logged-in user. Reads the JWT from the
// httpOnly cookie (not an Authorization header) since the token is never
// exposed to frontend JS in this app - it's set and read entirely via
// cookies.
const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    res.status(401);
    throw new Error("Not authorized - no token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Covers both an expired token and a tampered/invalid signature -
    // either way, the client needs to log in again.
    res.status(401);
    throw new Error("Not authorized - invalid or expired token");
  }

  // We re-fetch the user on every request instead of trusting the JWT
  // payload alone. This means if a user is ever deleted or banned, their
  // existing tokens stop working immediately instead of staying valid
  // until they expire.
  const user = await User.findById(decoded.userId);

  if (!user) {
    res.status(401);
    throw new Error("Not authorized - user no longer exists");
  }

  req.user = user;
  next();
});

export default protect;
