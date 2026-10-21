import { z } from "zod";

export const resourceSchema = z
  .object({
    kodamCode: z.string().trim().min(1).max(40),
    type: z.string().trim().min(2).max(80),
    name: z.string().trim().min(2).max(160),
    quantity: z.coerce.number().int().min(0).max(10_000_000),
    deployed: z.coerce.number().int().min(0).max(10_000_000),
    status: z.enum(["SIAP", "OPERASI", "PERAWATAN", "TIDAK_SIAP"]),
  })
  .refine((value) => value.deployed <= value.quantity, {
    message: "Jumlah dikerahkan tidak boleh melebihi jumlah tersedia",
    path: ["deployed"],
  });

export const reportSchema = z.object({
  kodamCode: z.string().trim().max(40).nullable().optional(),
  type: z.string().trim().min(2).max(100),
  title: z.string().trim().min(5).max(240),
  reportDate: z.coerce.date(),
  summary: z.string().trim().min(10).max(10_000),
});

export const reportWorkflowSchema = z.object({
  action: z.enum(["PUBLISH", "ARCHIVE", "RETURN_TO_DRAFT"]),
});

export const reportFilterSchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    kodamCode: z.string().trim().max(40).optional(),
    type: z.string().trim().max(100).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    q: z.string().trim().max(120).optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "Tanggal awal tidak boleh melewati tanggal akhir",
    path: ["from"],
  });

export const userManagementSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR_PUSDALOPS", "OPERATOR_KODAM", "ANALYST", "PIMPINAN"]),
  kodamCode: z.string().trim().max(40).nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});
