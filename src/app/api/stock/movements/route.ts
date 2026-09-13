import { jsonOk, withApiHandler } from "@/lib/api-handler";
import { listQuerySchema } from "@/lib/validation";
import { listStockMovements } from "@/server/scrap-types";

export const runtime = "nodejs";

export const GET = withApiHandler(async (request) => {
  const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonOk(await listStockMovements({ scrapTypeId: query.scrapTypeId, take: query.take }));
});
