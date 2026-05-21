import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const RECEIPTS_BUCKET = "receipts";

/** Mapeia mime-type aceito → extensão de arquivo. */
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXT_BY_MIME);

function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados.");
  }
  // Service role: bypassa RLS. O bucket é privado — acesso só por aqui (server).
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Sobe um comprovante no bucket privado. Retorna a key (path) do objeto. */
export async function uploadReceipt(userId: string, file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type] ?? "jpg";
  const key = `${userId}/${randomUUID()}.${ext}`;
  const supabase = storageClient();
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });
  if (error) {
    throw new Error(`Falha no upload do comprovante: ${error.message}`);
  }
  return key;
}

/** Gera uma URL assinada temporária pro objeto (TTL curto). */
export async function signedReceiptUrl(
  key: string,
  ttlSeconds = 300,
): Promise<string> {
  const supabase = storageClient();
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(key, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Falha ao gerar URL assinada: ${error?.message ?? "desconhecido"}`);
  }
  return data.signedUrl;
}
