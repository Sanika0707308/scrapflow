import { jsonOk, withApiHandler, jsonBody } from "@/lib/api-handler";
import { listQuerySchema } from "@/lib/validation";
import { createSale, listSales } from "@/server/sales";

export const runtime = "nodejs";

export const GET = withApiHandler(async (request) => {
  const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonOk(await listSales({ companyId: query.companyId, take: query.take }));
});

export const POST = withApiHandler(async (request) => {
  return jsonOk(await createSale(await jsonBody(request)), 201);
});
