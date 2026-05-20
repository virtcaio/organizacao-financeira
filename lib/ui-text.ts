export const LOADING_TEXT = {
  save: "Salvando…",
  delete: "Excluindo…",
  archive: "Arquivando…",
  validate: "Validando…",
  import: "Importando…",
  authenticate: "Entrando…",
  upload: "Enviando…",
} as const;

export type LoadingTextKey = keyof typeof LOADING_TEXT;
