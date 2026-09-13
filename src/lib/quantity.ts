import { Prisma } from "@/generated/prisma/client";

/**
 * Standard unit check: checks if a unit string represents Tonnes (MT).
 */
export function isTonneUnit(unit?: string | null): boolean {
  if (!unit) return false;
  const normalized = unit.trim().toLowerCase();
  return (
    normalized.includes("tonne") ||
    normalized.includes("mt") ||
    normalized === "t" ||
    normalized.includes("ton")
  );
}

/**
 * Convert quantity to canonical base unit (kg).
 * 1 tonne = 1000 kg.
 */
export function toKg(quantity: number | string | Prisma.Decimal, unit?: string | null): number {
  const qty = typeof quantity === "number" ? quantity : Number(quantity) || 0;
  if (isTonneUnit(unit)) {
    return Math.round(qty * 1000 * 1000) / 1000; // preserve 3 decimal precision
  }
  return Math.round(qty * 1000) / 1000;
}

/**
 * Convert quantity from canonical base unit (kg) to target unit.
 */
export function fromKg(qtyInKg: number | string | Prisma.Decimal, targetUnit?: string | null): number {
  const kg = typeof qtyInKg === "number" ? qtyInKg : Number(qtyInKg) || 0;
  if (isTonneUnit(targetUnit)) {
    return Math.round((kg / 1000) * 1000) / 1000;
  }
  return Math.round(kg * 1000) / 1000;
}

/**
 * Unified quantity formatter across all modules:
 * - 1 tonne = 1000 kg.
 * - When quantity is below 1000 kg, show it in kg (e.g. 750 kg → 750 kg).
 * - When quantity is 1000 kg or more, show it in tonnes (e.g. 1000 kg → 1 tonne, 2500 kg → 2.5 tonnes, 25000 kg → 25 tonnes).
 * - Supports negative numbers, decimals, and clean string formatting.
 */
export function formatQuantity(qtyInKg: number | string | Prisma.Decimal | null | undefined): string {
  if (qtyInKg === null || qtyInKg === undefined) return "0 kg";
  const num = typeof qtyInKg === "number" ? qtyInKg : Number(qtyInKg) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs < 1000) {
    // Show in kg
    const kgFormatted = parseFloat(abs.toFixed(3));
    return `${sign}${kgFormatted} kg`;
  } else {
    // Show in tonnes (1000 kg = 1 tonne)
    const tonnes = parseFloat((abs / 1000).toFixed(3));
    const unitLabel = tonnes === 1 ? "tonne" : "tonnes";
    return `${sign}${tonnes} ${unitLabel}`;
  }
}

/**
 * Line amount calculation helper.
 * When quantity and rate are entered in a specific unit:
 * e.g. 25 tonnes @ ₹40,000/tonne = ₹10,00,000.
 * e.g. 750 kg @ ₹40/kg = ₹30,000.
 */
export function calculateLineTotal(
  quantity: number,
  rate: number,
  unit?: string | null,
  rateUnit?: string | null,
): number {
  if (!quantity || !rate) return 0;

  const qtyUnitIsTonne = isTonneUnit(unit);
  const rateUnitIsTonne = isTonneUnit(rateUnit ?? unit);

  // If both are in tonnes or both in kg
  if (qtyUnitIsTonne === rateUnitIsTonne) {
    return quantity * rate;
  }

  // Quantity in kg, rate per tonne
  if (!qtyUnitIsTonne && rateUnitIsTonne) {
    return (quantity / 1000) * rate;
  }

  // Quantity in tonnes, rate per kg
  return quantity * 1000 * rate;
}

/**
 * Formats a transaction line item for display in tables and reports:
 * E.g.
 * 25,000 kg, ₹10,00,000, "Heavy Scrap" -> "25 tonnes Heavy Scrap @ ₹40,000/tonne"
 * 750 kg, ₹30,000, "Copper" -> "750 kg Copper @ ₹40/kg"
 */
export function formatLineItem(
  qtyInKg: number | string | Prisma.Decimal,
  amount: number | string | Prisma.Decimal,
  scrapTypeName: string,
): string {
  const kg = typeof qtyInKg === "number" ? qtyInKg : Number(qtyInKg) || 0;
  const amt = typeof amount === "number" ? amount : Number(amount) || 0;
  const formattedQty = formatQuantity(kg);

  if (Math.abs(kg) >= 1000) {
    const tonnes = Math.abs(kg) / 1000;
    const ratePerTonne = tonnes > 0 ? amt / tonnes : 0;
    const formattedRate = Math.round(ratePerTonne * 100) / 100;
    return `${formattedQty} ${scrapTypeName} @ ₹${formattedRate.toLocaleString("en-IN")}/tonne`;
  } else {
    const ratePerKg = Math.abs(kg) > 0 ? amt / Math.abs(kg) : 0;
    const formattedRate = Math.round(ratePerKg * 100) / 100;
    return `${formattedQty} ${scrapTypeName} @ ₹${formattedRate.toLocaleString("en-IN")}/kg`;
  }
}
