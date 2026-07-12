import { getDbPool } from "../db/db_connector.ts";
import {
  jsonResponse,
  createdResponse,
  badRequest,
  notFound,
  serverError
} from "./api_utils.ts";
import {
  createUser,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  getAllUsers,
  updateUser,
  updateUserRole,
  deactivateUser,
  activateUser,
  softDeleteUser,
  restoreUser
} from "../db/db_user.ts";

export async function handleUserRoutes(req: Request, url: URL): Promise<Response> {
  const method = req.method;
  const path = url.pathname;
  const pool = getDbPool();

  try {
    if (path.startsWith("/api/users")) {
      const parts = path.split("/").filter(Boolean);
      // parts = ["api", "users", ...]
      
      // GET /api/users
      if (method === "GET" && parts.length === 2) {
        const username = url.searchParams.get("username");
        const email = url.searchParams.get("email");
        
        if (username) {
          const user = await getUserByUsername(pool, username);
          return user ? jsonResponse(user) : notFound("User not found");
        } else if (email) {
          const user = await getUserByEmail(pool, email);
          return user ? jsonResponse(user) : notFound("User not found");
        } else {
          const users = await getAllUsers(pool);
          return jsonResponse(users);
        }
      }
      
      // POST /api/users
      if (method === "POST" && parts.length === 2) {
        const body = await req.json();
        const id = await createUser(pool, body);
        return createdResponse({ user_id: id });
      }

      // Individual User routes: /api/users/:id/...
      if (parts.length >= 3) {
        const userId = parseInt(parts[2], 10);
        if (isNaN(userId)) return badRequest("Invalid user ID");

        // GET /api/users/:id
        if (method === "GET" && parts.length === 3) {
          const user = await getUserById(pool, userId);
          return user ? jsonResponse(user) : notFound("User not found");
        }

        // PATCH /api/users/:id
        if (method === "PATCH" && parts.length === 3) {
          const body = await req.json();
          const success = await updateUser(pool, userId, body);
          return success ? jsonResponse({ success }) : notFound("User not found or no changes");
        }

        // DELETE /api/users/:id
        if (method === "DELETE" && parts.length === 3) {
          const success = await softDeleteUser(pool, userId);
          return success ? jsonResponse({ success }) : notFound("User not found");
        }

        // Sub-routes for /api/users/:id/...
        if (parts.length === 4) {
          const action = parts[3];
          
          // PATCH /api/users/:id/role
          if (method === "PATCH" && action === "role") {
            const body = await req.json();
            if (!body.role) return badRequest("Role is required");
            const success = await updateUserRole(pool, userId, body.role);
            return success ? jsonResponse({ success }) : notFound("User not found");
          }

          // POST /api/users/:id/deactivate
          if (method === "POST" && action === "deactivate") {
            const success = await deactivateUser(pool, userId);
            return success ? jsonResponse({ success }) : notFound("User not found");
          }

          // POST /api/users/:id/activate
          if (method === "POST" && action === "activate") {
            const success = await activateUser(pool, userId);
            return success ? jsonResponse({ success }) : notFound("User not found");
          }

          // POST /api/users/:id/restore
          if (method === "POST" && action === "restore") {
            const success = await restoreUser(pool, userId);
            return success ? jsonResponse({ success }) : notFound("User not found");
          }
        }
      }
    }

    return notFound("Endpoint not mapped");
  } catch (error: unknown) {
    console.error("API Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return serverError(msg);
  }
}
