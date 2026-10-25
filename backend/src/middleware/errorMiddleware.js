// Catches requests to routes that don't exist and forwards a 404 error
// into the normal error-handling flow, instead of Express's default
// plain-text 404 response.
export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Central error handler. Every controller uses asyncHandler, so any thrown
// error (validation errors, DB errors, manually thrown errors) ends up here
// instead of being handled inconsistently in each controller.
export const errorHandler = (err, req, res, next) => {
  // If a controller threw an error but didn't set a status code,
  // res.statusCode defaults to 200, which would be misleading for an error.
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Internal server error";

  // Mongoose "CastError" happens when an invalid ObjectId is passed
  // (e.g. /api/repos/123 instead of a real Mongo ID). Treat it as a 404
  // rather than a generic 500, since it means "resource not found".
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose validation errors (e.g. required field missing) should be
  // a 400, not a 500 - the request itself was invalid, not the server.
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Duplicate key error (e.g. unique email already exists)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already in use`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Stack traces are only useful in development and would leak
    // internal file paths/logic if exposed in production.
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
