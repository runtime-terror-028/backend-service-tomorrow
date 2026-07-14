import { getDbPool } from "./db_connector.ts";

export async function insertMockCmdbData() {
    const pool = await getDbPool();
    const connection = await pool.getConnection();
    
    try {
        console.log("Inserting mock CMDB data...");
        
        const mockServers = [
            { asset_name: 'PROD-DB-02', host_name: 'db02.prod.local', ip_address: '10.0.0.6', os_version: 'Ubuntu 22.04', is_virtual: false, spoc: 'admin@example.com' },
            { asset_name: 'DEV-WEB-01', host_name: 'web01.dev.local', ip_address: '10.0.1.10', os_version: 'Ubuntu 22.04', is_virtual: true, spoc: 'developer@example.com' },
            { asset_name: 'DEV-WEB-02', host_name: 'web02.dev.local', ip_address: '10.0.1.11', os_version: 'Ubuntu 22.04', is_virtual: true, spoc: 'developer@example.com' },
            { asset_name: 'QA-DB-01', host_name: 'db01.qa.local', ip_address: '10.0.2.5', os_version: 'Windows Server 2022', is_virtual: true, spoc: 'qa@example.com' },
            { asset_name: 'PROD-CACHE-01', host_name: 'cache01.prod.local', ip_address: '10.0.0.20', os_version: 'Alpine Linux', is_virtual: true, spoc: 'admin@example.com' },
            { asset_name: 'PROD-ROUTER-01', host_name: 'router01.prod.local', ip_address: '10.0.0.1', os_version: 'Cisco IOS', is_virtual: false, spoc: 'netadmin@example.com' },
            { asset_name: 'STAGING-APP-01', host_name: 'app01.staging.local', ip_address: '10.0.3.15', os_version: 'RHEL 9', is_virtual: true, spoc: 'developer@example.com' }
        ];

        for (const server of mockServers) {
            await connection.query(`
                INSERT IGNORE INTO cmdb (asset_name, host_name, ip_address, os_version, is_virtual, spoc) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [server.asset_name, server.host_name, server.ip_address, server.os_version, server.is_virtual, server.spoc]);
        }

        console.log("Mock CMDB data inserted successfully.");
    } catch (error) {
        console.error("Failed to insert mock CMDB data:", error);
    } finally {
        connection.release();
    }
}

// Allow script to be run directly via CLI
if (import.meta.main) {
    await insertMockCmdbData();
    Deno.exit(0);
}
