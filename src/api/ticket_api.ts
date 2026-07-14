import { getDbPool } from "../db/db_connector.ts";
import {
  jsonResponse,
  createdResponse,
  badRequest,
  notFound,
  serverError
} from "./api_utils.ts";
import {
  createTicket,
  getTicketById,
  getTicketByIncNumber,
  getAllTickets,
  getTicketsByStatus,
  getTicketsByAssignee,
  getTicketsByCreator,
  updateTicketDetails,
  updateTicketStatus,
  assignTicket,
  unassignTicket,
  softDeleteTicket,
  restoreTicket,
  addComment,
  getCommentsByTicketId,
  softDeleteComment
} from "../db/db_ticket.ts";
import { searchAssets } from "../db/db_cmdb.ts";

export async function handleTicketRoutes(req: Request, url: URL): Promise<Response> {
  const method = req.method;
  const path = url.pathname;
  const pool = getDbPool();

  try {
    // ---- COMMENTS API ----
    if (path.startsWith("/api/comments")) {
      const parts = path.split("/").filter(Boolean);
      // parts = ["api", "comments", ":id"]
      
      if (parts.length === 3) {
        const commentId = parseInt(parts[2], 10);
        if (isNaN(commentId)) return badRequest("Invalid comment ID");

        if (method === "DELETE") {
          const success = await softDeleteComment(pool, commentId);
          return success ? jsonResponse({ success }) : notFound("Comment not found");
        }
      }
      return notFound();
    }

    // ---- TICKETS API ----
    if (path.startsWith("/api/tickets")) {
      const parts = path.split("/").filter(Boolean);
      // parts = ["api", "tickets", ...]
      
      // GET /api/tickets
      if (method === "GET" && parts.length === 2) {
        const status = url.searchParams.get("status");
        const assignee = url.searchParams.get("assignee_id");
        const creator = url.searchParams.get("creator_id");
        
        let tickets;
        if (status) tickets = await getTicketsByStatus(pool, status);
        else if (assignee) tickets = await getTicketsByAssignee(pool, parseInt(assignee, 10));
        else if (creator) tickets = await getTicketsByCreator(pool, parseInt(creator, 10));
        else tickets = await getAllTickets(pool);
        
        return jsonResponse(tickets);
      }
      
      // POST /api/tickets
      if (method === "POST" && parts.length === 2) {
        const body = await req.json();
        
        // Priority logic
        if (body.issue_type === 'server_down') {
          body.priority = 'high';
        } else if (body.issue_type === 'utilization_high') {
          body.priority = 'medium';
        } else {
          body.priority = 'low';
        }

        // CMDB Server details logic
        if (body.server_name && body.server_name.toLowerCase() !== 'others') {
          const servers = await searchAssets(pool, { ip_address: body.server_name });
          let server = servers[0];
          
          if (!server) {
            const serversByName = await searchAssets(pool, { host_name: body.server_name });
            server = serversByName[0];
          }

          if (server) {
            const serverInfo = `\n\n--- Affected Server Details ---\nName: ${server.asset_name}\nHost: ${server.host_name || 'N/A'}\nIP: ${server.ip_address || 'N/A'}\nOS: ${server.os_version || 'N/A'}\nVirtual: ${server.is_virtual ? 'Yes' : 'No'}`;
            body.long_description = (body.long_description || '') + serverInfo;
          }
        }

        // Generate INC number if not provided by frontend (or we can override it)
        if (!body.inc_number) {
          body.inc_number = 'INC' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        }

        const id = await createTicket(pool, body);
        return createdResponse({ ticket_id: id });
      }

      // /api/tickets/inc/:inc
      if (method === "GET" && parts.length === 4 && parts[2] === "inc") {
        const ticket = await getTicketByIncNumber(pool, parts[3]);
        return ticket ? jsonResponse(ticket) : notFound("Ticket not found");
      }

      // Individual Ticket routes: /api/tickets/:id/...
      if (parts.length >= 3) {
        const ticketId = parseInt(parts[2], 10);
        if (isNaN(ticketId)) return badRequest("Invalid ticket ID");

        // GET /api/tickets/:id
        if (method === "GET" && parts.length === 3) {
          const ticket = await getTicketById(pool, ticketId);
          return ticket ? jsonResponse(ticket) : notFound("Ticket not found");
        }

        // PATCH /api/tickets/:id
        if (method === "PATCH" && parts.length === 3) {
          const body = await req.json();
          const success = await updateTicketDetails(pool, ticketId, body);
          return success ? jsonResponse({ success }) : notFound("Ticket not found or no changes");
        }

        // DELETE /api/tickets/:id
        if (method === "DELETE" && parts.length === 3) {
          const success = await softDeleteTicket(pool, ticketId);
          return success ? jsonResponse({ success }) : notFound("Ticket not found");
        }

        // Sub-routes for /api/tickets/:id/...
        if (parts.length === 4) {
          const action = parts[3];
          
          // PATCH /api/tickets/:id/status
          if (method === "PATCH" && action === "status") {
            const body = await req.json();
            const success = await updateTicketStatus(pool, ticketId, body.status, body.closing_note);
            return success ? jsonResponse({ success }) : notFound("Ticket not found");
          }

          // POST /api/tickets/:id/assign
          if (method === "POST" && action === "assign") {
            const body = await req.json();
            const success = await assignTicket(pool, ticketId, body.user_id);
            return success ? jsonResponse({ success }) : notFound("Ticket not found");
          }

          // POST /api/tickets/:id/unassign
          if (method === "POST" && action === "unassign") {
            const success = await unassignTicket(pool, ticketId);
            return success ? jsonResponse({ success }) : notFound("Ticket not found");
          }

          // POST /api/tickets/:id/restore
          if (method === "POST" && action === "restore") {
            const success = await restoreTicket(pool, ticketId);
            return success ? jsonResponse({ success }) : notFound("Ticket not found");
          }

          // GET /api/tickets/:id/comments
          if (method === "GET" && action === "comments") {
            const comments = await getCommentsByTicketId(pool, ticketId);
            return jsonResponse(comments);
          }

          // POST /api/tickets/:id/comments
          if (method === "POST" && action === "comments") {
            const body = await req.json();
            const id = await addComment(pool, { ...body, ticket_id: ticketId });
            return createdResponse({ comment_id: id });
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

