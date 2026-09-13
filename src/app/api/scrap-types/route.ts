import { jsonOk, withApiHandler, jsonBody } from "@/lib/api-handler";
import { createScrapType, listScrapTypes } from "@/server/scrap-types";

export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  return jsonOk(await listScrapTypes());
});

export const POST = withApiHandler(async (request) => {
  return jsonOk(await createScrapType(await jsonBody(request)), 201);
});
