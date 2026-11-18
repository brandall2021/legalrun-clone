export type TagRule = { label: string; keywords: string[] };

export type TagDetection = { label: string; matches: string[] };

export type TagSuggestion = { label: string; template: string; state: string };

export const DEFAULT_TAG_RULES: TagRule[] = [
  { label: "Traslado", keywords: ["traslado", "correr traslado"] },
  { label: "Sentencia", keywords: ["sentencia", "fallo", "resuelve"] },
  { label: "Audiencia", keywords: ["audiencia", "comparendo"] },
  { label: "Perención", keywords: ["perención", "caducidad", "perimir"] },
  { label: "Embargo", keywords: ["embargo", "medida cautelar", "inhibición"] },
  { label: "Pago", keywords: ["pago", "acreditación", "depósito", "transferencia"] },
  { label: "Prueba", keywords: ["prueba", "testimonial", "pericia", "documental"] },
  { label: "Ejecución", keywords: ["ejecución", "mandamiento", "ejecutivo"] },
];

const DEFAULT_SUGGESTIONS: Record<string, { template: string; state: string }> = {
  Traslado: { template: "Presentación simple", state: "En trámite" },
  Sentencia: { template: "Presentación simple", state: "Sentencia" },
  Audiencia: { template: "Oficio", state: "Prueba" },
  Perención: { template: "Presentación simple", state: "Finalizado" },
  Embargo: { template: "Presentación simple", state: "En trámite" },
  Pago: { template: "Presentación simple", state: "Plan de Pagos" },
  Prueba: { template: "Oficio", state: "Prueba" },
  Ejecución: { template: "Presentación simple", state: "En trámite" },
};

export function normalizeForTags(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectTags(text: string, rules: TagRule[] = DEFAULT_TAG_RULES): TagDetection[] {
  const normalized = normalizeForTags(text);
  if (!normalized) return [];
  const detections: TagDetection[] = [];
  for (const rule of rules) {
    const matches: string[] = [];
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeForTags(keyword);
      if (normalizedKeyword && normalized.includes(normalizedKeyword)) matches.push(keyword);
    }
    if (matches.length) detections.push({ label: rule.label, matches });
  }
  return detections.sort((a, b) => b.matches.length - a.matches.length || a.label.localeCompare(b.label, "es"));
}

export function suggestionForTags(labels: string[], suggestions = DEFAULT_SUGGESTIONS): TagSuggestion | null {
  for (const label of labels) {
    const match = suggestions[label];
    if (match) return { label, template: match.template, state: match.state };
  }
  return null;
}
