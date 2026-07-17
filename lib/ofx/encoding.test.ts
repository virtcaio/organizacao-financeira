import { describe, expect, it } from "vitest";
import { detectEncoding } from "@/lib/ofx/encoding";

describe("detectEncoding", () => {
  it("detecta CHARSET:1252 do header OFX 1.x", () => {
    const buf = Buffer.from("OFXHEADER:100\nCHARSET:1252\n\n<OFX>", "ascii");
    expect(detectEncoding(buf)).toBe("windows-1252");
  });

  it("preserva acentos de banco BR em latin-1 quando decodificado com o encoding detectado", () => {
    const header = "OFXHEADER:100\nCHARSET:1252\n\n";
    const body = "Padaria São João";
    const buf = Buffer.concat([
      Buffer.from(header, "ascii"),
      Buffer.from(body, "latin1"),
    ]);
    const enc = detectEncoding(buf.subarray(0, 200));
    expect(enc).toBe("windows-1252");
    const decoded = new TextDecoder(enc).decode(buf);
    expect(decoded).toContain("Padaria São João");
  });

  it("detecta encoding do prólogo XML (OFX 2.x)", () => {
    const buf = Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><OFX>', "ascii");
    expect(detectEncoding(buf)).toBe("windows-1252");
  });

  it("default é utf-8", () => {
    expect(detectEncoding(Buffer.from("<OFX>", "ascii"))).toBe("utf-8");
  });
});
