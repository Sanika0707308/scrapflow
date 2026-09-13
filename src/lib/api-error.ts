import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function badRequest(message: string, details?: unknown) {
  return new ApiError(400, message, details);
}

export function notFound(message: string) {
  return new ApiError(404, message);
}

export function conflict(message: string) {
  return new ApiError(409, message);
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, details: error.details ?? null }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A record with that unique value already exists." }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
