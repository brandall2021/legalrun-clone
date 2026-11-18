import { describe, expect, it } from "vitest";
import { buildSemaforoSummary, filterSemaforoItems, toSemaforoBucket } from "./semaforo";

describe("semaforo helpers", () => {
  it("maps current activity priority rules into UI buckets", () => {
    expect(toSemaforoBucket({ priority: "Sin movimientos", daysWithoutMovement: null })).toBe("sin-movimientos");
    expect(toSemaforoBucket({ priority: "Alta", daysWithoutMovement: 80 })).toBe("alta");
    expect(toSemaforoBucket({ priority: "Media", daysWithoutMovement: 35 })).toBe("media");
    expect(toSemaforoBucket({ priority: "Baja", daysWithoutMovement: 8 })).toBe("baja");
  });

  it("builds summary counts and filters by bucket, search and dashboard filters", () => {
    const items = [
      { priority: "Sin movimientos", daysWithoutMovement: null, amount: "$ 0,00", state: "En trámite", jurisdiction: "Capital", number: "1", title: "Alpha", lastMovement: "Sin movimientos registrados" },
      { priority: "Alta", daysWithoutMovement: 80, amount: "$ 100,00", state: "Pendiente", jurisdiction: "Capital", number: "2", title: "Beta", lastMovement: "Demanda" },
      { priority: "Media", daysWithoutMovement: 35, amount: "$ 1.250,00", state: "En trámite", jurisdiction: "Provincia", number: "3", title: "Gamma", lastMovement: "Traslado" },
    ];

    expect(buildSemaforoSummary(items)).toEqual({ sinMovimientos: 1, alta: 1, media: 1, baja: 0, total: 3 });
    expect(filterSemaforoItems(items, { bucket: "alta", search: "beta", jurisdiction: "Capital" })).toHaveLength(1);
    expect(filterSemaforoItems(items, { bucket: "all", search: "", state: "En trámite", minAmount: "1000" })).toEqual([items[2]]);
  });

  it("matches accented visible text with an unaccented search query", () => {
    const items = [
      { priority: "Sin movimientos", daysWithoutMovement: null, amount: "$ 0,00", state: "En trámite", jurisdiction: "Capital", number: "1", title: "Alpha", lastMovement: "Sin movimientos registrados" },
      { priority: "Alta", daysWithoutMovement: 80, amount: "$ 100,00", state: "Pendiente", jurisdiction: "Capital", number: "2", title: "Beta", lastMovement: "Demanda" },
    ];

    expect(filterSemaforoItems(items, { bucket: "all", search: "tramite" })).toEqual([items[0]]);
  });
});
