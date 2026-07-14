import { handleTicketRoutes } from "./src/api/ticket_api.ts";
import { handleUserRoutes } from "./src/api/user_api.ts";
import { handleCmdbRoutes } from "./src/api/cmdb_api.ts";
import { handleAlertRoutes } from "./src/api/alert_api.ts";

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

  if (url.pathname.startsWith("/api/alerts")) {
    return await handleAlertRoutes(req, url);
  }

  if (url.pathname === "/api") {
    return Response.json({
      message: "Hello, world!",
      time: new Date().toISOString(),
    });
  }

  // Serve static files from public
  if (url.pathname.startsWith("/public/")) {
    try {
      const filePath = `.${url.pathname}`;
      const file = await Deno.readFile(filePath);
      
      let contentType = "text/plain";
      if (filePath.endsWith(".css")) contentType = "text/css";
      else if (filePath.endsWith(".js")) contentType = "application/javascript";
      
      return new Response(file, { headers: { "content-type": contentType } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  // Serve HTML views
  let viewPath = "";
  if (url.pathname === "/") viewPath = "./src/views/index.html";
  else if (url.pathname === "/incident") viewPath = "./src/views/incident.html";
  else if (url.pathname === "/cmdb") viewPath = "./src/views/cmdb.html";

  if (viewPath) {
    try {
      const file = await Deno.readFile(viewPath);
      return new Response(file, { headers: { "content-type": "text/html" } });
    } catch {
      return new Response("View not found", { status: 404 });
    }
  }

  return new Response("Not found", { status: 404 });
}

if (import.meta.main) {
  Deno.serve(handler);
}
