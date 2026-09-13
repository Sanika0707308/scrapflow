import { jsonOk, withApiHandler, jsonBody } from "@/lib/api-handler";
import { listQuerySchema } from "@/lib/validation";
import { createPayment, listPayments } from "@/server/payments";

export const runtime = "nodejs";

export const GET = withApiHandler(async (request) => {
  const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonOk(await listPayments({ companyId: query.companyId, take: query.take }));
});

export const POST = withApiHandler(async (request) => {
  return jsonOk(await createPayment(await jsonBody(request)), 201);
});
