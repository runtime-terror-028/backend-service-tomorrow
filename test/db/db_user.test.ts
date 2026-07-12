import { assertEquals, assertNotEquals } from "@std/assert";
import { getDbPool } from "../../src/db/db_connector.ts";
import { clearTables, initializeDatabase } from "../../src/db/sql_table_creator.ts";
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
} from "../../src/db/db_user.ts";

const pool = getDbPool();

Deno.test({
  name: "DB User Operations Test",
  async fn(t) {
    // 1. Initialize and clear DB
    await initializeDatabase(pool);
    await clearTables(pool);

    let testUserId: number;

    await t.step("Create User", async () => {
      testUserId = await createUser(pool, {
        username: "johndoe",
        password: "securepassword",
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone_number: "1234567890",
        role: "engineer"
      });
      assertNotEquals(testUserId, undefined);
      assertNotEquals(testUserId, null);
    });

    await t.step("Get User By ID", async () => {
      const user = await getUserById(pool, testUserId);
      assertNotEquals(user, null);
      assertEquals(user?.username, "johndoe");
      assertEquals(user?.first_name, "John");
      assertEquals(user?.role, "engineer");
    });

    await t.step("Get User By Username", async () => {
      const user = await getUserByUsername(pool, "johndoe");
      assertNotEquals(user, null);
      assertEquals(user?.user_id, testUserId);
    });

    await t.step("Get User By Email", async () => {
      const user = await getUserByEmail(pool, "john.doe@example.com");
      assertNotEquals(user, null);
      assertEquals(user?.user_id, testUserId);
    });

    await t.step("Get All Users", async () => {
      const users = await getAllUsers(pool);
      assertEquals(users.length, 1);
      assertEquals(users[0].username, "johndoe");
    });

    await t.step("Update User Details", async () => {
      const success = await updateUser(pool, testUserId, {
        first_name: "Johnny",
        last_name: "Doe Jr."
      });
      assertEquals(success, true);

      const user = await getUserById(pool, testUserId);
      assertEquals(user?.first_name, "Johnny");
      assertEquals(user?.last_name, "Doe Jr.");
    });

    await t.step("Update User Role", async () => {
      const success = await updateUserRole(pool, testUserId, "admin");
      assertEquals(success, true);

      const user = await getUserById(pool, testUserId);
      assertEquals(user?.role, "admin");
    });

    await t.step("Deactivate User", async () => {
      const success = await deactivateUser(pool, testUserId);
      assertEquals(success, true);

      const user = await getUserById(pool, testUserId);
      assertEquals(Boolean(user?.is_active), false); 
    });

    await t.step("Activate User", async () => {
      const success = await activateUser(pool, testUserId);
      assertEquals(success, true);

      const user = await getUserById(pool, testUserId);
      assertEquals(Boolean(user?.is_active), true);
    });

    await t.step("Soft Delete User", async () => {
      const success = await softDeleteUser(pool, testUserId);
      assertEquals(success, true);

      const user = await getUserById(pool, testUserId);
      assertEquals(user, null); // Should be filtered out by `deleted_at IS NULL`
    });

    await t.step("Restore User", async () => {
      const success = await restoreUser(pool, testUserId);
      assertEquals(success, true);

      const user = await getUserById(pool, testUserId);
      assertNotEquals(user, null);
    });
  },
  sanitizeResources: false,
  sanitizeOps: false
});
