import { jsonOk, withApiHandler } from "@/lib/api-handler";
import { getPayment } from "@/server/payments";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_request, context: Context) => {
  const { id } = await context.params;
  return jsonOk(await getPayment(id));
});
