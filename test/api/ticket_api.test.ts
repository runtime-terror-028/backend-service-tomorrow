import { assertEquals, assertNotEquals } from "@std/assert";
import { handler } from "../../main.ts";
import { getDbPool } from "../../src/db/db_connector.ts";
import { clearTables, initializeDatabase } from "../../src/db/sql_table_creator.ts";

const pool = getDbPool();

Deno.test({
  name: "API Routes Test",
  async fn(t) {
    // 1. Initialize and clear DB to ensure clean state
    await initializeDatabase(pool);
    await clearTables(pool);
    
    // We need a dummy user first
    await pool.query(
      `INSERT INTO users (username, password, first_name, last_name, email, role) 
       VALUES ('testuser', 'pass', 'Test', 'User', 'test@test.com', 'admin')`
    );
    const [userRows] = await pool.query("SELECT user_id FROM users WHERE username = 'testuser'") as [Array<{ user_id: number }>, unknown];
    const userId = userRows[0].user_id;

    let testTicketId: number;

    await t.step("POST /api/tickets - Create a ticket", async () => {
      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          inc_number: "INC0002",
          created_by: userId,
          short_description: "API is down",
          priority: "high"
        }),
      });
      const res = await handler(req);
      assertEquals(res.status, 201);
      const data = await res.json();
      assertNotEquals(data.ticket_id, undefined);
      testTicketId = data.ticket_id;
    });

    await t.step("GET /api/tickets/:id - Get a ticket", async () => {
      const req = new Request(`http://localhost/api/tickets/${testTicketId}`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.inc_number, "INC0002");
    });

    await t.step("GET /api/tickets/inc/:inc - Get ticket by INC", async () => {
      const req = new Request(`http://localhost/api/tickets/inc/INC0002`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.ticket_id, testTicketId);
    });

    await t.step("PATCH /api/tickets/:id/status - Update Status", async () => {
      const req = new Request(`http://localhost/api/tickets/${testTicketId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" })
      });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/tickets/${testTicketId}`, { method: "GET" });
      const getRes = await handler(getReq);
      const ticketData = await getRes.json();
      assertEquals(ticketData.status, "in_progress");
    });

    await t.step("GET /api/tickets - Get all tickets", async () => {
      const req = new Request(`http://localhost/api/tickets`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.length, 1);
    });

    await t.step("POST /api/tickets/:id/comments - Add Comment", async () => {
      const req = new Request(`http://localhost/api/tickets/${testTicketId}/comments`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, message: "Checking logs" })
      });
      const res = await handler(req);
      assertEquals(res.status, 201);
      const data = await res.json();
      assertNotEquals(data.comment_id, undefined);
    });

    await t.step("DELETE /api/tickets/:id - Soft Delete Ticket", async () => {
      const req = new Request(`http://localhost/api/tickets/${testTicketId}`, { method: "DELETE" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/tickets/${testTicketId}`, { method: "GET" });
      const getRes = await handler(getReq);
      assertEquals(getRes.status, 404); // Should be deleted
    });

  },
  sanitizeResources: false,
  sanitizeOps: false
});
