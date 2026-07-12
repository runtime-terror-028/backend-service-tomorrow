import { getDbPool } from "./src/db/db_connector.ts";
import { initializeDatabase, deleteTables, clearTables, printSchemas } from "./src/db/sql_table_creator.ts";

/**
 * Main function to set up or modify the database.
 */
async function runSetup() {
  const args = Deno.args;
  const isCreate = args.includes("--create-table");
  const isDelete = args.includes("--delete-table");
  const isClear = args.includes("--clear-table");

  if (!isCreate && !isDelete && !isClear) {
    console.log("Please provide one of the following flags:");
    console.log("  --create-table : Create database tables");
    console.log("  --delete-table : Delete all tables and their data");
    console.log("  --clear-table  : Clear data from all tables but keep the schema");
    Deno.exit(1);
  }

  // Warning/Confirmation for destructive operations
  if (isDelete || isClear) {
    const action = isDelete ? "DELETE ALL TABLES" : "CLEAR ALL TABLE DATA";
    // \x1b[31m is red color, \x1b[0m resets it
    console.log(`\x1b[31mWARNING: You are about to ${action}.\x1b[0m`);
    console.log(`\x1b[31mThis is a destructive action intended for development only.\x1b[0m`);
    const confirmation = prompt(`Type 'yes' to proceed:`);
    if (confirmation !== 'yes') {
      console.log("Operation cancelled.");
      Deno.exit(0);
    }
  }

  const pool = getDbPool();
  try {
    if (isDelete) {
      console.log("Connecting to database to delete tables...");
      await deleteTables(pool);
      console.log("Tables deleted successfully.");
    }

    if (isClear) {
      console.log("Connecting to database to clear table data...");
      await clearTables(pool);
      console.log("Table data cleared successfully.");
    }

    if (isCreate) {
      console.log("Connecting to database for setup...");
      await initializeDatabase(pool);
      console.log("Database setup successfully completed.");
    }

    console.log("\n--- Current Database Schemas ---");
    await printSchemas(pool);

  } catch (error) {
    console.error("Error during database operations:", error);
    Deno.exit(1);
  } finally {
    // Ensure the connection pool is closed so the script can exit
    await pool.end();
  }
}

// Run the setup if this script is executed directly
if (import.meta.main) {
  runSetup();
}
