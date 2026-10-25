import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";

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
    res.status(401);
    throw new Error("Not authorized - invalid or expired token");
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    res.status(401);
    throw new Error("Not authorized - user no longer exists");
  }

  req.user = user;
  next();
});

export default protect;
