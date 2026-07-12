import { assertEquals, assertNotEquals } from "@std/assert";
import { handler } from "../../main.ts";
import { getDbPool } from "../../src/db/db_connector.ts";
import { clearTables, initializeDatabase } from "../../src/db/sql_table_creator.ts";

const pool = getDbPool();

Deno.test({
  name: "User API Routes Test",
  async fn(t) {
    // 1. Initialize and clear DB
    await initializeDatabase(pool);
    await clearTables(pool);

    let testUserId: number;

    await t.step("POST /api/users - Create User", async () => {
      const req = new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          username: "apiuser",
          password: "password123",
          first_name: "API",
          last_name: "User",
          email: "api.user@example.com",
          role: "customer"
        }),
      });
      const res = await handler(req);
      assertEquals(res.status, 201);
      const data = await res.json();
      assertNotEquals(data.user_id, undefined);
      testUserId = data.user_id;
    });

    await t.step("GET /api/users/:id - Get User By ID", async () => {
      const req = new Request(`http://localhost/api/users/${testUserId}`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.username, "apiuser");
      assertEquals(data.role, "customer");
    });

    await t.step("GET /api/users?username=... - Get User By Username", async () => {
      const req = new Request(`http://localhost/api/users?username=apiuser`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.user_id, testUserId);
    });

    await t.step("GET /api/users - Get All Users", async () => {
      const req = new Request(`http://localhost/api/users`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.length, 1);
    });

    await t.step("PATCH /api/users/:id - Update User", async () => {
      const req = new Request(`http://localhost/api/users/${testUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ first_name: "Updated API" })
      });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/users/${testUserId}`, { method: "GET" });
      const getRes = await handler(getReq);
      const userData = await getRes.json();
      assertEquals(userData.first_name, "Updated API");
    });

    await t.step("PATCH /api/users/:id/role - Update Role", async () => {
      const req = new Request(`http://localhost/api/users/${testUserId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" })
      });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/users/${testUserId}`, { method: "GET" });
      const getRes = await handler(getReq);
      const userData = await getRes.json();
      assertEquals(userData.role, "admin");
    });

    await t.step("POST /api/users/:id/deactivate - Deactivate User", async () => {
      const req = new Request(`http://localhost/api/users/${testUserId}/deactivate`, { method: "POST" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/users/${testUserId}`, { method: "GET" });
      const getRes = await handler(getReq);
      const userData = await getRes.json();
      assertEquals(Boolean(userData.is_active), false);
    });

    await t.step("POST /api/users/:id/activate - Activate User", async () => {
      const req = new Request(`http://localhost/api/users/${testUserId}/activate`, { method: "POST" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/users/${testUserId}`, { method: "GET" });
      const getRes = await handler(getReq);
      const userData = await getRes.json();
      assertEquals(Boolean(userData.is_active), true);
    });

    await t.step("DELETE /api/users/:id - Soft Delete User", async () => {
      const req = new Request(`http://localhost/api/users/${testUserId}`, { method: "DELETE" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/users/${testUserId}`, { method: "GET" });
      const getRes = await handler(getReq);
      assertEquals(getRes.status, 404);
    });

    await t.step("POST /api/users/:id/restore - Restore User", async () => {
      const req = new Request(`http://localhost/api/users/${testUserId}/restore`, { method: "POST" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/users/${testUserId}`, { method: "GET" });
      const getRes = await handler(getReq);
      assertEquals(getRes.status, 200);
    });
  },
  sanitizeResources: false,
  sanitizeOps: false
});
