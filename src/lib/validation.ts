import { z } from "zod";

export const companyTypeSchema = z.enum(["SUPPLIER", "BUYER", "BOTH"]);
export const paymentDirectionSchema = z.enum(["IN", "OUT"]);
export const ledgerCategorySchema = z.enum(["RECEIVABLE", "PAYABLE"]);

const decimalInput = z.union([z.string(), z.number()]);

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1),
  type: companyTypeSchema,
  contactPerson: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  gstNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export const companyUpdateSchema = companyCreateSchema.partial();

export const scrapTypeCreateSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().optional(),
  unit: z.string().trim().min(1).default("Tonne (MT)"),
  openingStock: decimalInput.optional(),
  notes: z.string().optional(),
});

export const scrapTypeUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().optional(),
  unit: z.string().trim().min(1).optional(),
  notes: z.string().optional(),
});

export const documentItemSchema = z.object({
  scrapTypeId: z.string().min(1),
  quantity: decimalInput,
  rate: decimalInput,
  unit: z.string().optional(),
});

export const purchaseCreateSchema = z.object({
  supplierId: z.string().min(1),
  purchaseDate: z.coerce.date(),
  notes: z.string().optional(),
  amountPaid: decimalInput.optional(),
  items: z.array(documentItemSchema).min(1),
});

export const saleCreateSchema = z.object({
  buyerId: z.string().min(1),
  saleDate: z.coerce.date(),
  notes: z.string().optional(),
  amountReceived: decimalInput.optional(),
  items: z.array(documentItemSchema).min(1),
});

export const paymentCreateSchema = z.object({
  companyId: z.string().min(1),
  direction: paymentDirectionSchema,
  paymentDate: z.coerce.date(),
  amount: decimalInput,
  method: z.string().trim().optional(),
  notes: z.string().optional(),
  purchaseId: z.string().min(1).optional(),
  saleId: z.string().min(1).optional(),
});

export const listQuerySchema = z.object({
  companyId: z.string().optional(),
  scrapTypeId: z.string().optional(),
  category: ledgerCategorySchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});
