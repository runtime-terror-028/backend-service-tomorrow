import { Pool } from "mysql2/promise";

/**
 * Executes table creation queries to ensure the database schema is up-to-date.
 * @param pool The MySQL connection pool
 */
export async function initializeDatabase(pool: Pool) {
  try {
    const connection = await pool.getConnection();
    console.log("Starting database initialization...");

    // 1. Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone_number VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        role ENUM('super_admin', 'admin', 'engineer', 'customer') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_role (role)
      );
    `);
    console.log("Checked/Created table: users");

    // 2. Create tickets table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        ticket_id INT AUTO_INCREMENT PRIMARY KEY,
        inc_number VARCHAR(50) NOT NULL UNIQUE,
        status ENUM('open', 'in_progress', 'on_hold', 'resolved_complete', 'resolved_incomplete') DEFAULT 'open',
        is_assigned BOOLEAN DEFAULT FALSE,
        assigned_to INT NULL,
        created_by INT NOT NULL,
        short_description VARCHAR(255) NOT NULL,
        long_description TEXT,
        priority ENUM('low', 'medium', 'high') DEFAULT 'low',
        is_breached BOOLEAN DEFAULT FALSE,
        closing_note TEXT,
        date_closed TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_is_assigned (is_assigned)
      );
    `);
    console.log("Checked/Created table: tickets");

    // 3. Create comment table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS comment (
        comment_id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        date_time_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);
    console.log("Checked/Created table: comment");

    // 4. Create cmdb table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cmdb (
        asset_id INT AUTO_INCREMENT PRIMARY KEY,
        asset_name VARCHAR(255) NOT NULL,
        host_name VARCHAR(255),
        ip_address VARCHAR(45),
        mac_address VARCHAR(17),
        os_version VARCHAR(255),
        is_virtual BOOLEAN DEFAULT FALSE,
        spoc VARCHAR(255),
        description TEXT,
        is_operational BOOLEAN DEFAULT TRUE,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      );
    `);
    console.log("Checked/Created table: cmdb");

    // Insert demo data
    await insertDemoData(pool);

    connection.release();
    console.log("Database initialization completed successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

export async function insertDemoData(pool: Pool) {
  const connection = await pool.getConnection();
  try {
    console.log("Inserting demo data...");
    
    // Insert Users
    await connection.query(`
      INSERT IGNORE INTO users (username, password, first_name, last_name, email, role) VALUES
      ('admin', 'password123', 'System', 'Admin', 'admin@example.com', 'admin'),
      ('manager', 'password123', 'IT', 'Manager', 'manager@example.com', 'engineer'),
      ('user', 'password123', 'Demo', 'User', 'user@example.com', 'customer')
    `);
    
    // Insert CMDB Assets
    await connection.query(`
      INSERT IGNORE INTO cmdb (asset_name, host_name, ip_address, os_version, is_virtual, spoc) VALUES
      ('PROD-DB-01', 'db01.prod.local', '10.0.0.5', 'Ubuntu 22.04', FALSE, 'admin@example.com'),
      ('PROD-WEB-01', 'web01.prod.local', '10.0.0.10', 'Ubuntu 22.04', TRUE, 'manager@example.com'),
      ('PROD-WEB-02', 'web02.prod.local', '10.0.0.11', 'Ubuntu 22.04', TRUE, 'manager@example.com')
    `);

    console.log("Demo data inserted successfully.");
  } catch (error) {
    console.error("Failed to insert demo data:", error);
  } finally {
    connection.release();
  }
}

export async function deleteTables(pool: Pool) {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
    const [tables] = await connection.query("SHOW TABLES");
    for (const row of tables as Record<string, unknown>[]) {
      const tableName = Object.values(row)[0] as string;
      await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
      console.log(`Dropped table: ${tableName}`);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
  } finally {
    connection.release();
  }
}

export async function clearTables(pool: Pool) {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
    const [tables] = await connection.query("SHOW TABLES");
    for (const row of tables as Record<string, unknown>[]) {
      const tableName = Object.values(row)[0] as string;
      await connection.query(`TRUNCATE TABLE ${tableName}`);
      console.log(`Cleared data from table: ${tableName}`);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
  } finally {
    connection.release();
  }
}

export async function printSchemas(pool: Pool) {
  const connection = await pool.getConnection();
  try {
    const [tables] = await connection.query("SHOW TABLES");
    for (const row of tables as Record<string, unknown>[]) {
      const tableName = Object.values(row)[0] as string;
      console.log(`\nTable: ${tableName}`);
      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      printAsciiTable(columns as Record<string, unknown>[]);
    }
  } finally {
    connection.release();
  }
}

function printAsciiTable(data: Record<string, unknown>[]) {
  if (!data || data.length === 0) {
    console.log("No data available.");
    return;
  }
  const keys = Object.keys(data[0]);
  const colWidths = keys.map(key => {
    return Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length)
    );
  });

  const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  
  console.log(separator);
  console.log('|' + keys.map((key, i) => ` ${key.padEnd(colWidths[i])} `).join('|') + '|');
  console.log(separator);

  for (const row of data) {
    console.log('|' + keys.map((key, i) => ` ${String(row[key] ?? '').padEnd(colWidths[i])} `).join('|') + '|');
  }
  console.log(separator);
}
