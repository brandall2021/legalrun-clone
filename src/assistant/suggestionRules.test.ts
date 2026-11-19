import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUGGESTION_RULES,
  defaultSuggestionRecords,
  ruleValues,
  rulesFromRecords,
  suggestionForLabels,
  suggestionSummary,
} from "./suggestionRules";

describe("suggestion rules", () => {
  it("ships readable defaults for the seeded tags", () => {
    expect(DEFAULT_SUGGESTION_RULES.length).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_SUGGESTION_RULES.find((rule) => rule.label === "Traslado")).toMatchObject({
      template: "Presentación simple",
      state: "En trámite",
    });
  });

  it("parses records using the module column order", () => {
    const rules = rulesFromRecords([
      {
        id: "rule-1",
        values: ["Sugerencia para Sentencia", "Cuenta local", "18/11/2026", "Todos", "Todos", "Sentencia", "Sugerir", "No", "Escrito", "Oficio", "No", "Sentencia", "Firme"],
      },
    ]);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ id: "rule-1", label: "Sentencia", template: "Oficio", state: "Sentencia", substate: "Firme", automatic: false });
  });

  it("ignores blank labels, inactive rows and duplicates", () => {
    const rules = rulesFromRecords([
      { id: "a", values: ["", "", "", "", "", "  ", "", "Sí", "", "Oficio", "", "", ""] },
      { id: "b", values: ["", "", "", "", "", "Prueba", "Inactivo", "Sí", "", "Oficio", "", "Prueba", ""] },
      { id: "c", values: ["", "", "", "", "", "Pago", "Sugerir", "Sí", "", "Presentación simple", "", "Plan de Pagos", ""] },
      { id: "d", values: ["", "", "", "", "", "pago", "Sugerir", "No", "", "Oficio", "", "Prueba", ""] },
    ]);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ id: "c", label: "Pago", automatic: true });
  });

  it("returns an empty list when there is nothing to parse", () => {
    expect(rulesFromRecords([])).toEqual([]);
  });

  it("serializes a rule into the full module column set", () => {
    const values = ruleValues({ label: "Audiencia", template: "Oficio", state: "Prueba", substate: "A despacho", automatic: true });
    expect(values).toHaveLength(13);
    expect(values[5]).toBe("Audiencia");
    expect(values[7]).toBe("Sí");
    expect(values[9]).toBe("Oficio");
    expect(values[11]).toBe("Prueba");
    expect(values[12]).toBe("A despacho");
  });

  it("generates seed records for initialization", () => {
    const records = defaultSuggestionRecords();
    expect(records).toHaveLength(DEFAULT_SUGGESTION_RULES.length);
    expect(records[0].values[5]).toBe(DEFAULT_SUGGESTION_RULES[0].label);
  });

  it("suggests the first known label and ignores case differences", () => {
    const rules = [
      { label: "Sentencia", template: "Oficio", state: "Sentencia", substate: "", automatic: false },
      { label: "Traslado", template: "Presentación simple", state: "En trámite", substate: "", automatic: false },
    ];
    expect(suggestionForLabels(["Desconocida", "sentencia"], rules)?.label).toBe("Sentencia");
    expect(suggestionForLabels(["Desconocida"], rules)).toBeNull();
  });

  it("summarizes a suggestion with its optional substate", () => {
    expect(suggestionSummary({ label: "X", template: "Oficio", state: "Prueba", substate: "", automatic: false }))
      .toBe("estado «Prueba» · template «Oficio»");
    expect(suggestionSummary({ label: "X", template: "Oficio", state: "Prueba", substate: "A despacho", automatic: false }))
      .toBe("estado «Prueba» · subestado «A despacho» · template «Oficio»");
  });
});
