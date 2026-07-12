import { assertEquals, assertNotEquals } from "@std/assert";
import { handler } from "../../main.ts";
import { getDbPool } from "../../src/db/db_connector.ts";
import { clearTables, initializeDatabase } from "../../src/db/sql_table_creator.ts";

const pool = getDbPool();

Deno.test({
  name: "CMDB API Routes Test",
  async fn(t) {
    // 1. Initialize and clear DB to ensure clean state
    await initializeDatabase(pool);
    await clearTables(pool);
    
    let testAssetId: number;

    await t.step("POST /api/cmdb - Create an asset", async () => {
      const req = new Request("http://localhost/api/cmdb", {
        method: "POST",
        body: JSON.stringify({
          asset_name: "DB Server 01",
          ip_address: "10.0.0.50",
          spoc: "dbadmin@company.com"
        }),
      });
      const res = await handler(req);
      assertEquals(res.status, 201);
      const data = await res.json();
      assertNotEquals(data.asset_id, undefined);
      testAssetId = data.asset_id;
    });

    await t.step("GET /api/cmdb/:id - Get an asset", async () => {
      const req = new Request(`http://localhost/api/cmdb/${testAssetId}`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.asset_name, "DB Server 01");
      assertEquals(data.spoc, "dbadmin@company.com");
    });

    await t.step("PATCH /api/cmdb/:id - Update an asset", async () => {
      const req = new Request(`http://localhost/api/cmdb/${testAssetId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_operational: false })
      });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/cmdb/${testAssetId}`, { method: "GET" });
      const getRes = await handler(getReq);
      const data = await getRes.json();
      assertEquals(data.is_operational, 0); // MySQL BOOLEAN is TINYINT(1) i.e. 0 or 1
    });

    await t.step("GET /api/cmdb - Get all assets", async () => {
      const req = new Request(`http://localhost/api/cmdb`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.length, 1);
    });

    await t.step("GET /api/cmdb?ip_address=10.0.0.50 - Search assets", async () => {
      const req = new Request(`http://localhost/api/cmdb?ip_address=10.0.0.50`, { method: "GET" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.length, 1);
      assertEquals(data[0].asset_id, testAssetId);
    });

    await t.step("DELETE /api/cmdb/:id - Soft Delete Asset", async () => {
      const req = new Request(`http://localhost/api/cmdb/${testAssetId}`, { method: "DELETE" });
      const res = await handler(req);
      assertEquals(res.status, 200);
      
      const getReq = new Request(`http://localhost/api/cmdb/${testAssetId}`, { method: "GET" });
      const getRes = await handler(getReq);
      assertEquals(getRes.status, 404); // Should be deleted
    });

  },
  sanitizeResources: false,
  sanitizeOps: false
});
