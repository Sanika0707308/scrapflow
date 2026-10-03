import { jsonOk, withApiHandler, jsonBody } from "@/lib/api-handler";
import { deleteScrapType, getScrapType, updateScrapType } from "@/server/scrap-types";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_request, context: Context) => {
  const { id } = await context.params;
  return jsonOk(await getScrapType(id));
});

export const PATCH = withApiHandler(async (request, context: Context) => {
  const { id } = await context.params;
  return jsonOk(await updateScrapType(id, await jsonBody(request)));
});

export const DELETE = withApiHandler(async (_request, context: Context) => {
  const { id } = await context.params;
  return jsonOk(await deleteScrapType(id));
});

