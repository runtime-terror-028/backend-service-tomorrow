import { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface Ticket {
  ticket_id: number;
  inc_number: string;
  status: 'open' | 'in_progress' | 'on_hold' | 'resolved_complete' | 'resolved_incomplete';
  is_assigned: boolean;
  assigned_to: number | null;
  created_by: number;
  short_description: string;
  long_description: string | null;
  priority: 'low' | 'medium' | 'high';
  is_breached: boolean;
  closing_note: string | null;
  date_closed: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TicketInsert {
  inc_number: string;
  created_by: number;
  short_description: string;
  long_description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TicketUpdate {
  short_description?: string;
  long_description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface Comment {
  comment_id: number;
  ticket_id: number;
  user_id: number;
  message: string;
  date_time_created: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CommentInsert {
  ticket_id: number;
  user_id: number;
  message: string;
}

// --- Ticket Creation & Core Operations ---

export async function createTicket(pool: Pool, data: TicketInsert): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO tickets (inc_number, created_by, short_description, long_description, priority)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.inc_number,
      data.created_by,
      data.short_description,
      data.long_description || null,
      data.priority || 'low'
    ]
  );
  return result.insertId;
}

export async function getTicketById(pool: Pool, ticketId: number): Promise<Ticket | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tickets WHERE ticket_id = ? AND deleted_at IS NULL`,
    [ticketId]
  );
  return (rows[0] as Ticket) || null;
}

export async function getTicketByIncNumber(pool: Pool, incNumber: string): Promise<Ticket | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tickets WHERE inc_number = ? AND deleted_at IS NULL`,
    [incNumber]
  );
  return (rows[0] as Ticket) || null;
}

// --- Ticket Listing & Filtering ---

export async function getAllTickets(pool: Pool): Promise<Ticket[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tickets WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );
  return rows as Ticket[];
}

export async function getTicketsByStatus(pool: Pool, status: string): Promise<Ticket[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tickets WHERE status = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
    [status]
  );
  return rows as Ticket[];
}

export async function getTicketsByAssignee(pool: Pool, assigneeId: number): Promise<Ticket[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tickets WHERE assigned_to = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
    [assigneeId]
  );
  return rows as Ticket[];
}

export async function getTicketsByCreator(pool: Pool, creatorId: number): Promise<Ticket[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tickets WHERE created_by = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
    [creatorId]
  );
  return rows as Ticket[];
}

// --- Ticket Updates ---

export async function updateTicketDetails(
  pool: Pool, 
  ticketId: number, 
  data: TicketUpdate
): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.short_description !== undefined) {
    fields.push("short_description = ?");
    values.push(data.short_description);
  }
  if (data.long_description !== undefined) {
    fields.push("long_description = ?");
    values.push(data.long_description);
  }
  if (data.priority !== undefined) {
    fields.push("priority = ?");
    values.push(data.priority);
  }

  if (fields.length === 0) return false;

  values.push(ticketId);

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE tickets SET ${fields.join(", ")} WHERE ticket_id = ? AND deleted_at IS NULL`,
    values
  );

  return result.affectedRows > 0;
}

export async function updateTicketStatus(
  pool: Pool,
  ticketId: number,
  status: string,
  closingNote: string | null = null
): Promise<boolean> {
  let query = `UPDATE tickets SET status = ?`;
  const values: (string | number | null)[] = [status];

  const isClosing = status === 'resolved_complete' || status === 'resolved_incomplete';

  if (isClosing) {
    query += `, closing_note = ?, date_closed = CURRENT_TIMESTAMP`;
    values.push(closingNote);
  }

  query += ` WHERE ticket_id = ? AND deleted_at IS NULL`;
  values.push(ticketId);

  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.affectedRows > 0;
}

export async function assignTicket(pool: Pool, ticketId: number, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE tickets SET assigned_to = ?, is_assigned = TRUE WHERE ticket_id = ? AND deleted_at IS NULL`,
    [userId, ticketId]
  );
  return result.affectedRows > 0;
}

export async function unassignTicket(pool: Pool, ticketId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE tickets SET assigned_to = NULL, is_assigned = FALSE WHERE ticket_id = ? AND deleted_at IS NULL`,
    [ticketId]
  );
  return result.affectedRows > 0;
}

export async function markTicketBreached(pool: Pool, ticketId: number, isBreached: boolean = true): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE tickets SET is_breached = ? WHERE ticket_id = ? AND deleted_at IS NULL`,
    [isBreached, ticketId]
  );
  return result.affectedRows > 0;
}

// --- Ticket Deletion (Soft Delete) ---

export async function softDeleteTicket(pool: Pool, ticketId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE tickets SET deleted_at = CURRENT_TIMESTAMP WHERE ticket_id = ? AND deleted_at IS NULL`,
    [ticketId]
  );
  return result.affectedRows > 0;
}

export async function restoreTicket(pool: Pool, ticketId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE tickets SET deleted_at = NULL WHERE ticket_id = ? AND deleted_at IS NOT NULL`,
    [ticketId]
  );
  return result.affectedRows > 0;
}

// --- Ticket Comments ---

export async function addComment(pool: Pool, data: CommentInsert): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO comment (ticket_id, user_id, message) VALUES (?, ?, ?)`,
    [data.ticket_id, data.user_id, data.message]
  );
  return result.insertId;
}

export async function getCommentsByTicketId(pool: Pool, ticketId: number): Promise<Comment[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM comment WHERE ticket_id = ? AND deleted_at IS NULL ORDER BY date_time_created ASC`,
    [ticketId]
  );
  return rows as Comment[];
}

export async function getCommentById(pool: Pool, commentId: number): Promise<Comment | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM comment WHERE comment_id = ? AND deleted_at IS NULL`,
    [commentId]
  );
  return (rows[0] as Comment) || null;
}

export async function updateComment(pool: Pool, commentId: number, message: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE comment SET message = ? WHERE comment_id = ? AND deleted_at IS NULL`,
    [message, commentId]
  );
  return result.affectedRows > 0;
}

export async function softDeleteComment(pool: Pool, commentId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE comment SET deleted_at = CURRENT_TIMESTAMP WHERE comment_id = ? AND deleted_at IS NULL`,
    [commentId]
  );
  return result.affectedRows > 0;
}
