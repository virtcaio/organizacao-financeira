"use client";

import { useEffect, useState, useCallback } from "react";
import {
  clearAnthropicApiKey,
  getAnthropicApiKey,
  setAnthropicApiKey,
} from "./storage";

const STORAGE_EVENT = "anthropic-api-key-changed";

/** Hook que reativamente lê e escreve a API key da Anthropic em localStorage. */
export function useAnthropicKey() {
  const [key, setKeyState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setKeyState(getAnthropicApiKey());
    setLoaded(true);

    function onChange() {
      setKeyState(getAnthropicApiKey());
    }
    window.addEventListener(STORAGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const save = useCallback((value: string) => {
    setAnthropicApiKey(value);
    setKeyState(value.trim());
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, []);

  const clear = useCallback(() => {
    clearAnthropicApiKey();
    setKeyState(null);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, []);

  return { key, loaded, hasKey: !!key, save, clear };
}
