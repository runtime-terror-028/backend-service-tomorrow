/**
 * Generates a standard JSON response.
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

/**
 * Generates a 201 Created JSON response.
 */
export function createdResponse(data: unknown): Response {
  return jsonResponse(data, 201);
}

/**
 * Generates a 400 Bad Request JSON response.
 */
export function badRequest(message = "Bad Request"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "content-type": "application/json" }
  });
}

/**
 * Generates a 404 Not Found JSON response.
 */
export function notFound(message = "Not Found"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { "content-type": "application/json" }
  });
}

/**
 * Generates a 500 Internal Server Error JSON response.
 */
export function serverError(message = "Internal Server Error"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "content-type": "application/json" }
  });
}
