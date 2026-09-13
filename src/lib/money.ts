import { Prisma, type PaymentStatus } from "@/generated/prisma/client";
import { badRequest } from "@/lib/api-error";

export const Decimal = Prisma.Decimal;
export type DecimalValue = Prisma.Decimal;

export function toDecimal(value: string | number | Prisma.Decimal, field: string) {
  try {
    const amount = new Decimal(value);
    if (!amount.isFinite()) {
      throw new Error("not finite");
    }
    return amount;
  } catch {
    throw badRequest(`${field} must be a valid number`);
  }
}

export function money(value: string | number | Prisma.Decimal, field: string) {
  const amount = toDecimal(value, field).toDecimalPlaces(2);
  if (amount.lt(0)) {
    throw badRequest(`${field} cannot be negative`);
  }
  return amount;
}

export function quantity(value: string | number | Prisma.Decimal, field: string) {
  const amount = toDecimal(value, field).toDecimalPlaces(3);
  if (amount.lte(0)) {
    throw badRequest(`${field} must be greater than zero`);
  }
  return amount;
}

export function nonNegativeQuantity(value: string | number | Prisma.Decimal, field: string) {
  const amount = toDecimal(value, field).toDecimalPlaces(3);
  if (amount.lt(0)) {
    throw badRequest(`${field} cannot be negative`);
  }
  return amount;
}

export function paymentStatus(total: Prisma.Decimal, outstanding: Prisma.Decimal): PaymentStatus {
  if (outstanding.lte(0)) return "PAID";
  if (outstanding.eq(total)) return "UNPAID";
  return "PARTIAL";
}

export function lineAmount(qty: Prisma.Decimal, rate: Prisma.Decimal) {
  return qty.mul(rate).toDecimalPlaces(2);
}
