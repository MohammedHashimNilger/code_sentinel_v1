import jwt from "jsonwebtoken";

// Signs a JWT containing just the user's Mongo ID. Keeping the payload
// minimal means the token can't leak stale data - if we ever change the
// user's username or email, we don't have to worry about an old token
// carrying the outdated value, since the middleware always re-fetches
// the user from the DB using this ID.
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export default generateToken;
