import { describe, expect, it } from "vitest";
import { canonicalJson, hashInput } from "@/lib/ai/dedup-core";

describe("canonicalJson", () => {
  it("ordena chaves — mesma 'pergunta lógica' gera o mesmo JSON", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("preserva a ordem de arrays e ordena chaves em objetos aninhados", () => {
    expect(canonicalJson([{ z: 1, a: [2, 1] }, null, "x"])).toBe(
      '[{"a":[2,1],"z":1},null,"x"]',
    );
  });

  it("serializa primitivos como JSON.stringify", () => {
    expect(canonicalJson("abc")).toBe('"abc"');
    expect(canonicalJson(3.14)).toBe("3.14");
    expect(canonicalJson(null)).toBe("null");
  });
});

describe("hashInput", () => {
  it("string e Buffer equivalentes têm o mesmo hash", () => {
    expect(hashInput("abc")).toBe(hashInput(Buffer.from("abc", "utf8")));
  });

  it("é determinístico e sensível ao conteúdo", () => {
    expect(hashInput("abc")).toBe(hashInput("abc"));
    expect(hashInput("abc")).not.toBe(hashInput("abd"));
    expect(hashInput("abc")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("garante o dedup de ai_run: objetos com chaves fora de ordem batem no cache", () => {
    const a = hashInput(canonicalJson({ items: [{ id: "1", type: "expense" }] }));
    const b = hashInput(canonicalJson({ items: [{ type: "expense", id: "1" }] }));
    expect(a).toBe(b);
  });
});
