import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  monthEndFromStart,
  monthEndIso,
  monthStartIso,
  monthStartIsoBack,
  todayIso,
} from "@/lib/date";

// Todos os casos passam um instante fixo — independem do fuso da máquina/CI.
describe("todayIso (APP_TIMEZONE=America/Sao_Paulo)", () => {
  it("ainda é dia 31 em BRT quando UTC já virou o mês (bug #10)", () => {
    // 01/08 01:00 UTC = 31/07 22:00 em São Paulo
    expect(todayIso(new Date("2026-08-01T01:00:00Z"))).toBe("2026-07-31");
  });

  it("meio-dia UTC é o mesmo dia", () => {
    expect(todayIso(new Date("2026-07-17T12:00:00Z"))).toBe("2026-07-17");
  });
});

describe("boundaries de mês", () => {
  it("monthStartIso/monthEndIso respeitam o fuso na virada", () => {
    const at = new Date("2026-08-01T01:00:00Z"); // ainda julho em BRT
    expect(monthStartIso(at)).toBe("2026-07-01");
    expect(monthEndIso(at)).toBe("2026-07-31");
  });

  it("monthEndFromStart cobre fevereiro bissexto e não-bissexto", () => {
    expect(monthEndFromStart("2028-02-01")).toBe("2028-02-29");
    expect(monthEndFromStart("2026-02-01")).toBe("2026-02-28");
    expect(monthEndFromStart("2026-04-01")).toBe("2026-04-30");
  });

  it("monthStartIsoBack cruza o ano", () => {
    expect(monthStartIsoBack(2, new Date("2026-01-15T12:00:00Z"))).toBe("2025-11-01");
    expect(monthStartIsoBack(0, new Date("2026-07-17T12:00:00Z"))).toBe("2026-07-01");
  });
});

describe("addDaysIso", () => {
  it("soma dias cruzando mês e ano", () => {
    expect(addDaysIso("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-07-17", 14)).toBe("2026-07-31");
  });
});
