export function notFound(req, res) {
  res.status(404).json({ ok: false, message: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    ok: false,
    message: err.message || "Server error"
  });
}
