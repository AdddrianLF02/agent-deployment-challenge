export function securityMiddleware(request, response, next) {
  response.set({
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  next();
}
