import { z } from "zod";
import { validateEmail, validateGstin, validatePhoneNumber } from "@/lib/company-validation";

export const companyTypeSchema = z.enum(["SUPPLIER", "BUYER", "BOTH"]);
export const paymentDirectionSchema = z.enum(["IN", "OUT"]);
export const ledgerCategorySchema = z.enum(["RECEIVABLE", "PAYABLE"]);

const decimalInput = z.union([z.string(), z.number()]);

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  type: companyTypeSchema,
  contactPerson: z.string().trim().optional(),
  mobile: z.string().trim().superRefine((val, ctx) => {
    const res = validatePhoneNumber(val);
    if (!res.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error || "Invalid phone number",
      });
    }
  }),
  email: z
    .string()
    .trim()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;
      const res = validateEmail(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || "Invalid email address",
        });
      }
    }),
  gstNumber: z
    .string()
    .trim()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;
      const res = validateGstin(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || "Invalid GSTIN",
        });
      }
    }),
  address: z.string().trim().optional(),
});

export const companyUpdateSchema = companyCreateSchema.partial().extend({
  mobile: z
    .string()
    .trim()
    .optional()
    .superRefine((val, ctx) => {
      if (val === undefined) return;
      const res = validatePhoneNumber(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || "Invalid phone number",
        });
      }
    }),
});

export const scrapTypeCreateSchema = z.object({
  name: z.string().trim().min(1, "Scrap type name is required"),
  category: z.string().trim().min(1, "Category is required"),
  unit: z.string().trim().min(1).default("Tonne (MT)").optional(),
  openingStock: decimalInput.optional(),
  notes: z.string().trim().optional(),
});

export const scrapTypeUpdateSchema = z.object({
  name: z.string().trim().min(1, "Scrap type name cannot be empty").optional(),
  category: z.string().trim().min(1, "Category cannot be empty").optional(),
  unit: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional(),
});

export const documentItemSchema = z.object({
  scrapTypeId: z.string().min(1),
  quantity: decimalInput,
  rate: decimalInput,
  unit: z.string().optional(),
});

export const purchaseCreateSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseDate: z.coerce.date(),
  notes: z.string().optional(),
  amountPaid: decimalInput.optional(),
  paymentMethod: z.string().trim().optional(),
  paymentDate: z.coerce.date().optional(),
  items: z.array(documentItemSchema).min(1),
});

export const saleCreateSchema = z.object({
  buyerId: z.string().min(1, "Buyer is required"),
  saleDate: z.coerce.date(),
  notes: z.string().optional(),
  amountReceived: decimalInput.optional(),
  paymentMethod: z.string().trim().optional(),
  paymentDate: z.coerce.date().optional(),
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
