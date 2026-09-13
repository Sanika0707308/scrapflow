import { jsonOk, withApiHandler } from "@/lib/api-handler";
import { badRequest } from "@/lib/api-error";
import { listQuerySchema } from "@/lib/validation";
import { getCompanyLedger } from "@/server/queries";

export const runtime = "nodejs";

export const GET = withApiHandler(async (request) => {
  const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.companyId) throw badRequest("companyId is required");
  return jsonOk(await getCompanyLedger(query.companyId, query.category));
});
