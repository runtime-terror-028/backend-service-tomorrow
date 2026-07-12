import { handleTicketRoutes } from "./src/api/ticket_api.ts";
import { handleUserRoutes } from "./src/api/user_api.ts";

import { handleCmdbRoutes } from "./src/api/cmdb_api.ts";

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname.startsWith("/api/tickets") || url.pathname.startsWith("/api/comments")) {
    return await handleTicketRoutes(req, url);
  }

  if (url.pathname.startsWith("/api/users")) {
    return await handleUserRoutes(req, url);
  }

  if (url.pathname.startsWith("/api/cmdb")) {
    return await handleCmdbRoutes(req, url);
  }

  if (url.pathname === "/api") {
    return Response.json({
      message: "Hello, world!",
      time: new Date().toISOString(),
    });
  }

  return new Response("<h1>Welcome to Deno!</h1>", {
    headers: { "content-type": "text/html" },
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
