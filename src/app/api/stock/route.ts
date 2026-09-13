import { jsonOk, withApiHandler } from "@/lib/api-handler";
import { listStock } from "@/server/scrap-types";

export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  return jsonOk(await listStock());
});
