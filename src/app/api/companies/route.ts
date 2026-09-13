import { jsonOk, withApiHandler, jsonBody } from "@/lib/api-handler";
import { createCompany, listCompanies } from "@/server/companies";

export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  return jsonOk(await listCompanies());
});

export const POST = withApiHandler(async (request) => {
  return jsonOk(await createCompany(await jsonBody(request)), 201);
});
