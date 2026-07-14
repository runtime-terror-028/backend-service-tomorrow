import { getDbPool } from "../db/db_connector.ts";
import {
  createdResponse,
  badRequest,
  serverError
} from "./api_utils.ts";
import { createTicket, TicketInsert } from "../db/db_ticket.ts";
import { searchAssets } from "../db/db_cmdb.ts";

export async function handleAlertRoutes(req: Request, url: URL): Promise<Response> {
  const method = req.method;
  const path = url.pathname;
  const pool = getDbPool();

  try {
    if (path === "/api/alerts" && method === "POST") {
      const payload = await req.json();
      
      // Parse Grafana payload or generic payload
      let ipAddress = payload.ip_address || payload.ip || null;
      let title = payload.title || payload.message || "Grafana Alert";
      let description = "";

      // Handle typical Grafana webhook format
      if (payload.alerts && Array.isArray(payload.alerts) && payload.alerts.length > 0) {
        const firstAlert = payload.alerts[0];
        
        if (firstAlert.annotations) {
          title = firstAlert.annotations.summary || title;
          description = firstAlert.annotations.description || description;
        }
        
        if (firstAlert.labels) {
          if (firstAlert.labels.instance) {
            // instance could be '10.0.0.1:9100'
            ipAddress = firstAlert.labels.instance.split(':')[0];
          }
          if (firstAlert.labels.ip_address) {
            ipAddress = firstAlert.labels.ip_address;
          }
        }
      }

      // Fallback to commonLabels if ipAddress wasn't found in alerts[0]
      if (!ipAddress && payload.commonLabels) {
        if (payload.commonLabels.instance) {
          ipAddress = payload.commonLabels.instance.split(':')[0];
        } else if (payload.commonLabels.ip_address) {
          ipAddress = payload.commonLabels.ip_address;
        }
      }

      // Ticket body
      const ticketBody: TicketInsert = {
        priority: 'high',
        short_description: title,
        long_description: description,
        created_by: 1, // Default system/admin user
        inc_number: 'INC' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
      };

      // Add CMDB Server Details if IP is provided
      if (ipAddress) {
        const servers = await searchAssets(pool, { ip_address: ipAddress });
        let server = servers[0];
        
        if (!server) {
          const serversByName = await searchAssets(pool, { host_name: ipAddress });
          server = serversByName[0];
        }

        if (server) {
          const serverInfo = `\n\n--- Affected Server Details ---\nName: ${server.asset_name}\nHost: ${server.host_name || 'N/A'}\nIP: ${server.ip_address || 'N/A'}\nOS: ${server.os_version || 'N/A'}\nVirtual: ${server.is_virtual ? 'Yes' : 'No'}`;
          ticketBody.long_description += serverInfo;
        }
      }

      const id = await createTicket(pool, ticketBody);
      return createdResponse({ ticket_id: id, message: "Alert processed and ticket created" });
    }

    return badRequest("Endpoint not mapped or method not allowed");
  } catch (error: unknown) {
    console.error("Alert API Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return serverError(msg);
  }
}
