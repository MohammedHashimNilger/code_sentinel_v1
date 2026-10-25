// Wraps an async route handler so that any rejected promise (thrown error)
// is automatically passed to next(), which forwards it to errorMiddleware.
// Without this, every controller would need its own try/catch just to
// forward errors correctly.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
