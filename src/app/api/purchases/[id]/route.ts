import { jsonOk, withApiHandler } from "@/lib/api-handler";
import { getPurchase } from "@/server/purchases";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_request, context: Context) => {
  const { id } = await context.params;
  return jsonOk(await getPurchase(id));
});
