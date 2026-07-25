export function errorHandlerMiddleware(error, request, response, next) {
  if (error?.status === 413) {
    return response.status(413).json({ error: "Request body is too large" });
  }

  if (error instanceof SyntaxError && error?.status === 400) {
    return response.status(400).json({ error: "Request body contains invalid JSON" });
  }

  return response.status(500).json({ error: "An unexpected error occurred" });
}

export function notFoundHandlerMiddleware(request, response) {
  response.status(404).json({ error: "Not found" });
}
