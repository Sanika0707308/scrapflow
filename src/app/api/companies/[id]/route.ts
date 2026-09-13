import { jsonOk, withApiHandler, jsonBody } from "@/lib/api-handler";
import { deleteCompany, getCompany, updateCompany } from "@/server/companies";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_request, context: Context) => {
  const { id } = await context.params;
  return jsonOk(await getCompany(id));
});

export const PATCH = withApiHandler(async (request, context: Context) => {
  const { id } = await context.params;
  return jsonOk(await updateCompany(id, await jsonBody(request)));
});

export const DELETE = withApiHandler(async (_request, context: Context) => {
  const { id } = await context.params;
  return jsonOk(await deleteCompany(id));
});
