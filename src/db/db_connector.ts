import mysql from "mysql2/promise";

// Initialize a connection pool using environment variables
export const pool = mysql.createPool({
  host: Deno.env.get("DB_HOST") || "127.0.0.1",
  port: Number(Deno.env.get("DB_PORT")) || 3306,
  user: Deno.env.get("DB_USER") || "root",
  password: Deno.env.get("DB_PASSWORD") || "",
  database: Deno.env.get("DB_NAME") || "service_tomorrow",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Returns the MySQL connection pool.
 */
export function getDbPool() {
  return pool;
}

/**
 * Utility function to test the database connection.
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Successfully connected to the database.");
    connection.release();
    return true;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    return false;
  }
}
