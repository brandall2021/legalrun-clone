export type TemplateFieldOption = { key: string; label: string };

export const STANDARD_TEMPLATE_FIELDS: TemplateFieldOption[] = [
  { key: "number", label: "Nro. juicio" },
  { key: "expediente", label: "Expediente / CUIJ" },
  { key: "title", label: "Carátula" },
  { key: "claimant", label: "Demandante" },
  { key: "defendant", label: "Demandado" },
  { key: "type", label: "Tipo de caso" },
  { key: "year", label: "Año" },
  { key: "amount", label: "Monto del juicio" },
  { key: "state", label: "Estado judicial" },
  { key: "substate", label: "Subestado judicial" },
  { key: "jurisdiction", label: "Jurisdicción" },
  { key: "court", label: "Juzgado" },
  { key: "secretary", label: "Secretaría" },
  { key: "judge", label: "Juez/a" },
  { key: "process", label: "Tipo de proceso" },
  { key: "portfolio", label: "Portfolio" },
  { key: "responsible", label: "Responsable" },
  { key: "created", label: "Fecha de alta" },
  { key: "lastUpdate", label: "Última actualización" },
  { key: "lastOrder", label: "Último proveído" },
  { key: "location", label: "Ubicación actual" },
];

const VARIABLE_PATTERN_SOURCE = "\\{\\{\\s*([A-Za-z0-9_]+)\\s*\\}\\}";

function variablePattern() {
  return new RegExp(VARIABLE_PATTERN_SOURCE, "g");
}

export function extractTemplateVariables(body: string) {
  const found: string[] = [];
  for (const match of body.matchAll(variablePattern())) {
    const key = match[1];
    if (!found.includes(key)) found.push(key);
  }
  return found;
}

export function renderTemplate(body: string, values: Record<string, string>) {
  const missing: string[] = [];
  const text = body.replace(variablePattern(), (_token, key: string) => {
    const value = String(values[key] ?? "").trim();
    if (!value) {
      if (!missing.includes(key)) missing.push(key);
      return `{{${key}}}`;
    }
    return value;
  });
  return { text, missing };
}

export function insertTemplateVariable(body: string, key: string, selectionStart: number, selectionEnd: number) {
  const from = Math.max(0, Math.min(selectionStart, body.length));
  const to = Math.max(from, Math.min(selectionEnd, body.length));
  const token = `{{${key}}}`;
  return {
    body: `${body.slice(0, from)}${token}${body.slice(to)}`,
    caret: from + token.length,
  };
}

export function templateCaseValues(fields: Record<string, string>, today = new Date()) {
  return {
    ...fields,
    fecha: today.toLocaleDateString("es-AR"),
  };
}

export function templateVariableLabel(key: string, options: TemplateFieldOption[]) {
  return options.find((option) => option.key === key)?.label || key;
}
