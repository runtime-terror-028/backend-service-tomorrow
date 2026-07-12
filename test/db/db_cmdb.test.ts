import { assertEquals, assertNotEquals } from "@std/assert";
import { getDbPool } from "../../src/db/db_connector.ts";
import { clearTables, initializeDatabase } from "../../src/db/sql_table_creator.ts";
import {
  createAsset,
  getAssetById,
  getAllAssets,
  searchAssets,
  updateAssetDetails,
  softDeleteAsset,
  restoreAsset
} from "../../src/db/db_cmdb.ts";

const pool = getDbPool();

Deno.test({
  name: "DB CMDB Operations Test",
  async fn(t) {
    // 1. Initialize and clear DB
    await initializeDatabase(pool);
    await clearTables(pool);

    let testAssetId: number;

    await t.step("Create Asset", async () => {
      testAssetId = await createAsset(pool, {
        asset_name: "Web Server 01",
        host_name: "web-01.internal",
        ip_address: "192.168.1.10",
        mac_address: "00:1A:2B:3C:4D:5E",
        os_version: "Ubuntu 22.04",
        is_virtual: true,
        spoc: "admin@company.com",
        description: "Primary web server"
      });
      assertNotEquals(testAssetId, undefined);
      assertNotEquals(testAssetId, null);
    });

    await t.step("Get Asset By ID", async () => {
      const asset = await getAssetById(pool, testAssetId);
      assertNotEquals(asset, null);
      assertEquals(asset?.asset_name, "Web Server 01");
      assertEquals(asset?.host_name, "web-01.internal");
      assertEquals(asset?.spoc, "admin@company.com");
      assertEquals(Boolean(asset?.is_virtual), true);
      assertEquals(Boolean(asset?.is_operational), true);
    });

    await t.step("Get All Assets", async () => {
      const assets = await getAllAssets(pool);
      assertEquals(assets.length, 1);
      assertEquals(assets[0].asset_name, "Web Server 01");
    });

    await t.step("Search Assets - Exact Match", async () => {
      const assets = await searchAssets(pool, { ip_address: "192.168.1.10" });
      assertEquals(assets.length, 1);
      assertEquals(assets[0].asset_id, testAssetId);
    });

    await t.step("Search Assets - Partial Match String", async () => {
      const assets = await searchAssets(pool, { asset_name: "Web" });
      assertEquals(assets.length, 1);
      assertEquals(assets[0].asset_id, testAssetId);
    });

    await t.step("Search Assets - No Match", async () => {
      const assets = await searchAssets(pool, { ip_address: "10.0.0.1" });
      assertEquals(assets.length, 0);
    });

    await t.step("Update Asset Details", async () => {
      const success = await updateAssetDetails(pool, testAssetId, {
        ip_address: "192.168.1.11",
        is_operational: false
      });
      assertEquals(success, true);

      const asset = await getAssetById(pool, testAssetId);
      assertEquals(asset?.ip_address, "192.168.1.11");
      assertEquals(Boolean(asset?.is_operational), false);
    });

    await t.step("Soft Delete Asset", async () => {
      const success = await softDeleteAsset(pool, testAssetId);
      assertEquals(success, true);

      const asset = await getAssetById(pool, testAssetId);
      assertEquals(asset, null); // Should be filtered out
    });

    await t.step("Restore Asset", async () => {
      const success = await restoreAsset(pool, testAssetId);
      assertEquals(success, true);

      const asset = await getAssetById(pool, testAssetId);
      assertNotEquals(asset, null);
    });
  },
  sanitizeResources: false,
  sanitizeOps: false
});
