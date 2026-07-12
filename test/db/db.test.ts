import { assertEquals, assertNotEquals } from "@std/assert";
import { RowDataPacket } from "mysql2/promise";
import { getDbPool, testConnection } from "../../src/db/db_connector.ts";
import { clearTables, initializeDatabase } from "../../src/db/sql_table_creator.ts";
import {
  createTicket,
  getTicketById,
  updateTicketStatus,
  softDeleteTicket,
  restoreTicket,
  addComment,
  getCommentsByTicketId
} from "../../src/db/db_ticket.ts";

// Setup and teardown
const pool = getDbPool();

Deno.test({
  name: "DB Connection Test",
  async fn() {
    const isConnected = await testConnection();
    assertEquals(isConnected, true);
  },
  sanitizeResources: false,
  sanitizeOps: false
});

Deno.test({
  name: "DB Ticket Operations Test",
  async fn(t) {
    // 1. Initialize and clear DB to ensure clean state
    await initializeDatabase(pool);
    await clearTables(pool);
    
    // We need a dummy user first due to foreign key constraints on created_by
    await pool.query(
      `INSERT INTO users (username, password, first_name, last_name, email, role) 
       VALUES ('testuser', 'pass', 'Test', 'User', 'test@test.com', 'admin')`
    );
    const [userRows] = await pool.query<RowDataPacket[]>("SELECT user_id FROM users WHERE username = 'testuser'");
    const userId = userRows[0].user_id;

    let testTicketId: number;

    await t.step("createTicket", async () => {
      testTicketId = await createTicket(pool, {
        inc_number: "INC0001",
        created_by: userId,
        short_description: "System is down",
        priority: "high"
      });
      assertNotEquals(testTicketId, undefined);
      assertNotEquals(testTicketId, 0);
    });

    await t.step("getTicketById", async () => {
      const ticket = await getTicketById(pool, testTicketId);
      assertNotEquals(ticket, null);
      assertEquals(ticket?.inc_number, "INC0001");
      assertEquals(ticket?.priority, "high");
      assertEquals(ticket?.status, "open");
    });

    await t.step("updateTicketStatus", async () => {
      const success = await updateTicketStatus(pool, testTicketId, "in_progress");
      assertEquals(success, true);
      const ticket = await getTicketById(pool, testTicketId);
      assertEquals(ticket?.status, "in_progress");
    });

    await t.step("addComment and getComments", async () => {
      const commentId = await addComment(pool, {
        ticket_id: testTicketId,
        user_id: userId,
        message: "Working on it"
      });
      assertNotEquals(commentId, 0);

      const comments = await getCommentsByTicketId(pool, testTicketId);
      assertEquals(comments.length, 1);
      assertEquals(comments[0].message, "Working on it");
    });

    await t.step("softDeleteTicket and restoreTicket", async () => {
      const deleted = await softDeleteTicket(pool, testTicketId);
      assertEquals(deleted, true);

      let ticket = await getTicketById(pool, testTicketId);
      assertEquals(ticket, null); // Should be null since it's soft deleted

      const restored = await restoreTicket(pool, testTicketId);
      assertEquals(restored, true);

      ticket = await getTicketById(pool, testTicketId);
      assertNotEquals(ticket, null); // Should be found again
    });

  },
  // Ensure we close the pool after tests to allow Deno process to exit
  sanitizeResources: false,
  sanitizeOps: false
});
