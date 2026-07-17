import { describe, expect, it } from "vitest";
import { nextRunDate } from "@/lib/recurring";

describe("nextRunDate", () => {
  it("daily/weekly somam o intervalo em dias", () => {
    expect(nextRunDate("2026-07-17", "daily", 1, null)).toBe("2026-07-18");
    expect(nextRunDate("2026-07-17", "daily", 10, null)).toBe("2026-07-27");
    expect(nextRunDate("2026-07-17", "weekly", 2, null)).toBe("2026-07-31");
  });

  it("monthly com dayOfMonth 31 clampa em fevereiro e volta pra 31 depois", () => {
    const fev = nextRunDate("2026-01-31", "monthly", 1, 31);
    expect(fev).toBe("2026-02-28");
    // O mês seguinte NÃO pode grudar no 28 — a âncora é 31.
    expect(nextRunDate(fev, "monthly", 1, 31)).toBe("2026-03-31");
  });

  it("sem âncora explícita, o dia corrente clampado drifta (por isso as actions materializam dayOfMonth)", () => {
    const fev = nextRunDate("2026-01-31", "monthly", 1, null);
    expect(fev).toBe("2026-02-28");
    // Comportamento documentado: sem dayOfMonth, mar volta a 28, não 31.
    expect(nextRunDate(fev, "monthly", 1, null)).toBe("2026-03-28");
  });

  it("yearly a partir de 29/02 bissexto clampa pra 28 no ano comum", () => {
    expect(nextRunDate("2028-02-29", "yearly", 1, 29)).toBe("2029-02-28");
  });

  it("interval 0 é tratado como 1", () => {
    expect(nextRunDate("2026-07-17", "monthly", 0, 17)).toBe("2026-08-17");
  });

  it("monthly com interval grande cruza o ano", () => {
    expect(nextRunDate("2026-11-15", "monthly", 14, 15)).toBe("2028-01-15");
  });
});
