import { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface User {
  user_id: number;
  username: string;
  password?: string; // Often omitted when returned
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  is_active: boolean;
  role: 'super_admin' | 'admin' | 'engineer' | 'customer';
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UserInsert {
  username: string;
  password?: string; // Only needed if creating with password
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'engineer' | 'customer';
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  password?: string;
}

// --- User Creation ---

export async function createUser(pool: Pool, data: UserInsert): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO users (username, password, first_name, last_name, email, phone_number, role)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.username,
      data.password || 'default_password', // Should be hashed in a real scenario
      data.first_name,
      data.last_name,
      data.email,
      data.phone_number || null,
      data.role
    ]
  );
  return result.insertId;
}

// --- User Retrieval ---

export async function getUserById(pool: Pool, userId: number): Promise<User | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, username, first_name, last_name, email, phone_number, is_active, role, created_at, updated_at, deleted_at 
     FROM users WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  return (rows[0] as User) || null;
}

export async function getUserByUsername(pool: Pool, username: string): Promise<User | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, username, first_name, last_name, email, phone_number, is_active, role, created_at, updated_at, deleted_at 
     FROM users WHERE username = ? AND deleted_at IS NULL`,
    [username]
  );
  return (rows[0] as User) || null;
}

export async function getUserByEmail(pool: Pool, email: string): Promise<User | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, username, first_name, last_name, email, phone_number, is_active, role, created_at, updated_at, deleted_at 
     FROM users WHERE email = ? AND deleted_at IS NULL`,
    [email]
  );
  return (rows[0] as User) || null;
}

export async function getAllUsers(pool: Pool): Promise<User[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, username, first_name, last_name, email, phone_number, is_active, role, created_at, updated_at, deleted_at 
     FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );
  return rows as User[];
}

// --- User Updates ---

export async function updateUser(pool: Pool, userId: number, data: UserUpdate): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.first_name !== undefined) {
    fields.push("first_name = ?");
    values.push(data.first_name);
  }
  if (data.last_name !== undefined) {
    fields.push("last_name = ?");
    values.push(data.last_name);
  }
  if (data.phone_number !== undefined) {
    fields.push("phone_number = ?");
    values.push(data.phone_number);
  }
  if (data.password !== undefined) {
    fields.push("password = ?");
    values.push(data.password);
  }

  if (fields.length === 0) return false;

  values.push(userId);

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET ${fields.join(", ")} WHERE user_id = ? AND deleted_at IS NULL`,
    values
  );

  return result.affectedRows > 0;
}

export async function updateUserRole(pool: Pool, userId: number, role: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET role = ? WHERE user_id = ? AND deleted_at IS NULL`,
    [role, userId]
  );
  return result.affectedRows > 0;
}

export async function deactivateUser(pool: Pool, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET is_active = FALSE WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  return result.affectedRows > 0;
}

export async function activateUser(pool: Pool, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET is_active = TRUE WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  return result.affectedRows > 0;
}

// --- User Deletion (Soft Delete) ---

export async function softDeleteUser(pool: Pool, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  return result.affectedRows > 0;
}

export async function restoreUser(pool: Pool, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET deleted_at = NULL WHERE user_id = ? AND deleted_at IS NOT NULL`,
    [userId]
  );
  return result.affectedRows > 0;
}
