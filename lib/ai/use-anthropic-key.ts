"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  clearAnthropicApiKey,
  getAnthropicApiKey,
  setAnthropicApiKey,
} from "./storage";

const STORAGE_EVENT = "anthropic-api-key-changed";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string | null {
  return getAnthropicApiKey();
}

function getServerSnapshot(): string | null {
  return null;
}

/** Hook que reativamente lê e escreve a API key da Anthropic em localStorage. */
export function useAnthropicKey() {
  const key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const loaded = typeof window !== "undefined";

  const save = useCallback((value: string) => {
    setAnthropicApiKey(value);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, []);

  const clear = useCallback(() => {
    clearAnthropicApiKey();
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, []);

  return { key, loaded, hasKey: !!key, save, clear };
}
