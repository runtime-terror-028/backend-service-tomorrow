import { getDbPool } from "../db/db_connector.ts";
import {
  jsonResponse,
  createdResponse,
  badRequest,
  notFound,
  serverError
} from "./api_utils.ts";
import {
  createAsset,
  getAssetById,
  getAllAssets,
  searchAssets,
  updateAssetDetails,
  softDeleteAsset,
  restoreAsset
} from "../db/db_cmdb.ts";

export async function handleCmdbRoutes(req: Request, url: URL): Promise<Response> {
  const method = req.method;
  const path = url.pathname;
  const pool = getDbPool();

  try {
    if (path.startsWith("/api/cmdb")) {
      const parts = path.split("/").filter(Boolean);
      // parts = ["api", "cmdb", ...]
      
      // GET /api/cmdb
      if (method === "GET" && parts.length === 2) {
        // If there are search params, use searchAssets, else use getAllAssets
        const searchParams: Record<string, any> = {};
        for (const [key, value] of url.searchParams.entries()) {
          searchParams[key] = value;
        }

        let assets;
        if (Object.keys(searchParams).length > 0) {
          assets = await searchAssets(pool, searchParams);
        } else {
          assets = await getAllAssets(pool);
        }
        
        return jsonResponse(assets);
      }
      
      // POST /api/cmdb
      if (method === "POST" && parts.length === 2) {
        const body = await req.json();
        const id = await createAsset(pool, body);
        return createdResponse({ asset_id: id });
      }

      // Individual Asset routes: /api/cmdb/:id/...
      if (parts.length >= 3) {
        const assetId = parseInt(parts[2], 10);
        if (isNaN(assetId)) return badRequest("Invalid asset ID");

        // GET /api/cmdb/:id
        if (method === "GET" && parts.length === 3) {
          const asset = await getAssetById(pool, assetId);
          return asset ? jsonResponse(asset) : notFound("Asset not found");
        }

        // PATCH /api/cmdb/:id
        if (method === "PATCH" && parts.length === 3) {
          const body = await req.json();
          const success = await updateAssetDetails(pool, assetId, body);
          return success ? jsonResponse({ success }) : notFound("Asset not found or no changes");
        }

        // DELETE /api/cmdb/:id
        if (method === "DELETE" && parts.length === 3) {
          const success = await softDeleteAsset(pool, assetId);
          return success ? jsonResponse({ success }) : notFound("Asset not found");
        }

        // Sub-routes for /api/cmdb/:id/...
        if (parts.length === 4) {
          const action = parts[3];
          
          // POST /api/cmdb/:id/restore
          if (method === "POST" && action === "restore") {
            const success = await restoreAsset(pool, assetId);
            return success ? jsonResponse({ success }) : notFound("Asset not found");
          }
        }
      }
    }

    return notFound("Endpoint not mapped");
  } catch (error: unknown) {
    console.error("API Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return serverError(msg);
  }
}
