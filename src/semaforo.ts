export type SemaforoBucket = "sin-movimientos" | "alta" | "media" | "baja";

type SemaforoItem = {
  priority: string;
  daysWithoutMovement: number | null;
};

type SemaforoFilterItem = SemaforoItem & {
  amount: string;
  state: string;
  jurisdiction: string;
  number: string;
  title: string;
  lastMovement: string;
};

function parseAmount(value = "") {
  const cleaned = String(value).replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function toSemaforoBucket(item: SemaforoItem): SemaforoBucket {
  if (item.daysWithoutMovement === null) return "sin-movimientos";

  const priority = String(item.priority || "").trim().toLowerCase();
  if (priority === "sin movimientos") return "sin-movimientos";
  if (priority === "alta") return "alta";
  if (priority === "media") return "media";
  return "baja";
}

export function buildSemaforoSummary(items: SemaforoItem[]) {
  return items.reduce((summary, item) => {
    const bucket = toSemaforoBucket(item);
    if (bucket === "sin-movimientos") summary.sinMovimientos += 1;
    if (bucket === "alta") summary.alta += 1;
    if (bucket === "media") summary.media += 1;
    if (bucket === "baja") summary.baja += 1;
    summary.total += 1;
    return summary;
  }, { sinMovimientos: 0, alta: 0, media: 0, baja: 0, total: 0 });
}

export function filterSemaforoItems<T extends SemaforoFilterItem>(
  items: T[],
  options: { bucket: "all" | SemaforoBucket; search: string; state?: string; jurisdiction?: string; minAmount?: string },
) {
  const search = normalizeSearchText(options.search.trim());

  return items.filter((item) => {
    if (options.bucket !== "all" && toSemaforoBucket(item) !== options.bucket) return false;
    if (options.state && item.state !== options.state) return false;
    if (options.jurisdiction && item.jurisdiction !== options.jurisdiction) return false;
    if (options.minAmount && parseAmount(item.amount) < Number(options.minAmount)) return false;
    if (!search) return true;

    return normalizeSearchText(`${item.number} ${item.title} ${item.state} ${item.jurisdiction} ${item.lastMovement} ${item.priority}`).includes(search);
  });
}
