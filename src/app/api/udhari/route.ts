import { jsonOk, withApiHandler } from "@/lib/api-handler";
import { getUdhari } from "@/server/queries";

export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  return jsonOk(await getUdhari());
});
