import { z } from "zod";

/** Schema do JSON que esperamos do Claude ao processar uma fatura PDF. */
export const importedTransactionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em formato YYYY-MM-DD"),
  description: z.string().min(1).max(200),
  amount: z.number().positive("Valor precisa ser positivo"),
  category_id: z.string().uuid().nullable(),
  category_name: z.string().nullable(),
  installment_seq: z.number().int().positive().nullable().optional(),
  installment_total: z.number().int().positive().nullable().optional(),
  merchant_raw: z.string().nullable().optional(),
});

export type ImportedTransaction = z.infer<typeof importedTransactionSchema>;

export const cardMetadataSchema = z.object({
  issuer: z.string().nullable(),
  closing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  total_amount: z.number().nullable(),
});

export type CardMetadata = z.infer<typeof cardMetadataSchema>;

export const importPdfOutputSchema = z.object({
  transactions: z.array(importedTransactionSchema),
  card_metadata: cardMetadataSchema.nullable().optional(),
});

export type ImportPdfOutput = z.infer<typeof importPdfOutputSchema>;

/** Schema do JSON esperado do Claude ao ler a foto de um comprovante. */
export const ocrReceiptOutputSchema = z.object({
  amount: z.number().positive("Valor precisa ser positivo"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em formato YYYY-MM-DD")
    .nullable(),
  merchant: z.string().nullable(),
  description: z.string().min(1).max(200),
  category_id: z.string().uuid().nullable(),
  category_name: z.string().nullable(),
});

export type OcrReceiptOutput = z.infer<typeof ocrReceiptOutputSchema>;
