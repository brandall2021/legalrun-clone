export type SuggestionRule = {
  id?: string;
  values?: string[];
  label: string;
  template: string;
  state: string;
  substate: string;
  automatic: boolean;
};

export const SUGGESTION_MODULE_KEY = "client/configuracion/suggested_movements@v2";

export const DEFAULT_SUGGESTION_RULES: SuggestionRule[] = [
  { label: "Traslado", template: "Presentación simple", state: "En trámite", substate: "", automatic: false },
  { label: "Sentencia", template: "Presentación simple", state: "Sentencia", substate: "", automatic: false },
  { label: "Audiencia", template: "Oficio", state: "Prueba", substate: "", automatic: false },
  { label: "Perención", template: "Presentación simple", state: "Finalizado", substate: "", automatic: false },
  { label: "Embargo", template: "Presentación simple", state: "En trámite", substate: "", automatic: false },
  { label: "Pago", template: "Presentación simple", state: "Plan de Pagos", substate: "", automatic: false },
  { label: "Prueba", template: "Oficio", state: "Prueba", substate: "", automatic: false },
  { label: "Ejecución", template: "Presentación simple", state: "En trámite", substate: "", automatic: false },
];

const COLUMN = {
  title: 0,
  user: 1,
  date: 2,
  portal: 3,
  portfolio: 4,
  label: 5,
  action: 6,
  automatic: 7,
  documentType: 8,
  template: 9,
  initialDocument: 10,
  state: 11,
  substate: 12,
};

const INACTIVE_VALUES = ["no", "inactivo", "inactiva", "false"];

function isInactive(value: string | undefined) {
  return INACTIVE_VALUES.includes(String(value || "").trim().toLowerCase());
}

function todayLabel() {
  return new Date().toLocaleDateString("es-AR");
}

export function rulesFromRecords(records: Array<{ id?: string; values?: string[] }>): SuggestionRule[] {
  const rules: SuggestionRule[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    const values = Array.isArray(record.values) ? record.values : [];
    const label = String(values[COLUMN.label] || "").trim();
    if (!label || isInactive(values[COLUMN.action])) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({
      id: record.id,
      values,
      label,
      template: String(values[COLUMN.template] || "").trim(),
      state: String(values[COLUMN.state] || "").trim(),
      substate: String(values[COLUMN.substate] || "").trim(),
      automatic: !isInactive(values[COLUMN.automatic]),
    });
  }
  return rules;
}

export function ruleValues(rule: SuggestionRule): string[] {
  return [
    `Sugerencia para ${rule.label}`,
    "Cuenta local",
    todayLabel(),
    "Todos",
    "Todos",
    rule.label,
    "Sugerir",
    rule.automatic ? "Sí" : "No",
    "Escrito",
    rule.template,
    "No",
    rule.state,
    rule.substate,
  ];
}

export function defaultSuggestionRecords() {
  return DEFAULT_SUGGESTION_RULES.map((rule) => ({ values: ruleValues(rule) }));
}

export function suggestionForLabels(labels: string[], rules: SuggestionRule[]): SuggestionRule | null {
  for (const label of labels) {
    const match = rules.find((rule) => rule.label.toLowerCase() === label.toLowerCase());
    if (match) return match;
  }
  return null;
}

export function suggestionSummary(rule: SuggestionRule) {
  const parts = [`estado «${rule.state || "sin estado"}»`];
  if (rule.substate) parts.push(`subestado «${rule.substate}»`);
  parts.push(`template «${rule.template || "sin template"}»`);
  return parts.join(" · ");
}
