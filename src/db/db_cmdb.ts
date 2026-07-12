import { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface CmdbAsset {
  asset_id: number;
  asset_name: string;
  host_name: string | null;
  ip_address: string | null;
  mac_address: string | null;
  os_version: string | null;
  is_virtual: boolean;
  spoc: string | null;
  description: string | null;
  is_operational: boolean;
  date_added: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CmdbAssetInsert {
  asset_name: string;
  host_name?: string;
  ip_address?: string;
  mac_address?: string;
  os_version?: string;
  is_virtual?: boolean;
  spoc?: string;
  description?: string;
  is_operational?: boolean;
}

export interface CmdbAssetUpdate {
  asset_name?: string;
  host_name?: string;
  ip_address?: string;
  mac_address?: string;
  os_version?: string;
  is_virtual?: boolean;
  spoc?: string;
  description?: string;
  is_operational?: boolean;
}

// --- Creation & Retrieval ---

export async function createAsset(pool: Pool, data: CmdbAssetInsert): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO cmdb (asset_name, host_name, ip_address, mac_address, os_version, is_virtual, spoc, description, is_operational)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.asset_name,
      data.host_name || null,
      data.ip_address || null,
      data.mac_address || null,
      data.os_version || null,
      data.is_virtual !== undefined ? data.is_virtual : false,
      data.spoc || null,
      data.description || null,
      data.is_operational !== undefined ? data.is_operational : true
    ]
  );
  return result.insertId;
}

export async function getAssetById(pool: Pool, assetId: number): Promise<CmdbAsset | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM cmdb WHERE asset_id = ? AND deleted_at IS NULL`,
    [assetId]
  );
  return (rows[0] as CmdbAsset) || null;
}

export async function getAllAssets(pool: Pool): Promise<CmdbAsset[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM cmdb WHERE deleted_at IS NULL ORDER BY date_added DESC`
  );
  return rows as CmdbAsset[];
}

export async function searchAssets(pool: Pool, searchParams: Record<string, any>): Promise<CmdbAsset[]> {
  const validKeys = [
    'asset_name', 'host_name', 'ip_address', 'mac_address', 
    'os_version', 'is_virtual', 'spoc', 'is_operational'
  ];
  
  let query = `SELECT * FROM cmdb WHERE deleted_at IS NULL`;
  const values: any[] = [];
  
  for (const [key, value] of Object.entries(searchParams)) {
    if (validKeys.includes(key) && value !== undefined && value !== null) {
      if (typeof value === 'string') {
        // Use LIKE for strings to allow partial matches if needed, but exact match is safer for some.
        // We'll use exact match for simple query params, but could expand later.
        query += ` AND ${key} LIKE ?`;
        values.push(`%${value}%`);
      } else {
        query += ` AND ${key} = ?`;
        values.push(value);
      }
    }
  }
  
  query += ` ORDER BY date_added DESC`;
  
  const [rows] = await pool.query<RowDataPacket[]>(query, values);
  return rows as CmdbAsset[];
}

// --- Updates ---

export async function updateAssetDetails(
  pool: Pool, 
  assetId: number, 
  data: CmdbAssetUpdate
): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];

  const validKeys: (keyof CmdbAssetUpdate)[] = [
    'asset_name', 'host_name', 'ip_address', 'mac_address', 
    'os_version', 'is_virtual', 'spoc', 'description', 'is_operational'
  ];

  for (const key of validKeys) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return false;

  values.push(assetId);

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE cmdb SET ${fields.join(", ")} WHERE asset_id = ? AND deleted_at IS NULL`,
    values
  );

  return result.affectedRows > 0;
}

// --- Deletion (Soft Delete) ---

export async function softDeleteAsset(pool: Pool, assetId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE cmdb SET deleted_at = CURRENT_TIMESTAMP WHERE asset_id = ? AND deleted_at IS NULL`,
    [assetId]
  );
  return result.affectedRows > 0;
}

export async function restoreAsset(pool: Pool, assetId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE cmdb SET deleted_at = NULL WHERE asset_id = ? AND deleted_at IS NOT NULL`,
    [assetId]
  );
  return result.affectedRows > 0;
}
