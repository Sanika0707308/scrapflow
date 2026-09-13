import { NextResponse } from "next/server";
import { badRequest, handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function jsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body");
  }
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function withApiHandler<TContext>(
  handler: (request: Request, context: TContext) => Promise<Response>,
) {
  return async (request: Request, context: TContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
