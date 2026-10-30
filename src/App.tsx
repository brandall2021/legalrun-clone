import { useEffect, useMemo, useState } from "react";

type CaseField = { key: string; label: string; value: string; select?: boolean; inputType?: string };
type CaseRecord = { id: string; fields: Record<string, string>; createdAt?: string; updatedAt?: string; followed?: boolean };
type LocalUser = { id: string; email: string };

const groups = [
  {
    title: "Trabajo diario",
    items: [
      ["Inicio", "⌂", "#/client/home_estudio_juridico"],
      ["Agenda", "▦", "#/client/agenda"],
      ["Inbox", "✉", "#/client/inbox"],
      ["Novedades de juicios", "◷", "#/client/novedades_juicio"],
      ["Búsqueda de casos", "⌕", "#/client/searchinf"],
      ["Seguimiento", "★", "#/client/followed"],
    ],
  },
  {
    title: "Reportes",
    items: [
      ["Stock (altas y bajas)", "▤", "#/client/dashboard/stock"],
      ["Sin movimientos", "◌", "#/client/dashboard/movimientos"],
      ["Estado procesal", "◉", "#/client/dashboard/state"],
      ["Impulso procesal", "↗", "#/client/dashboard/impulse"],
      ["Gastos y honorarios", "∑", "#/client/dashboard/finance"],
      ["Reportes", "▥", "#/admin/report"],
      ["Mis reportes", "▧", "#/admin/mis_reportes"],
    ],
  },
  {
    title: "Administración",
    items: [
      ["Alta de casos", "+", "#/client/administration"],
      ["Baja de casos", "−", "#/client/bajajuicio"],
      ["Actualización masiva", "⇧", "#/client/admmassive"],
      ["Importar casos", "⇩", "#/client/cases/import"],
      ["Nuevos juicios", "✦", "#/client/nuevos_juicios"],
      ["Historial de mantenimiento", "◴", "#/client/history"],
      ["Estado de documentos", "▣", "#/client/document_state"],
    ],
  },
  {
    title: "Configuración",
    items: [
      ["Estado judicial", "⚙", "#/client/configuracion/estado"],
      ["Subestado judicial", "⚙", "#/client/configuracion/subEstado"],
      ["Usuarios", "⚙", "#/client/configuracion/usersAbogado"],
      ["Portfolios", "⚙", "#/client/configuracion/portfolio"],
      ["Jurisdicciones y organismos", "⚙", "#/client/configuracion/jurisdicciones-organismos"],
      ["Campos comodines", "⚙", "#/client/configuracion/campos-comodines"],
      ["Templates", "⚙", "#/client/configuracion/template"],
      ["Tipos de medida cautelar", "⚙", "#/client/configuracion/tipo-medida-cautelar"],
      ["Tipos de gastos", "⚙", "#/client/configuracion/tipo_gasto"],
      ["Tipos de honorarios", "⚙", "#/client/configuracion/tipo_honorario"],
      ["Actualización automática", "⚙", "#/client/configuracion/actualizacion_automatica"],
      ["Etiquetas con IA", "⚙", "#/client/configuracion/label_with_ia"],
      ["Sugerencias", "⚙", "#/client/configuracion/suggested_movements"],
      ["Cambiar contraseña", "⚿", "#/client/configuracion/security"],
      ["Copia de seguridad", "⇩", "#/client/configuracion/backup"],
    ],
  },
];

const initialFields: CaseField[] = [
  { key: "id", label: "ID", value: "10482" },
  { key: "title", label: "Carátula", value: "Expediente de ejemplo 1842/2025" },
  { key: "number", label: "Nro. juicio", value: "1842/2025" },
  { key: "amount", label: "Monto juicio", value: "$ 1.250.000,00" },
  { key: "type", label: "Tipo de caso", value: "Cobro ejecutivo" },
  { key: "year", label: "Año", value: "2025" },
  { key: "claimant", label: "Demandante", value: "Empresa de ejemplo S.A." },
  { key: "defendant", label: "Demandado", value: "Persona de prueba" },
  { key: "expediente", label: "Expediente / CUIJ", value: "1842/25" },
  { key: "state", label: "Estado judicial", value: "En trámite", select: true },
  { key: "substate", label: "Subestado judicial", value: "Pendiente" },
  { key: "created", label: "Fecha de alta", value: "12/02/2025" },
  { key: "portfolio", label: "Portfolio", value: "Cobros" },
  { key: "responsible", label: "Responsable", value: "" },
  { key: "jurisdiction", label: "Jurisdicción", value: "Capital" },
  { key: "court", label: "Juzgado", value: "Juzgado Civil y Comercial de Ejemplo" },
  { key: "secretary", label: "Secretaría", value: "Secretaría 2" },
  { key: "judge", label: "Juez/a", value: "—" },
  { key: "process", label: "Tipo proceso", value: "Ejecutivo" },
  { key: "lastUpdate", label: "Última actualización", value: "18/03/2025" },
  { key: "lastOrder", label: "Último proveído", value: "A despacho" },
  { key: "location", label: "Ubicación actual", value: "Mesa de entradas" },
  { key: "custom1", label: "Comodín 1", value: "—" },
  { key: "custom2", label: "Comodín 2", value: "—" },
];

const tabs = ["Ficha", "Novedades", "Información de juicio", "Intervinientes", "Documentación", "Presentaciones", "Gestión extrajudicial", "Gastos", "Honorarios", "Acuerdos", "Mensajes", "Notas"];

const actions = [
  ["✦", "Asistente IA"],
  ["▤", "Redactar mensaje"],
  ["▧", "Crear informe"],
  ["↑", "Presentar documento"],
  ["◫", "Drive"],
  ["▣", "Documentos adjuntos"],
  ["∑", "Calcular"],
  ["▤", "Imprimir"],
  ["⇩", "Exportar"],
];

type ModuleDefinition = { description: string; columns: string[]; rows: string[][]; action?: string };

const moduleDefinitions: Record<string, ModuleDefinition> = {
  "#/client/agenda": { description: "Tareas y vencimientos del estudio.", columns: ["Fecha", "Hora", "Actividad", "Expediente", "Responsable", "Estado"], rows: [["21/04/2025", "09:30", "Revisar vencimiento", "1842/2025", "Equipo demo", "Pendiente"], ["22/04/2025", "12:00", "Preparar presentación", "932/2024", "Equipo demo", "En curso"]], action: "Nueva actividad" },
  "#/client/inbox": { description: "Mensajes y tareas recibidas.", columns: ["Fecha", "Asunto", "Remitente", "Expediente", "Estado"], rows: [["18/03/2025", "Documentación recibida", "Cliente de prueba", "1842/2025", "Nuevo"], ["17/03/2025", "Consulta sobre el caso", "Cliente de ejemplo", "932/2024", "Leído"]], action: "Nuevo mensaje" },
  "#/client/novedades_juicio": { description: "Últimos movimientos judiciales detectados.", columns: ["Fecha", "Expediente", "Movimiento", "Juzgado", "Estado"], rows: [["18/03/2025", "1842/2025", "Se provee presentación", "Juzgado Civil · Turno 2", "Nuevo"], ["15/03/2025", "932/2024", "Pase a despacho", "Juzgado de ejemplo", "Revisado"]] },
  "#/client/dashboard/stock": { description: "Altas y bajas de casos en el período.", columns: ["Período", "Altas", "Bajas", "Total"], rows: [["Marzo 2025", "18", "3", "428"], ["Febrero 2025", "12", "4", "413"]] },
  "#/client/dashboard/movimientos": { description: "Casos que no registran movimientos recientes.", columns: ["Expediente", "Carátula", "Último movimiento", "Días sin movimiento"], rows: [["932/2024", "Caso ficticio A c/ Caso ficticio B", "12/01/2025", "65"], ["771/2023", "Caso ficticio C s/ Daños", "02/02/2025", "44"]] },
  "#/client/dashboard/state": { description: "Distribución de expedientes por estado procesal.", columns: ["Estado", "Cantidad", "Porcentaje"], rows: [["En trámite", "312", "73%"], ["Pendiente", "84", "20%"], ["Finalizado", "32", "7%"]] },
  "#/client/dashboard/impulse": { description: "Seguimiento del impulso procesal por expediente.", columns: ["Expediente", "Último impulso", "Responsable", "Prioridad"], rows: [["1842/2025", "18/03/2025", "Equipo demo", "Alta"], ["932/2024", "12/03/2025", "Equipo demo", "Media"]] },
  "#/admin/report": { description: "Informes del estudio.", columns: ["Nombre", "Tipo", "Creado", "Actualizado", "Estado"], rows: [["Casos activos", "Expedientes", "18/03/2025", "18/03/2025", "Disponible"], ["Movimientos mensuales", "Actividad", "10/03/2025", "10/03/2025", "Disponible"]], action: "Crear informe" },
  "#/admin/mis_reportes": { description: "Informes guardados por tu cuenta.", columns: ["Nombre", "Fecha", "Formato", "Acción"], rows: [["Resumen de prueba", "18/03/2025", "PDF", "Descargar"]], action: "Nuevo reporte" },
  "#/client/administration": { description: "Carga individual de un expediente.", columns: ["Campo", "Valor"], rows: [["Número", ""], ["Carátula", ""], ["Jurisdicción", ""], ["Demandante", ""], ["Demandado", ""]], action: "Alta de caso" },
  "#/client/bajajuicio": { description: "Solicitudes de baja de expedientes.", columns: ["Expediente", "Motivo", "Solicitado", "Estado"], rows: [["771/2023", "Caso de demostración", "18/03/2025", "Pendiente"]], action: "Solicitar baja" },
  "#/client/admmassive": { description: "Actualización masiva de estados y campos.", columns: ["Archivo", "Fecha", "Registros", "Resultado"], rows: [["actualizacion-demo.xlsx", "18/03/2025", "12", "Procesado"]], action: "Cargar archivo" },
  "#/client/nuevos_juicios": { description: "Casos nuevos para revisar y asignar.", columns: ["Fecha", "Expediente", "Carátula", "Origen", "Estado"], rows: [["18/03/2025", "1842/2025", "Caso de ejemplo", "Manual", "Sin asignar"]], action: "Agregar caso" },
  "#/client/history": { description: "Registro de cambios realizados en el sistema.", columns: ["Fecha", "Usuario", "Acción", "Expediente", "Detalle"], rows: [["18/03/2025", "Usuario demo", "Actualización", "1842/2025", "Cambio de estado"]] },
  "#/client/document_state": { description: "Estado de documentos en presentación.", columns: ["Fecha", "Expediente", "Documento", "Estado", "Observación"], rows: [["18/03/2025", "1842/2025", "Escrito de prueba", "Presentado", "—"]], action: "Nuevo documento" },
  "#/client/configuracion/estado": { description: "Catálogo editable de estados judiciales.", columns: ["Estado", "Descripción", "Activo"], rows: [["En trámite", "Expediente activo", "Sí"], ["Finalizado", "Proceso concluido", "Sí"]], action: "Agregar estado" },
  "#/client/configuracion/subEstado": { description: "Subestados asociados a los estados judiciales.", columns: ["Subestado", "Estado", "Activo"], rows: [["Pendiente", "En trámite", "Sí"], ["A despacho", "En trámite", "Sí"]], action: "Agregar subestado" },
  "#/client/configuracion/usersAbogado": { description: "Usuarios y responsables del estudio.", columns: ["Usuario", "Nombre", "Rol", "Estado"], rows: [["usuario.demo", "Usuario de prueba", "Abogado/a", "Activo"]], action: "Agregar usuario" },
  "#/client/configuracion/portfolio": { description: "Portfolios utilizados para organizar casos.", columns: ["Portfolio", "Descripción", "Casos", "Estado"], rows: [["Cobros", "Casos de cobro", "82", "Activo"]], action: "Agregar portfolio" },
  "#/client/configuracion/jurisdicciones-organismos": { description: "Jurisdicciones y organismos judiciales.", columns: ["Jurisdicción", "Organismo", "Código", "Estado"], rows: [["Capital", "Juzgado Civil · Turno 2", "JC02", "Activo"]], action: "Agregar organismo" },
  "#/client/configuracion/campos-comodines": { description: "Campos personalizados para la ficha de expediente.", columns: ["Campo", "Tipo", "Visible", "Estado"], rows: [["Comodín 1", "Texto", "Sí", "Activo"]], action: "Agregar campo" },
  "#/client/configuracion/template": { description: "Plantillas de escritos y documentos.", columns: ["Nombre", "Tipo", "Actualizado", "Estado"], rows: [["Presentación simple", "Escrito", "18/03/2025", "Activo"]], action: "Nueva plantilla" },
  "#/client/configuracion/tipo-medida-cautelar": { description: "Tipos de medidas cautelares.", columns: ["Tipo", "Descripción", "Estado"], rows: [["Embargo", "Medida de ejemplo", "Activo"]], action: "Agregar tipo" },
  "#/client/configuracion/estado-medida-cautelar": { description: "Estados de medidas cautelares.", columns: ["Estado", "Descripción", "Activo"], rows: [["Solicitada", "Pendiente de resolución", "Sí"]], action: "Agregar estado" },
  "#/client/configuracion/sub_tipos_pagos_cobros": { description: "Subtipos de pagos y cobros.", columns: ["Subtipo", "Categoría", "Estado"], rows: [["Tasa de justicia", "Pago", "Activo"]], action: "Agregar subtipo" },
  "#/client/configuracion/tipo_gasto": { description: "Tipos de gastos del estudio.", columns: ["Tipo de gasto", "Descripción", "Estado"], rows: [["Tasas", "Tasas y aportes", "Activo"]], action: "Agregar tipo" },
  "#/client/configuracion/tipo_honorario": { description: "Tipos de honorarios.", columns: ["Tipo de honorario", "Descripción", "Estado"], rows: [["Pactado", "Honorarios de ejemplo", "Activo"]], action: "Agregar tipo" },
  "#/client/configuracion/actualizacion_automatica": { description: "Preferencias de actualización automática de estados.", columns: ["Configuración", "Valor", "Estado"], rows: [["Frecuencia", "Diaria", "Activa"], ["Notificaciones", "Correo", "Activas"]], action: "Editar configuración" },
  "#/client/configuracion/label_with_ia": { description: "Reglas de etiquetado asistido.", columns: ["Etiqueta", "Regla", "Estado"], rows: [["Prioridad", "Regla de ejemplo", "Activa"]], action: "Crear regla" },
  "#/client/configuracion/suggested_movements": { description: "Sugerencias de templates y estados según etiquetas.", columns: ["Etiqueta", "Template sugerido", "Estado sugerido"], rows: [["Prioridad", "Presentación simple", "En trámite"]], action: "Agregar sugerencia" },
};

const defaultJudicialStates = ["En trámite", "Pendiente", "Finalizado", "Suspendido"];
const defaultExpenseTypes = ["Tasa de justicia", "Aporte", "Traslado", "Copias", "Otro"];
const defaultFeeTypes = ["Pactado", "Regulación judicial", "Consulta", "Otro"];
const defaultPortfolios = ["General", "Cobros"];
const defaultJurisdictions = ["Capital"];
const defaultSubstates = ["Pendiente", "A despacho"];
const defaultResponsibles = ["Sin asignar"];

function useModuleCatalog(moduleKey: string, defaults: string[], enabled = true, reloadKey = "") {
  const [options, setOptions] = useState(defaults);
  const defaultsKey = defaults.join("\u0000");
  useEffect(() => {
    let cancelled = false;
    if (!enabled) { setOptions(defaultsKey ? defaultsKey.split("\u0000") : []); return () => { cancelled = true; }; }
    fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("No se pudo cargar el catálogo local");
        if (!data.initialized) {
          if (!cancelled) setOptions(defaultsKey ? defaultsKey.split("\u0000") : []);
          return;
        }
        const values: string[] = (data.records || []).filter((record: { values?: string[] }) => !["no", "inactivo", "inactiva"].includes(String(record.values?.at(-1) || "").trim().toLowerCase())).map((record: { values?: string[] }) => String(record.values?.[0] || "").trim()).filter((value: string) => Boolean(value));
        if (!cancelled) setOptions(Array.from(new Set<string>(values)));
      })
      .catch(() => { if (!cancelled) setOptions(defaultsKey ? defaultsKey.split("\u0000") : []); });
    return () => { cancelled = true; };
  }, [moduleKey, defaultsKey, enabled, reloadKey]);
  return options;
}

function useSubstateCatalog(enabled = true, reloadKey = "") {
  const [catalog, setCatalog] = useState<Record<string, string[]>>({ "En trámite": defaultSubstates });
  useEffect(() => {
    let cancelled = false;
    if (!enabled) { setCatalog({ "En trámite": defaultSubstates }); return () => { cancelled = true; }; }
    fetch(`/api/modules/${encodeURIComponent("client/configuracion/subEstado")}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("No se pudo cargar el catálogo de subestados");
        if (!data.initialized) { if (!cancelled) setCatalog({ "En trámite": defaultSubstates }); return; }
        const next: Record<string, string[]> = {};
        for (const record of data.records || []) {
          const values: string[] = record.values || [];
          if (["no", "inactivo", "inactiva"].includes(String(values.at(-1) || "").trim().toLowerCase())) continue;
          const substate = String(values[0] || "").trim();
          const state = String(values[1] || "Todos").trim();
          if (substate) next[state] = [...new Set([...(next[state] || []), substate])];
        }
        if (!cancelled) setCatalog(Object.keys(next).length ? next : { "En trámite": defaultSubstates });
      })
      .catch(() => { if (!cancelled) setCatalog({ "En trámite": defaultSubstates }); });
    return () => { cancelled = true; };
  }, [enabled, reloadKey]);
  return catalog;
}

function substatesFor(catalog: Record<string, string[]>, state: string) {
  return catalog[state] || catalog.Todos || [];
}

function caseCustomFieldKey(id: string, label: string) {
  const legacy = normalizeHeader(label).match(/^comodin([12])$/);
  return legacy ? `custom${legacy[1]}` : `custom_${id}`;
}

function useCustomFieldCatalog(enabled = true, reloadKey = "") {
  const defaults: CaseField[] = [
    { key: "custom1", label: "Comodín 1", value: "", inputType: "text" },
    { key: "custom2", label: "Comodín 2", value: "", inputType: "text" },
  ];
  const [fields, setFields] = useState<CaseField[]>(defaults);
  useEffect(() => {
    let cancelled = false;
    if (!enabled) { setFields(defaults); return () => { cancelled = true; }; }
    fetch(`/api/modules/${encodeURIComponent("client/configuracion/campos-comodines")}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("No se pudo cargar Campos comodines");
        if (!data.initialized) { if (!cancelled) setFields(defaults); return; }
        const result: CaseField[] = (data.records || []).filter((record: { values?: string[] }) => {
          const values = record.values || [];
          return !["no", "inactivo", "inactiva"].includes(String(values[2] || "").trim().toLowerCase()) && !["no", "inactivo", "inactiva"].includes(String(values.at(-1) || "").trim().toLowerCase());
        }).map((record: { id: string; values?: string[] }) => {
          const values = record.values || [];
          const label = String(values[0] || "").trim();
          const kind = String(values[1] || "Texto").toLowerCase();
          const inputType = kind.includes("fecha") ? "date" : kind.includes("número") || kind.includes("numero") ? "number" : "text";
          return { key: caseCustomFieldKey(record.id, label), label, value: "", inputType };
        }).filter((field: CaseField) => Boolean(field.label));
        if (!cancelled) setFields(result);
      })
      .catch(() => { if (!cancelled) setFields(defaults); });
    return () => { cancelled = true; };
  }, [enabled, reloadKey]);
  return fields;
}

function routeFromHash() {
  return window.location.hash || "#/auth/login";
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [fields, setFields] = useState(initialFields);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [session, setSession] = useState<LocalUser | null>(null);
  const catalogReloadKey = route.startsWith("#/client/configuracion/") ? route : "outside-config";
  const judicialStates = useModuleCatalog("client/configuracion/estado", defaultJudicialStates, Boolean(session), catalogReloadKey);
  const portfolios = useModuleCatalog("client/configuracion/portfolio", defaultPortfolios, Boolean(session), catalogReloadKey);
  const jurisdictions = useModuleCatalog("client/configuracion/jurisdicciones-organismos", defaultJurisdictions, Boolean(session), catalogReloadKey);
  const substateCatalog = useSubstateCatalog(Boolean(session), catalogReloadKey);
  const responsibles = useModuleCatalog("client/configuracion/usersAbogado", defaultResponsibles, Boolean(session), catalogReloadKey);
  const customFields = useCustomFieldCatalog(Boolean(session), catalogReloadKey);
  const [sessionReady, setSessionReady] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("Ficha");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthPage = route.startsWith("#/auth/") || route === "#/";
  const detailId = route.includes("/searchinf/detail/") ? route.split("/").pop() || "demo-10482" : null;
  const currentState = fields.find((field) => field.key === "state")?.value;
  const stateChoices = [...new Set([...judicialStates, ...(currentState ? [currentState] : [])])];
  const currentSubstate = fields.find((field) => field.key === "substate")?.value;
  const substateChoices = [...new Set([...substatesFor(substateCatalog, currentState || ""), ...(currentSubstate ? [currentSubstate] : [])])];
  const responsibleOptions = [...new Set(["Sin asignar", ...responsibles])];
  const currentFieldValues = Object.fromEntries(fields.map((field) => [field.key, field.value]));
  const fieldOptions: Record<string, string[]> = {
    state: stateChoices,
    portfolio: [...new Set([...portfolios, ...(currentFieldValues.portfolio ? [currentFieldValues.portfolio] : [])])],
    jurisdiction: [...new Set([...jurisdictions, ...(currentFieldValues.jurisdiction ? [currentFieldValues.jurisdiction] : [])])],
    substate: substateChoices,
    responsible: [...new Set([...responsibleOptions, ...(currentFieldValues.responsible ? [currentFieldValues.responsible] : [])])],
  };
  const caseFieldDefinitions = useMemo(() => [
    ...initialFields.filter((field) => !field.key.startsWith("custom")),
    ...customFields,
  ], [customFields]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSession(data.user ?? null))
      .catch(() => setSession(null))
      .finally(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    const change = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!session && !isAuthPage) {
      window.location.hash = "#/auth/login";
      setRoute("#/auth/login");
    }
  }, [sessionReady, session, isAuthPage]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/cases", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setCases(Array.isArray(data.cases) ? data.cases : []))
      .catch(() => setToast("No se pudo cargar la base local"));
  }, [session]);

  useEffect(() => {
    if (!session || !detailId) return;
    fetch(`/api/cases/${encodeURIComponent(detailId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((record) => {
        if (!record?.fields) return;
        setFields(caseFieldDefinitions.map((field) => ({ ...field, value: String(record.fields[field.key] ?? field.value) })));
        setFollowed(Boolean(record.followed));
      })
      .catch(() => setToast("No se pudo cargar el expediente"));
  }, [session, detailId, caseFieldDefinitions]);

  const isDetail = route.includes("/searchinf/detail/");
  const pageTitle = useMemo(() => {
    if (isDetail) return "Búsqueda de casos";
    const item = groups.flatMap((g) => g.items).find(([, , href]) => href === route);
    if (item) return item[0];
    return route === "#/client/home_estudio_juridico" ? "Inicio" : "Búsqueda de casos";
  }, [isDetail, route]);

  function navigate(href: string) {
    window.location.hash = href;
    setRoute(href);
    setMenuOpen(false);
  }

  function updateField(key: string, value: string) {
    if (key === "state") {
      const allowedSubstates = substatesFor(substateCatalog, value);
      setFields((current) => current.map((field) => {
        if (field.key === "state") return { ...field, value };
        if (field.key === "substate" && !allowedSubstates.includes(field.value)) return { ...field, value: allowedSubstates[0] || "—" };
        return field;
      }));
      return;
    }
    setFields((current) => current.map((field) => field.key === key ? { ...field, value } : field));
  }

  function notify(message: string) {
    setToast(`${message}: integración externa pendiente`);
  }

  function report(message: string) { setToast(message); }

  async function refreshCases() {
    const response = await fetch("/api/cases", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo actualizar la lista de casos");
    setCases(Array.isArray(data.cases) ? data.cases : []);
  }

  async function save() {
    if (!detailId) return;
    const fieldValues = Object.fromEntries(fields.map((field) => [field.key, field.value]));
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(detailId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: fieldValues }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron guardar los cambios");
      setCases((current) => current.map((item) => item.id === detailId ? data : item));
      setEditing(false);
      setToast("Cambios guardados en la base local");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al guardar");
    }
  }

  async function toggleFollow() {
    if (!detailId) return;
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(detailId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followed: !followed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar el seguimiento");
      setFollowed(Boolean(data.followed));
      setCases((current) => current.map((item) => item.id === detailId ? { ...item, followed: Boolean(data.followed) } : item));
      setToast(data.followed ? "Expediente agregado a seguimiento" : "Seguimiento quitado");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al actualizar el seguimiento");
    }
  }

  function exportCase() {
    const rows = [["Campo", "Valor"], ...fields.map((field) => [field.label, field.value])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `expediente-${detailId || "local"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Ficha exportada desde la base local");
  }

  function runCaseAction(label: string) {
    if (label === "Imprimir") { window.print(); return; }
    if (label === "Exportar") { exportCase(); return; }
    if (label === "Crear informe") { navigate("#/admin/report"); return; }
    if (label === "Redactar mensaje") { setActiveTab("Mensajes"); return; }
    if (label === "Presentar documento") { setActiveTab("Presentaciones"); return; }
    if (label === "Documentos adjuntos" || label === "Drive") { setActiveTab("Documentación"); return; }
    notify(label);
  }

  async function createCase(fields: Record<string, string>) {
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear el expediente");
      setCases((current) => [data, ...current]);
      navigate(`#/client/searchinf/detail/${data.id}`);
      setToast("Expediente creado en la base local");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al crear expediente");
    }
  }

  async function importCases(records: { fields: Record<string, string> }[]) {
    try {
      const response = await fetch("/api/cases/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo importar el archivo");
      setCases((current) => [...(data.cases || []), ...current]);
      setToast(`Importación finalizada: ${data.imported} creados, ${data.duplicates} duplicados, ${data.invalid} inválidos`);
      navigate("#/client/searchinf");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al importar casos");
    }
  }

  async function bulkUpdateCases(records: { fields: Record<string, string> }[]) {
    try {
      const response = await fetch("/api/cases/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar el portfolio");
      const refreshed = await fetch("/api/cases", { cache: "no-store" }).then((r) => r.json());
      setCases(refreshed.cases || []);
      setToast(`Actualización finalizada: ${data.updated} modificados, ${data.missing} no encontrados, ${data.ambiguous} ambiguos`);
      navigate("#/client/searchinf");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al actualizar el portfolio");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    navigate("#/auth/login");
  }

  if (isAuthPage) {
    const mode = route === "#/auth/register" ? "register" : route === "#/auth/forgot" ? "forgot" : "login";
    return <AuthPage mode={mode} navigate={navigate} onAuthenticated={(user) => setSession(user)} />;
  }

  if (!sessionReady || !session) return <div className="loading-screen">Cargando sesión local…</div>;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">LR</div>
          <div><strong>LegalRun</strong><span>Gestión jurídica</span></div>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">×</button>
        </div>
        <div className="workspace"><span className="workspace-dot" /> Estudio jurídico <span className="chevron">⌄</span></div>
        <div className="sidebar-scroll">
          {groups.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-heading">{group.title}</p>
              {group.items.map(([label, icon, href]) => (
                <button
                  key={`${label}-${href}`}
                  className={`nav-item ${route === href || (isDetail && href === "#/client/searchinf") ? "nav-active" : ""}`}
                  onClick={() => navigate(href)}
                >
                  <span className="nav-icon">{icon}</span><span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-footer"><div className="avatar">{session.email.slice(0, 2).toUpperCase()}</div><div><strong>{session.email}</strong><span>Cuenta local</span></div><button className="more logout-button" onClick={logout} aria-label="Cerrar sesión">↪</button></div>
      </aside>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">☰</button>
          <div className="breadcrumbs"><span>LegalRun</span><span>/</span><strong>{pageTitle}</strong>{isDetail && <><span>/</span><strong>Expediente de ejemplo</strong></>}</div>
          <div className="top-actions">
            <button className="ai-button" onClick={() => notify("Asistente IA")}><span>✦</span> Asistente IA</button>
            <button className="icon-button notification" aria-label="Notificaciones">♧<i /></button>
            <button className="profile-button" onClick={logout}><span className="avatar small">{session.email.slice(0, 2).toUpperCase()}</span><span>{session.email}</span><span>Salir</span></button>
          </div>
        </header>

        <div className="page-content">
          {isDetail ? (
            <>
              <div className="page-title-row">
                <div><p className="eyebrow">CASOS / BÚSQUEDA</p><h1>Expediente {fields.find((field) => field.key === "number")?.value || ""} <span className="muted-id">#{fields.find((field) => field.key === "id")?.value || detailId}</span></h1><p className="muted">Ficha del caso · almacenamiento local independiente</p></div>
                <div className="title-actions"><span className="status-pill"><i /> {fields.find((field) => field.key === "state")?.value || "En trámite"}</span><button className="secondary-button" onClick={() => void toggleFollow()}>{followed ? "★ Siguiendo" : "☆ Seguir"}</button></div>
              </div>

              <section className="action-bar" aria-label="Acciones del expediente">
                {actions.map(([icon, label]) => <button key={label} className="action-button" onClick={() => runCaseAction(label)}><span>{icon}</span>{label}</button>)}
              </section>

              <section className="case-card">
                <div className="case-heading">
                  <div><div className="case-tags"><span className="tag blue">{fields.find((field) => field.key === "type")?.value || "CASO"}</span><span className="tag neutral">{fields.find((field) => field.key === "jurisdiction")?.value || "—"}</span></div><h2>{fields.find((field) => field.key === "title")?.value || fields.find((field) => field.key === "number")?.value || "Expediente"}</h2><p>{fields.find((field) => field.key === "claimant")?.value || "—"} <span className="versus">c/</span> {fields.find((field) => field.key === "defendant")?.value || "—"} <span className="versus">s/</span> {fields.find((field) => field.key === "type")?.value || "—"}</p></div>
                  <button className="icon-button more-button" aria-label="Más acciones" onClick={() => notify("Más acciones")}>···</button>
                </div>
                <div className="case-meta">
                  <div><span>JURISDICCIÓN</span><strong>{fields.find((field) => field.key === "jurisdiction")?.value || "—"}</strong></div>
                  <div><span>JUZGADO</span><strong>{fields.find((field) => field.key === "court")?.value || "—"}</strong></div>
                  <div><span>ÚLTIMA ACTUALIZACIÓN</span><strong>{fields.find((field) => field.key === "lastUpdate")?.value || "—"}</strong></div>
                  <div><span>MONTO</span><strong>{fields.find((field) => field.key === "amount")?.value || "—"}</strong></div>
                </div>
              </section>

              <section className="tabs-row" role="tablist" aria-label="Secciones del expediente">
                {tabs.map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "tab active-tab" : "tab"} onClick={() => setActiveTab(tab)}>{tab}</button>)}
              </section>

              {activeTab === "Ficha" || activeTab === "Información de juicio" ? (
                <div className="detail-layout">
                  <section className="panel fields-panel">
                    <div className="panel-heading"><div><h3>Datos del expediente</h3><p>Información principal y judicial</p></div><button className="text-button" onClick={() => setEditing((value) => !value)}>{editing ? "Cancelar edición" : "Editar ficha"}</button></div>
                    <div className="fields-grid">
                      {fields.map((field) => <label className="field" key={field.key} id={`field-${field.key}`}><span>{field.label}</span>{field.select || fieldOptions[field.key] ? <select disabled={!editing} value={field.value} onChange={(e) => updateField(field.key, e.target.value)}>{(fieldOptions[field.key] || [field.value]).map((option) => <option key={option}>{option}</option>)}</select> : <input type={field.inputType || "text"} disabled={!editing} value={field.value} onChange={(e) => updateField(field.key, e.target.value)} />}</label>)}
                    </div>
                    <div className="panel-footer"><span className="muted">Los cambios se guardan en la base SQLite local.</span><button className="primary-button" onClick={() => void save()} disabled={!editing}>Guardar cambios</button></div>
                  </section>
                   <CaseOverviewWidgets caseId={detailId || "demo-10482"} responsible={fields.find((field) => field.key === "responsible")?.value || ""} onAssign={() => { setEditing(true); setToast("Edita el campo Responsable en la ficha y guarda los cambios"); }} onShowMovements={() => setActiveTab("Novedades")} />
                </div>
              ) : <CaseEntriesTab key={`${detailId}-${activeTab}`} tab={activeTab} caseId={detailId || "demo-10482"} onSaved={report} />}
            </>
          ) : route === "#/client/home_estudio_juridico" ? (
            <HomePage navigate={navigate} />
          ) : route === "#/client/agenda" ? (
            <AgendaPage cases={cases} openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} onSaved={report} />
          ) : route === "#/client/inbox" ? (
            <InboxPage cases={cases} openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} onSaved={report} />
          ) : route === "#/client/novedades_juicio" ? (
            <MovementsPage cases={cases} openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} onSaved={report} />
          ) : route === "#/client/document_state" ? (
            <DocumentStatusPage openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} onSaved={report} />
          ) : route === "#/client/history" ? (
            <MaintenanceHistoryPage openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} />
          ) : route === "#/client/nuevos_juicios" ? (
            <NewCaseIntakePage cases={cases} states={judicialStates.length ? judicialStates : defaultJudicialStates} substatesByState={substateCatalog} onCreated={(created) => setCases((current) => [created, ...current])} openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} onSaved={report} />
          ) : route === "#/client/configuracion/security" ? (
            <PasswordSettingsPage onSaved={report} />
          ) : route === "#/client/configuracion/backup" ? (
            <BackupPage onSaved={report} onRestored={refreshCases} />
          ) : route === "#/client/searchinf" ? (
            <SearchPage search={search} setSearch={setSearch} cases={cases} customFields={customFields} openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} onCreate={() => navigate("#/client/administration")} />
          ) : route === "#/client/followed" ? (
            <FollowedCasesPage cases={cases} onCaseUpdated={(updated) => setCases((current) => current.map((item) => item.id === updated.id ? updated : item))} openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} />
          ) : route === "#/client/administration" ? (
            <CreateCasePage states={judicialStates.length ? judicialStates : defaultJudicialStates} portfolios={portfolios} jurisdictions={jurisdictions} substatesByState={substateCatalog} responsibles={responsibleOptions} customFields={customFields} onCreate={createCase} onCancel={() => navigate("#/client/searchinf")} />
          ) : route === "#/client/cases/import" ? (
            <ImportCasesPage defaultState={judicialStates[0] || "En trámite"} customFields={customFields} onImport={importCases} onCancel={() => navigate("#/client/searchinf")} />
          ) : route === "#/client/admmassive" ? (
            <BulkUpdatePage customFields={customFields} onUpdate={bulkUpdateCases} onCancel={() => navigate("#/client/searchinf")} />
          ) : route === "#/client/bajajuicio" ? (
            <CaseDeactivationPage cases={cases} openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} onSaved={report} />
          ) : route === "#/admin/report" ? (
            <ReportsPage cases={cases} customFields={customFields} onSaved={report} />
          ) : route === "#/admin/mis_reportes" ? (
            <SavedReportsPage onSaved={report} />
          ) : route === "#/client/dashboard/state" ? (
            <StateDashboardPage cases={cases} />
          ) : route === "#/client/dashboard/stock" ? (
            <StockDashboardPage navigate={navigate} />
          ) : route === "#/client/dashboard/finance" ? (
            <FinanceDashboardPage openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} onSaved={report} />
          ) : route === "#/client/dashboard/movimientos" ? (
            <ActivityDashboardPage kind="movimientos" openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} />
          ) : route === "#/client/dashboard/impulse" ? (
            <ActivityDashboardPage kind="impulse" openCase={(id) => navigate(`#/client/searchinf/detail/${id}`)} />
          ) : (
            <ModulePage key={route} route={route} title={pageTitle} onSaved={report} />
          )}
        </div>
      </main>
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}

function CaseOverviewWidgets({ caseId, responsible, onAssign, onShowMovements }: { caseId: string; responsible: string; onAssign: () => void; onShowMovements: () => void }) {
  const [summary, setSummary] = useState<{ movements: { title: string; date: string }[]; documents: number; notes: number; expenses: number; upcoming: { title: string; date: string; time: string } | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const sections = ["movements", "documents", "filings", "notes", "expenses"];
        const responses = await Promise.all(sections.map((section) => fetch(`/api/cases/${encodeURIComponent(caseId)}/entries/${section}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : { entries: [] }).catch(() => ({ entries: [] }))));
        const agendaResponse = await fetch(`/api/modules/${encodeURIComponent("client/agenda")}`, { cache: "no-store" }).catch(() => null);
        const agendaData = agendaResponse?.ok ? await agendaResponse.json() : { records: [] };
        const bySection = Object.fromEntries(sections.map((section, index) => [section, responses[index].entries || []]));
        const now = new Date();
        const upcoming = (agendaData.records || []).filter((record: { caseId?: string; values?: string[] }) => record.caseId === caseId && !["Completada", "Cancelada"].includes(record.values?.[5] || ""))
          .map((record: { values?: string[] }) => ({ title: record.values?.[2] || "Actividad", date: record.values?.[0] || "", time: record.values?.[1] || "" }))
          .filter((item: { date: string; time: string }) => agendaTimestamp(item.date, item.time) >= now.getTime())
          .sort((a: { date: string; time: string }, b: { date: string; time: string }) => agendaTimestamp(a.date, a.time) - agendaTimestamp(b.date, b.time))[0] || null;
        const movements = (bySection.movements || []).slice(0, 4).map((entry: { title?: string; description?: string; date?: string; createdAt?: string }) => ({ title: entry.title || entry.description || "Movimiento", date: entry.date || entry.createdAt || "—" }));
        if (!cancelled) setSummary({ movements, documents: (bySection.documents || []).length + (bySection.filings || []).length, notes: (bySection.notes || []).length, expenses: (bySection.expenses || []).length, upcoming });
      } catch { if (!cancelled) setSummary({ movements: [], documents: 0, notes: 0, expenses: 0, upcoming: null }); }
    }
    void load();
    return () => { cancelled = true; };
  }, [caseId]);
  return <aside className="right-column">
    <section className="panel compact-panel"><div className="panel-heading"><div><h3>Actividad reciente</h3><p>Últimos movimientos del caso</p></div><button className="text-button" onClick={onShowMovements}>Ver todo</button></div>{summary ? <Timeline items={summary.movements} /> : <div className="empty-table compact-empty">Cargando…</div>}</section>
    <section className="panel compact-panel"><div className="panel-heading"><div><h3>Responsable</h3><p>Asignación del expediente</p></div><button className="text-button" onClick={onAssign}>{responsible ? "Cambiar" : "Asignar"}</button></div><div className="responsible"><span className="avatar purple">{responsible ? responsible.slice(0, 2).toUpperCase() : "—"}</span><div><strong>{responsible || "Sin asignar"}</strong><span>Responsable del caso</span></div></div></section>
    <section className="panel compact-panel"><div className="panel-heading"><div><h3>Próximo vencimiento</h3><p>Agenda vinculada</p></div></div>{summary?.upcoming ? <div className="next-due"><strong>{summary.upcoming.title}</strong><span>{summary.upcoming.date}{summary.upcoming.time && summary.upcoming.time !== "—" ? ` · ${summary.upcoming.time}` : ""}</span></div> : <div className="empty-table compact-empty">No hay actividades próximas asociadas.</div>}</section>
    <section className="panel compact-panel"><div className="panel-heading"><div><h3>Datos rápidos</h3><p>Registros de este expediente</p></div></div><div className="quick-stats"><div><span>Documentos</span><strong>{summary?.documents ?? "—"}</strong></div><div><span>Notas</span><strong>{summary?.notes ?? "—"}</strong></div><div><span>Gastos</span><strong>{summary?.expenses ?? "—"}</strong></div><div><span>Movimientos</span><strong>{summary?.movements.length ?? "—"}</strong></div></div></section>
  </aside>;
}

function Timeline({ items = [] }: { items?: { title: string; date: string; caseNumber?: string }[] }) {
  if (!items.length) return <div className="empty-table compact-empty">Sin actividad registrada.</div>;
  const colors = ["blue", "purple", "green", "blue"];
  return <div className="timeline">{items.map((item, index) => <div className="timeline-item" key={`${item.title}-${index}`}><i className={`timeline-dot ${colors[index % colors.length]}`} /><div><strong>{item.title}</strong><span>{item.caseNumber ? `${item.caseNumber} · ` : ""}{item.date}</span></div></div>)}</div>;
}

type CaseEntry = {
  id: string; date?: string; createdAt?: string; title?: string; description?: string;
  user?: string; filename?: string; fileName?: string; storageId?: string; type?: string;
  amount?: string; state?: string; tags?: string[]; text?: string; role?: string;
  email?: string; phone?: string; nextDate?: string; dueDate?: string; parties?: string; installments?: string;
};

function CaseEntriesTab({ tab, caseId, onSaved }: { tab: string; caseId: string; onSaved: (s: string) => void }) {
  const section = ({
    "Novedades": "movements", "Documentación": "documents", "Presentaciones": "filings",
    "Gestión extrajudicial": "extrajudicial", "Intervinientes": "contacts", "Gastos": "expenses",
    "Honorarios": "fees", "Acuerdos": "agreements", "Mensajes": "messages", "Notas": "notes",
  } as Record<string, string>)[tab] || "notes";
  const expenseTypes = useModuleCatalog("client/configuracion/tipo_gasto", defaultExpenseTypes);
  const feeTypes = useModuleCatalog("client/configuracion/tipo_honorario", defaultFeeTypes);
  const [entries, setEntries] = useState<CaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(tab === "Mensajes" || tab === "Presentaciones");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("");
  const [parties, setParties] = useState("");
  const [classification, setClassification] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentState, setPaymentState] = useState("Pendiente");
  const [agreementState, setAgreementState] = useState("Vigente");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [ascending, setAscending] = useState(false);
  const [error, setError] = useState("");
  const expenseOptions = [...new Set([...expenseTypes, ...(tab === "Gastos" && classification ? [classification] : [])])];
  const feeOptions = [...new Set([...feeTypes, ...(tab === "Honorarios" && classification ? [classification] : [])])];

  async function loadEntries() {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(section)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los registros");
      setEntries(data.entries || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadEntries(); }, [caseId, section]);

  function resetEntryForm() {
    setEditingEntryId(null); setTitle(""); setDetail(""); setAmount(""); setInstallments(""); setParties(""); setClassification("");
    setContactRole(""); setContactEmail(""); setContactPhone(""); setNextDate(""); setDueDate("");
    setPaymentState("Pendiente"); setAgreementState("Vigente"); setTags(""); setFile(null); setFileInputKey((key) => key + 1);
  }

  function editEntry(entry: CaseEntry) {
    setEditingEntryId(entry.id);
    setTitle(entry.title || ""); setDetail(entry.description || entry.text || ""); setAmount(entry.amount || "");
    setClassification(tab === "Gestión extrajudicial" ? entry.state || "" : entry.type || "");
    setContactRole(entry.role || ""); setContactEmail(entry.email || ""); setContactPhone(entry.phone || "");
    setNextDate(entry.nextDate || ""); setDueDate(entry.dueDate || ""); setPaymentState(entry.state || "Pendiente");
    setAgreementState(entry.state || "Vigente"); setInstallments(entry.installments || ""); setParties(entry.parties || "");
    setTags(entry.tags?.join(", ") || ""); setFile(null); setFileInputKey((key) => key + 1); setShowForm(true);
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file && file.size > 5_000_000) {
      setError("El archivo supera el límite de 5 MB");
      return;
    }
    const currentEntry = editingEntryId ? entries.find((item) => item.id === editingEntryId) : null;
    const entry: Record<string, unknown> = {
      date: currentEntry?.date || new Date().toLocaleDateString("es-AR"),
      title: title.trim(),
      description: detail.trim(),
      amount: amount.trim(),
      installments: installments.trim(),
      parties: parties.trim(),
      type: classification,
      state: tab === "Gestión extrajudicial" ? classification || "Pendiente" : ["Gastos", "Honorarios"].includes(tab) ? paymentState : tab === "Acuerdos" ? agreementState : "Pendiente",
      role: contactRole,
      email: contactEmail.trim(),
      phone: contactPhone.trim(),
      nextDate,
      dueDate,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      user: "Cuenta local",
    };
    try {
      if (file) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer el archivo"));
          reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
          reader.readAsDataURL(file);
        });
        entry.fileName = file.name;
        entry.fileBase64 = dataUrl.split(",")[1];
      }
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(section)}${editingEntryId ? `/${encodeURIComponent(editingEntryId)}` : ""}`, {
        method: editingEntryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el registro");
      setEntries((current) => editingEntryId ? current.map((item) => item.id === editingEntryId ? result : item) : [result, ...current]);
      resetEntryForm(); setShowForm(false);
      onSaved(`${tab}: ${editingEntryId ? "cambios actualizados" : "guardado"} en SQLite local`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm("¿Eliminar este registro local?")) return;
    const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(section)}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return setError("No se pudo eliminar el registro");
    setEntries((current) => current.filter((entry) => entry.id !== id));
    onSaved("Registro eliminado de SQLite local");
  }

  const columns = tab === "Gastos" || tab === "Honorarios"
    ? ["Fecha", tab === "Gastos" ? "Concepto" : "Honorario", "Tipo", "Monto", "Vencimiento", "Estado", "Comprobante"]
    : tab === "Documentación" || tab === "Presentaciones"
      ? ["Fecha", "Título", "Tipo", "Archivo", "Usuario"]
      : tab === "Intervinientes"
        ? ["Fecha", "Interviniente", "Rol", "Email", "Teléfono", "Datos", "Usuario"]
        : tab === "Gestión extrajudicial"
          ? ["Fecha", "Acción", "Descripción", "Estado", "Próximo contacto", "Monto", "Usuario"]
          : tab === "Acuerdos"
            ? ["Fecha", "Acuerdo", "Partes", "Monto", "Cuotas", "Vencimiento", "Estado"]
            : ["Fecha", tab === "Novedades" ? "Movimiento" : "Título", "Descripción", "Etiquetas", "Usuario"];
  const filtered = entries
    .filter((entry) => JSON.stringify(entry).toLowerCase().includes(filter.toLowerCase()))
    .slice()
    .sort((a, b) => {
      const timestamp = (entry: CaseEntry) => {
        if (entry.createdAt) return Date.parse(entry.createdAt) || 0;
        const match = String(entry.date || "").match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
        return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime() : 0;
      };
      return ascending ? timestamp(a) - timestamp(b) : timestamp(b) - timestamp(a);
    });

  function cell(entry: CaseEntry, column: string) {
    if (column === "Fecha") return entry.date || entry.createdAt || "—";
    if (column === "Monto") return entry.amount || "—";
    if (column === "Estado") return entry.state || "Pendiente";
    if (column === "Vencimiento") return entry.dueDate || "—";
    if (column === "Usuario") return entry.user || "Cuenta local";
    if (column === "Tipo") return entry.type || "—";
    if (column === "Etiquetas") return entry.tags?.join(", ") || "—";
    if (column === "Rol") return entry.role || "—";
    if (column === "Email") return entry.email || "—";
    if (column === "Teléfono") return entry.phone || "—";
    if (column === "Próximo contacto") return entry.nextDate || "—";
    if (column === "Cuotas") return entry.installments || "—";
    if (column === "Partes") return entry.parties || "—";
    if (column === "Interviniente" || column === "Acción" || column === "Movimiento") return entry.title || "—";
    if (column === "Archivo" || column === "Comprobante") {
      return entry.storageId
        ? <a href={`/api/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(section)}/${encodeURIComponent(entry.id)}/file`}>{entry.fileName || "Descargar"}</a>
        : entry.fileName || entry.filename || "—";
    }
    if (column === "Descripción" || column === "Datos") return entry.description || entry.text || "—";
    return entry.title || entry.description || "—";
  }

  function exportCsv() {
    const data = [columns, ...filtered.map((entry) => columns.map((column) => {
      const value = cell(entry, column);
      return typeof value === "string" ? value : entry.fileName || "Adjunto";
    }))];
    const csv = data.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug(tab)}-${slug(caseId)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onSaved(`${tab}: CSV exportado`);
  }

  const acceptsFile = ["Documentación", "Presentaciones", "Novedades", "Gastos", "Honorarios"].includes(tab);
  return <section className="panel table-panel">
    <div className="panel-heading"><div><h3>{tab}</h3><p>Registros guardados en la base SQLite local.</p></div><div className="title-actions"><button className="secondary-button" onClick={() => window.print()}>Imprimir</button><button className="secondary-button" onClick={exportCsv}>Exportar</button><button className="primary-button" onClick={() => { if (showForm) { setShowForm(false); resetEntryForm(); } else { resetEntryForm(); setShowForm(true); } }}>＋ Nuevo</button></div></div>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={`Buscar en ${tab.toLowerCase()}...`} /><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><button className="secondary-button" onClick={() => setAscending((value) => !value)}>Fecha {ascending ? "↑" : "↓"}</button><span className="muted">{filtered.length} registros</span></div>
    {showForm && <form className="entry-form" onSubmit={saveEntry}>
      <label className="field"><span>{tab === "Gastos" ? "Concepto" : tab === "Intervinientes" ? "Nombre" : tab === "Gestión extrajudicial" ? "Acción / gestión" : tab === "Acuerdos" ? "Título del acuerdo" : tab === "Notas" ? "Título de la nota" : "Título"}</span><input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      {(tab === "Gastos" || tab === "Honorarios" || tab === "Gestión extrajudicial" || tab === "Acuerdos") && <label className="field"><span>Monto {tab === "Gestión extrajudicial" ? "(opcional)" : ""}</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="$ 0,00" /></label>}
      {tab === "Acuerdos" && <>
        <label className="field"><span>Partes</span><input value={parties} onChange={(event) => setParties(event.target.value)} placeholder="Parte A / Parte B" /></label>
        <label className="field"><span>Cuotas (si aplica)</span><input inputMode="numeric" value={installments} onChange={(event) => setInstallments(event.target.value)} placeholder="Ej. 6" /></label>
        <label className="field"><span>Vencimiento</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        <label className="field"><span>Estado del acuerdo</span><select value={agreementState} onChange={(event) => setAgreementState(event.target.value)}><option>Vigente</option><option>Pendiente de firma</option><option>Cumplido</option><option>Incumplido</option><option>Rescindido</option></select></label>
        <label className="field"><span>Tipo de acuerdo</span><select value={classification} onChange={(event) => setClassification(event.target.value)}><option value="">Seleccionar</option><option>Plan de cuotas</option><option>Conciliación</option><option>Pago</option><option>Otro</option></select></label>
      </>}
      {(tab === "Gastos" || tab === "Honorarios") && <>
        <label className="field"><span>{tab === "Gastos" ? "Tipo de gasto" : "Tipo de honorario"}</span><select required value={classification} onChange={(event) => setClassification(event.target.value)}><option value="">Seleccionar</option>{(tab === "Gastos" ? expenseOptions : feeOptions).map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="field"><span>Estado de pago</span><select value={paymentState} onChange={(event) => setPaymentState(event.target.value)}><option>Pendiente</option><option>Parcial</option><option>Pagado</option><option>Cancelado</option></select></label>
        <label className="field"><span>Vencimiento (opcional)</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
      </>}
      {tab === "Intervinientes" && <>
        <label className="field"><span>Rol</span><select required value={contactRole} onChange={(event) => setContactRole(event.target.value)}><option value="">Seleccionar</option><option>Cliente</option><option>Contraparte</option><option>Abogado/a</option><option>Perito</option><option>Testigo</option><option>Organismo</option><option>Otro</option></select></label>
        <label className="field"><span>Email</span><input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contacto@ejemplo.test" /></label>
        <label className="field"><span>Teléfono</span><input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+54 11 0000-0000" /></label>
      </>}
      {tab === "Documentación" && <label className="field"><span>Tipo de documentación</span><select onChange={(event) => setClassification(event.target.value)} value={classification}><option value="">Seleccionar</option><option>Demanda</option><option>Escrito</option><option>Comprobante</option><option>Otro</option></select></label>}
      {tab === "Presentaciones" && <label className="field"><span>Modalidad</span><select onChange={(event) => setClassification(event.target.value)} value={classification}><option value="">Seleccionar</option><option>Presentar ahora</option><option>Programar para la noche</option><option>Presentación presencial</option></select></label>}
      {tab === "Gestión extrajudicial" && <>
        <label className="field"><span>Estado extrajudicial</span><select required onChange={(event) => setClassification(event.target.value)} value={classification}><option value="">Seleccionar</option><option>Iniciada</option><option>En negociación</option><option>Esperando respuesta</option><option>Finalizada</option></select></label>
        <label className="field"><span>Próximo contacto</span><input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></label>
      </>}
      <label className="field"><span>{tab === "Mensajes" ? "Mensaje interno" : tab === "Intervinientes" ? "Contacto / rol" : tab === "Acuerdos" ? "Términos y condiciones" : "Información adicional / comentario"}</span><textarea value={detail} onChange={(event) => setDetail(event.target.value)} rows={3} /></label>
      <label className="field"><span>Marcas o etiquetas (separadas por coma)</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Prioridad, seguimiento" /></label>
      {acceptsFile && <label className="field"><span>Adjunto o comprobante · máximo 5 MB</span>{editingEntryId && <small className="muted">Si no eliges otro archivo, se conserva el actual.</small>}<input key={fileInputKey} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowForm(false); resetEntryForm(); }}>Cancelar</button><button className="primary-button" type="submit">{editingEntryId ? "Guardar cambios" : "Guardar"}</button></div>
    </form>}
    {loading ? <div className="empty-table">Cargando…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>Acción</th></tr></thead><tbody>{filtered.map((entry) => <tr key={entry.id}>{columns.map((column) => <td key={column}>{cell(entry, column)}</td>)}<td><button className="text-button" onClick={() => editEntry(entry)}>Editar</button><button className="text-button danger-text" onClick={() => void removeEntry(entry.id)}>Eliminar</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay registros todavía. Usa “Nuevo” para agregar uno.</div>}
  </section>;
}
function CreateCasePage({ states, portfolios, jurisdictions, substatesByState, responsibles, customFields, onCreate, onCancel }: { states: string[]; portfolios: string[]; jurisdictions: string[]; substatesByState: Record<string, string[]>; responsibles: string[]; customFields: CaseField[]; onCreate: (fields: Record<string, string>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ number: "", title: "", claimant: "", defendant: "", type: "", year: String(new Date().getFullYear()), amount: "", jurisdiction: "Capital", court: "", responsible: "Sin asignar", portfolio: "General", substate: "Pendiente", state: "En trámite" });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  useEffect(() => {
    if (states.length && !states.includes(form.state)) setForm((current) => ({ ...current, state: states[0] }));
  }, [states, form.state]);
  useEffect(() => { if (portfolios.length && !portfolios.includes(form.portfolio)) setForm((current) => ({ ...current, portfolio: portfolios[0] })); }, [portfolios, form.portfolio]);
  useEffect(() => { if (jurisdictions.length && !jurisdictions.includes(form.jurisdiction)) setForm((current) => ({ ...current, jurisdiction: jurisdictions[0] })); }, [jurisdictions, form.jurisdiction]);
  const substateOptions = substatesFor(substatesByState, form.state);
  useEffect(() => { if (!substateOptions.includes(form.substate)) setForm((current) => ({ ...current, substate: substateOptions[0] || "" })); }, [substateOptions.join("\u0000"), form.substate]);
  useEffect(() => { if (responsibles.length && !responsibles.includes(form.responsible)) setForm((current) => ({ ...current, responsible: responsibles[0] })); }, [responsibles, form.responsible]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({ ...form, ...customValues, id: `LOCAL-${Date.now()}`, expediente: form.number, created: new Date().toLocaleDateString("es-AR"), secretary: "—", judge: "—", process: form.type, lastUpdate: new Date().toLocaleDateString("es-AR"), lastOrder: "—", location: "—" });
  }

  return <><div className="page-title-row"><div><p className="eyebrow">CASOS / ADMINISTRACIÓN</p><h1>Alta de caso</h1><p className="muted">El registro quedará guardado en la base SQLite local.</p></div><button className="secondary-button" onClick={onCancel}>Volver a búsqueda</button></div><section className="panel fields-panel"><form onSubmit={submit}><div className="fields-grid">{([ ["number", "Número de expediente"], ["title", "Carátula"], ["claimant", "Demandante"], ["defendant", "Demandado"], ["type", "Tipo de caso"], ["year", "Año"], ["amount", "Monto"], ["court", "Juzgado"] ] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><input required={key === "number"} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label className="field"><span>Jurisdicción</span><select value={form.jurisdiction} onChange={(event) => setForm((current) => ({ ...current, jurisdiction: event.target.value }))}>{jurisdictions.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Portfolio</span><select value={form.portfolio} onChange={(event) => setForm((current) => ({ ...current, portfolio: event.target.value }))}>{portfolios.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Subestado</span><select value={form.substate} onChange={(event) => setForm((current) => ({ ...current, substate: event.target.value }))}>{!substateOptions.length && <option value="">Sin subestado</option>}{substateOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Responsable</span><select value={form.responsible} onChange={(event) => setForm((current) => ({ ...current, responsible: event.target.value }))}>{responsibles.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Estado judicial</span><select value={form.state} onChange={(event) => { const state = event.target.value; const options = substatesFor(substatesByState, state); setForm((current) => ({ ...current, state, substate: options.includes(current.substate) ? current.substate : options[0] || "" })); }}>{states.map((state) => <option key={state}>{state}</option>)}</select></label>{customFields.map((field) => <label className="field" key={field.key}><span>{field.label}</span><input type={field.inputType || "text"} value={customValues[field.key] || ""} onChange={(event) => setCustomValues((current) => ({ ...current, [field.key]: event.target.value }))} /></label>)}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit">Guardar caso</button></div></form></section></>;
}

function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(value.trim()); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; value = "";
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function sanitizeCsv(text: string) {
  return parseCsv(text).map((row) => row.map((cell) => {
    const trimmed = cell.trimStart();
    const formulaLike = /^[=+@]/.test(trimmed) || (trimmed.startsWith("-") && !/^-[0-9]+(?:[.,][0-9]+)?$/.test(trimmed.trim()));
    const safe = formulaLike ? `'${cell}` : cell;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
}

const csvAliases: Record<string, string> = {
  id: "id", expdteid: "id", expdtenro: "number", numero: "number", numeroexpediente: "number", expediente: "number",
  expdtecaratula: "title", caratula: "title", titulo: "title",
  expdteactor: "claimant", actor: "claimant", demandante: "claimant",
  expdtedemandado: "defendant", demandado: "defendant",
  responsable: "responsible", abogado: "responsible", abogadoasignado: "responsible",
  portfolio: "portfolio", subestado: "substate", subestadojudicial: "substate",
  tipo: "type", tipodecaso: "type", estado: "state", estadojudicial: "state", anio: "year", ano: "year",
  jurisdiccion: "jurisdiction", juzgado: "court", monto: "amount", montojucio: "amount", montojuicio: "amount",
};

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function downloadCsvTemplate(headers: string[], filename: string) {
  const content = `${headers.map((header) => `"${header}"`).join(",")}\r\n`;
  const url = URL.createObjectURL(new Blob([sanitizeCsv(content)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

function ImportCasesPage({ defaultState, customFields, onImport, onCancel }: { defaultState: string; customFields: CaseField[]; onImport: (rows: { fields: Record<string, string> }[]) => Promise<void>; onCancel: () => void }) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<{ fields: Record<string, string> }[]>([]);
  const [invalid, setInvalid] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function readFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setError("");
    setPreview([]);
    setInvalid(0);
    if (!/\.csv$/i.test(file.name)) return setError("Por ahora se admite CSV; guarda la planilla como CSV UTF-8.");
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return setError("El CSV debe incluir encabezados y al menos una fila.");
    const headers = rows[0].map(normalizeHeader);
    const customHeaders = new Map(customFields.map((field) => [normalizeHeader(field.label), field.key]));
    const numberIndex = headers.findIndex((header) => csvAliases[header] === "number");
    if (numberIndex < 0) return setError("Falta una columna de expediente (ExpdteNro, Número o Expediente).");
    let skipped = 0;
    const imported = rows.slice(1).map((row) => {
      const fields: Record<string, string> = {};
      headers.forEach((header, index) => {
        const target = csvAliases[header] || customHeaders.get(header);
        const value = String(row[index] || "").trim();
        if (target && value) fields[target] = value;
      });
      if (!fields.state) fields.state = defaultState;
      if (!fields.number) skipped++;
      return { fields };
    }).filter((row) => Boolean(row.fields.number));
    setPreview(imported);
    setInvalid(skipped);
    setError(imported.length ? "" : "No se encontraron filas con número de expediente.");
  }

  async function applyImport() {
    setBusy(true);
    try { await onImport(preview); }
    finally { setBusy(false); }
  }

  return <><div className="page-title-row"><div><p className="eyebrow">CASOS / PORTFOLIO</p><h1>Importar casos</h1><p className="muted">Carga CSV UTF-8 y revisa el resultado antes de insertarlo.</p></div><button className="secondary-button" onClick={onCancel}>Volver</button></div><section className="panel table-panel"><button className="secondary-button template-button" onClick={() => downloadCsvTemplate(["ExpdteNro", "Carátula", "Demandante", "Demandado", "Tipo", "Estado", "Año", "Monto", "Jurisdicción", "Juzgado", "Portfolio", "Subestado", "Responsable", ...customFields.map((field) => field.label)], "plantilla-importar-casos.csv")}>Descargar plantilla CSV</button><label className="field import-file"><span>Archivo CSV</span><input type="file" accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0])}/></label>{fileName && <p className="muted">Archivo: {fileName} · {preview.length} filas válidas · {invalid} filas sin número se omiten.</p>}{error && <div className="inline-error" role="alert">{error}</div>}{preview.length > 0 && <><div className="table-wrap"><table><thead><tr><th>Número</th><th>Carátula</th><th>Demandante</th><th>Demandado</th><th>Estado</th></tr></thead><tbody>{preview.slice(0, 8).map((row, index) => <tr key={`${row.fields.number}-${index}`}><td>{row.fields.number}</td><td>{row.fields.title || "—"}</td><td>{row.fields.claimant || "—"}</td><td>{row.fields.defendant || "—"}</td><td>{row.fields.state || defaultState}</td></tr>)}</tbody></table></div><div className="modal-actions"><span className="muted">Se omiten números ya existentes en la base local.</span><button className="primary-button" disabled={busy} onClick={() => void applyImport()}>{busy ? "Importando…" : `Importar ${preview.length} casos`}</button></div></>}</section></>;
}

function BulkUpdatePage({ customFields, onUpdate, onCancel }: { customFields: CaseField[]; onUpdate: (rows: { fields: Record<string, string> }[]) => Promise<void>; onCancel: () => void }) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<{ fields: Record<string, string> }[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function readFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setError("");
    setPreview([]);
    setSkipped(0);
    if (!/\.csv$/i.test(file.name)) return setError("Por ahora se admite CSV UTF-8; exporta la hoja de Excel como CSV.");
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return setError("El CSV debe incluir encabezados y filas para actualizar.");
    const headers = rows[0].map(normalizeHeader);
    const customHeaders = new Map(customFields.map((field) => [normalizeHeader(field.label), field.key]));
    const hasIdentifier = headers.some((header) => csvAliases[header] === "id" || csvAliases[header] === "number");
    if (!hasIdentifier) return setError("Incluye una columna ID/ExpdteId o Número/ExpdteNro para identificar el caso.");
    let invalid = 0;
    const parsed = rows.slice(1).map((row) => {
      const fields: Record<string, string> = {};
      headers.forEach((header, index) => {
        const field = csvAliases[header] || customHeaders.get(header);
        const value = String(row[index] || "").trim();
        if (field && value) fields[field] = value;
      });
      if (!fields.id && !fields.number) invalid++;
      return { fields };
    }).filter((item) => item.fields.id || item.fields.number);
    setPreview(parsed);
    setSkipped(invalid);
    if (!parsed.length) setError("No se encontraron filas actualizables.");
  }

  async function apply() {
    setBusy(true);
    try { await onUpdate(preview); }
    finally { setBusy(false); }
  }

  return <><div className="page-title-row"><div><p className="eyebrow">CASOS / PORTFOLIO</p><h1>Actualización masiva</h1><p className="muted">Actualiza campos de casos existentes por ID o número de expediente.</p></div><button className="secondary-button" onClick={onCancel}>Volver</button></div><section className="panel table-panel"><button className="secondary-button template-button" onClick={() => downloadCsvTemplate(["ID", "ExpdteNro", "Estado", "Carátula", "Demandante", "Demandado", "Tipo", "Año", "Monto", "Jurisdicción", "Juzgado", "Portfolio", "Subestado", "Responsable", ...customFields.map((field) => field.label)], "plantilla-actualizacion-casos.csv")}>Descargar plantilla CSV</button><label className="field import-file"><span>Archivo CSV</span><input type="file" accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0])}/></label>{fileName && <p className="muted">{fileName} · {preview.length} filas válidas · {skipped} sin identificador.</p>}{error && <div className="inline-error" role="alert">{error}</div>}{preview.length > 0 && <><div className="table-wrap"><table><thead><tr><th>ID</th><th>Número</th><th>Estado</th><th>Carátula</th><th>Demandante</th><th>Demandado</th></tr></thead><tbody>{preview.slice(0, 10).map((item, index) => <tr key={`${item.fields.id || item.fields.number}-${index}`}><td>{item.fields.id || "—"}</td><td>{item.fields.number || "—"}</td><td>{item.fields.state || "—"}</td><td>{item.fields.title || "—"}</td><td>{item.fields.claimant || "—"}</td><td>{item.fields.defendant || "—"}</td></tr>)}</tbody></table></div><p className="muted">Si un número coincide con varios casos, esa fila se informará como ambigua y no se actualizará. Usa el ID interno para desambiguar.</p><div className="modal-actions"><button className="primary-button" disabled={busy} onClick={() => void apply()}>{busy ? "Actualizando…" : `Aplicar a ${preview.length} filas`}</button></div></>}</section></>;
}

function SearchPage({ search, setSearch, cases, customFields, openCase, onCreate }: { search: string; setSearch: (v: string) => void; cases: CaseRecord[]; customFields: CaseField[]; openCase: (id: string) => void; onCreate: () => void }) {
  const [stateFilter, setStateFilter] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const states = [...new Set(cases.map((item) => item.fields.state).filter(Boolean))];
  const portfolios = [...new Set(cases.map((item) => item.fields.portfolio).filter(Boolean))];
  const rows = cases.filter((item) => JSON.stringify(item.fields).toLowerCase().includes(search.toLowerCase()) && (!stateFilter || item.fields.state === stateFilter) && (!portfolioFilter || item.fields.portfolio === portfolioFilter)).slice().sort((a, b) => sortBy === "number" ? String(a.fields.number || "").localeCompare(String(b.fields.number || ""), "es", { numeric: true }) : Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || ""));
  function exportCases() {
    const headers = ["ID", "Expediente", "Carátula", "Demandante", "Demandado", "Tipo", "Estado", "Portfolio", "Jurisdicción", "Responsable", "Actualizado", ...customFields.map((field) => field.label)];
    const data = [headers, ...rows.map((item) => [item.fields.id || item.id, item.fields.number || "", item.fields.title || "", item.fields.claimant || "", item.fields.defendant || "", item.fields.type || "", item.fields.state || "", item.fields.portfolio || "", item.fields.jurisdiction || "", item.fields.responsible || "", item.updatedAt || "", ...customFields.map((field) => item.fields[field.key] || "")])];
    const csv = sanitizeCsv(data.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n"));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "casos-local.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <><div className="page-title-row"><div><p className="eyebrow">CASOS</p><h1>Búsqueda de casos</h1><p className="muted">Expedientes guardados en la base local.</p></div><div className="title-actions"><button className="secondary-button" onClick={exportCases}>Exportar CSV</button><button className="primary-button" onClick={onCreate}>＋ Alta de caso</button></div></div><section className="panel table-panel"><div className="search-toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por expediente, parte o juzgado..."/><button className="secondary-button" onClick={() => setSearch("")}>Limpiar</button><select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="">Todos los estados</option>{states.map((state) => <option key={state}>{state}</option>)}</select><select value={portfolioFilter} onChange={(event) => setPortfolioFilter(event.target.value)}><option value="">Todos los portfolios</option>{portfolios.map((portfolio) => <option key={portfolio}>{portfolio}</option>)}</select><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recent">Más recientes</option><option value="number">Número de expediente</option></select><span className="muted">{rows.length} resultados</span></div>{rows.length ? <div className="table-wrap"><table><thead><tr>{["ID", "Expediente", "Carátula", "Tipo", "Estado", "Portfolio", "Responsable", ""].map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((record) => { const f = record.fields; return <tr key={record.id}><td>{f.id || record.id}</td><td>{f.number || "—"}</td><td>{f.title || `${f.claimant || "—"} c/ ${f.defendant || "—"}`}</td><td>{f.type || "—"}</td><td><span className="status-pill table-status">{f.state || "Sin estado"}</span></td><td>{f.portfolio || "—"}</td><td>{f.responsible || "Sin asignar"}</td><td><button className="text-button" onClick={() => openCase(record.id)}>Abrir →</button></td></tr>; })}</tbody></table></div> : <div className="empty-table">No hay expedientes. Usa “Alta de caso” para crear el primero.</div>}</section></>;
}

function FollowedCasesPage({ cases, onCaseUpdated, openCase }: { cases: CaseRecord[]; onCaseUpdated: (item: CaseRecord) => void; openCase: (id: string) => void }) {
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const followed = cases.filter((item) => item.followed).filter((item) => JSON.stringify(item.fields).toLowerCase().includes(filter.toLowerCase())).slice().sort((a, b) => Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || ""));
  async function exportCsv() {
    const rows = [["Expediente", "Carátula", "Demandante", "Demandado", "Estado", "Portfolio"], ...followed.map((item) => [item.fields.number || "", item.fields.title || "", item.fields.claimant || "", item.fields.defendant || "", item.fields.state || "", item.fields.portfolio || ""])];
    const csv = sanitizeCsv(rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n"));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "casos-en-seguimiento.csv"; link.click(); URL.revokeObjectURL(url);
  }
  async function removeFollow(item: CaseRecord) {
    setBusyId(item.id); setError("");
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(item.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followed: false }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo quitar el seguimiento");
      onCaseUpdated(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al actualizar seguimiento"); }
    finally { setBusyId(""); }
  }
  return <><div className="page-title-row"><div><p className="eyebrow">TRABAJO DIARIO</p><h1>Seguimiento</h1><p className="muted">Expedientes marcados con la estrella.</p></div><button className="secondary-button" onClick={() => void exportCsv()}>Exportar CSV</button></div><section className="panel table-panel">{error && <div className="inline-error" role="alert">{error}</div>}<div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar en expedientes seguidos..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><span className="muted">{followed.length} expedientes</span></div>{followed.length ? <div className="table-wrap"><table><thead><tr><th>Expediente</th><th>Carátula</th><th>Demandante</th><th>Demandado</th><th>Estado</th><th>Portfolio</th><th>Acción</th></tr></thead><tbody>{followed.map((record) => <tr key={record.id}><td>{record.fields.number || "—"}</td><td>{record.fields.title || "—"}</td><td>{record.fields.claimant || "—"}</td><td>{record.fields.defendant || "—"}</td><td>{record.fields.state || "Sin estado"}</td><td>{record.fields.portfolio || "—"}</td><td><button className="text-button" onClick={() => openCase(record.id)}>Abrir →</button><button className="text-button danger-text" disabled={busyId === record.id} onClick={() => void removeFollow(record)}>{busyId === record.id ? "Actualizando…" : "Quitar"}</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay expedientes en seguimiento. Marca la estrella en una ficha para agregarla aquí.</div>}</section></>;
}

function ReportsPage({ cases, customFields, onSaved }: { cases: CaseRecord[]; customFields: CaseField[]; onSaved: (message: string) => void }) {
  const [stateFilter, setStateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const states = [...new Set(cases.map((item) => item.fields.state).filter(Boolean))];
  const types = [...new Set(cases.map((item) => item.fields.type).filter(Boolean))];
  const portfolios = [...new Set(cases.map((item) => item.fields.portfolio).filter(Boolean))];
  const jurisdictions = [...new Set(cases.map((item) => item.fields.jurisdiction).filter(Boolean))];
  const fromTimestamp = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
  const toTimestamp = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
  const rows = cases.filter((item) => {
    if (stateFilter && item.fields.state !== stateFilter) return false;
    if (typeFilter && item.fields.type !== typeFilter) return false;
    if (portfolioFilter && item.fields.portfolio !== portfolioFilter) return false;
    if (jurisdictionFilter && item.fields.jurisdiction !== jurisdictionFilter) return false;
    if (fromTimestamp !== null || toTimestamp !== null) {
      const created = Date.parse(item.createdAt || "") || agendaTimestamp(item.fields.created || "");
      if (!created || (fromTimestamp !== null && created < fromTimestamp) || (toTimestamp !== null && created > toTimestamp)) return false;
    }
    return true;
  });
  const total = rows.reduce((sum, item) => sum + parseAmount(item.fields.amount), 0);

  function exportReport() {
    const lines = [["Expediente", "Demandante", "Demandado", "Tipo", "Estado", "Portfolio", "Jurisdicción", "Monto", ...customFields.map((field) => field.label)], ...rows.map((item) => [item.fields.number || "", item.fields.claimant || "", item.fields.defendant || "", item.fields.type || "", item.fields.state || "", item.fields.portfolio || "", item.fields.jurisdiction || "", item.fields.amount || "", ...customFields.map((field) => item.fields[field.key] || "")])];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    link.download = "reporte-legalrun-local.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function saveReport() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const createdAt = new Date().toISOString();
      const criteria = { state: stateFilter || "Todos", type: typeFilter || "Todos", portfolio: portfolioFilter || "Todos", jurisdiction: jurisdictionFilter || "Todas", from: fromDate || "Sin límite", to: toDate || "Sin límite" };
      const snapshot = rows.map((item) => ({
        number: item.fields.number || "",
        claimant: item.fields.claimant || "",
        defendant: item.fields.defendant || "",
        type: item.fields.type || "",
        state: item.fields.state || "",
        portfolio: item.fields.portfolio || "",
        jurisdiction: item.fields.jurisdiction || "",
        amount: item.fields.amount || "",
        customFields: customFields.map((field) => ({ key: field.key, label: field.label, value: item.fields[field.key] || "" })),
      }));
      const values = [name.trim(), new Date(createdAt).toLocaleDateString("es-AR"), `CSV · ${rows.length} casos`, "Disponible"];
      const response = await fetch("/api/modules/admin/mis_reportes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, criteria, snapshot, totalCases: rows.length, totalAmount: total, createdAt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el reporte");
      setName("");
      onSaved("Reporte y copia de datos guardados en Mis reportes");
    } catch (error) {
      onSaved(error instanceof Error ? error.message : "No se pudo guardar el reporte");
    } finally {
      setSaving(false);
    }
  }

  return <><div className="page-title-row"><div><p className="eyebrow">SEGUIMIENTO</p><h1>Reportes</h1><p className="muted">Filtra casos y calcula sumatorias sobre la base local.</p></div><button className="secondary-button" onClick={() => window.print()}>Imprimir</button></div><section className="panel report-builder"><div className="form-grid"><label className="field"><span>Estado judicial</span><select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="">Todos</option>{states.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Tipo de caso</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todos</option>{types.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Portfolio</span><select value={portfolioFilter} onChange={(event) => setPortfolioFilter(event.target.value)}><option value="">Todos</option>{portfolios.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Jurisdicción</span><select value={jurisdictionFilter} onChange={(event) => setJurisdictionFilter(event.target.value)}><option value="">Todas</option>{jurisdictions.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Alta desde</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="field"><span>Alta hasta</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label className="field"><span>Guardar como</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Casos en trámite" /></label></div><div className="report-summary"><div><span>Casos filtrados</span><strong>{rows.length}</strong></div><div><span>Sumatoria de montos</span><strong>{formatAmount(total)}</strong></div><div><span>Base</span><strong>SQLite local</strong></div></div><div className="modal-actions"><button className="secondary-button" onClick={exportReport}>Exportar CSV</button><button className="primary-button" onClick={() => void saveReport()} disabled={!name.trim() || saving}>{saving ? "Guardando…" : "Guardar en Mis reportes"}</button></div></section><section className="panel table-panel report-results"><div className="panel-heading"><div><h3>Detalle del reporte</h3><p>Los registros y la sumatoria se actualizan con los filtros.</p></div></div><div className="table-wrap"><table><thead><tr>{["Expediente", "Demandante", "Demandado", "Tipo", "Estado", "Portfolio", "Jurisdicción", "Monto"].map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td>{item.fields.number || "—"}</td><td>{item.fields.claimant || "—"}</td><td>{item.fields.defendant || "—"}</td><td>{item.fields.type || "—"}</td><td>{item.fields.state || "—"}</td><td>{item.fields.portfolio || "—"}</td><td>{item.fields.jurisdiction || "—"}</td><td>{item.fields.amount || "—"}</td></tr>)}</tbody></table></div></section></>;
}

type SavedCaseSnapshot = { number: string; claimant: string; defendant: string; type: string; state: string; portfolio: string; jurisdiction: string; amount: string; customFields?: { key: string; label: string; value: string }[] };
type SavedReport = { id: string; values: string[]; criteria?: { state?: string; type?: string; portfolio?: string; jurisdiction?: string; from?: string; to?: string }; snapshot?: SavedCaseSnapshot[]; totalAmount?: number; createdAt?: string };

function SavedReportsPage({ onSaved }: { onSaved: (message: string) => void }) {
  const moduleKey = "admin/mis_reportes";
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selected = reports.find((report) => report.id === selectedId) || null;

  async function loadReports() {
    setLoading(true);
    try {
      let response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, { cache: "no-store" });
      let data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los reportes");
      if (!data.initialized) {
        response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/initialize`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: [] }),
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo inicializar Mis reportes");
      }
      setReports(data.records || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al cargar reportes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadReports(); }, []);

  const filtered = reports.filter((report) => JSON.stringify(report.values).toLowerCase().includes(filter.toLowerCase()));
  async function deleteReport(id: string) {
    if (!window.confirm("¿Eliminar este reporte guardado? La copia local también se eliminará.")) return;
    const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return setError("No se pudo eliminar el reporte");
    setReports((current) => current.filter((report) => report.id !== id));
    if (selectedId === id) setSelectedId("");
    onSaved("Reporte eliminado de SQLite local");
  }

  function exportSnapshot(report: SavedReport) {
    if (!report.snapshot?.length) return setError("Este registro no contiene una copia de datos exportable.");
    const customColumns = report.snapshot[0].customFields || [];
    const headers = ["Expediente", "Demandante", "Demandado", "Tipo", "Estado", "Portfolio", "Jurisdicción", "Monto", ...customColumns.map((field) => field.label)];
    const rows = [headers, ...report.snapshot.map((item) => [item.number, item.claimant, item.defendant, item.type, item.state, item.portfolio, item.jurisdiction, item.amount, ...customColumns.map((field) => item.customFields?.find((custom) => custom.key === field.key)?.value || "")])];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${slug(report.values[0] || "reporte")}-snapshot.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <><div className="page-title-row"><div><p className="eyebrow">REPORTES</p><h1>Mis reportes</h1><p className="muted">Informes guardados con copia de sus filtros y datos.</p></div><a className="secondary-button button-link" href="#/admin/report">Crear reporte</a></div>{error && <div className="inline-error" role="alert">{error}</div>}<section className="panel table-panel"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por nombre o formato..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><span className="muted">{filtered.length} reportes</span></div>{loading ? <div className="empty-table">Cargando reportes…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Fecha</th><th>Formato / casos</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map((report) => <tr key={report.id}><td>{report.values[0] || "Reporte sin nombre"}</td><td>{report.values[1] || "—"}</td><td>{report.values[2] || "—"}</td><td>{report.values[3] || "Disponible"}</td><td><button className="text-button" onClick={() => setSelectedId(report.id)}>Abrir</button><button className="text-button" onClick={() => exportSnapshot(report)} disabled={!report.snapshot?.length}>CSV</button><button className="text-button danger-text" onClick={() => void deleteReport(report.id)}>Eliminar</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay reportes guardados todavía. Crea uno desde Reportes.</div>}</section>{selected && <section className="panel table-panel report-results"><div className="panel-heading"><div><h3>{selected.values[0] || "Reporte guardado"}</h3><p>Snapshot guardado {selected.createdAt ? new Date(selected.createdAt).toLocaleString("es-AR") : selected.values[1] || ""} · {selected.snapshot?.length || 0} filas</p></div><div className="title-actions"><button className="secondary-button" onClick={() => exportSnapshot(selected)}>Exportar snapshot CSV</button><button className="secondary-button" onClick={() => setSelectedId("")}>Cerrar</button></div></div><p className="muted">Filtros guardados: estado {selected.criteria?.state || "—"}; tipo {selected.criteria?.type || "—"}; portfolio {selected.criteria?.portfolio || "—"}; jurisdicción {selected.criteria?.jurisdiction || "—"}; alta desde {selected.criteria?.from || "sin límite"} hasta {selected.criteria?.to || "sin límite"}. Sumatoria al guardar: {formatAmount(selected.totalAmount || 0)}.</p>{selected.snapshot?.length ? <div className="table-wrap"><table><thead><tr><th>Expediente</th><th>Demandante</th><th>Demandado</th><th>Tipo</th><th>Estado</th><th>Portfolio</th><th>Jurisdicción</th><th>Monto</th>{(selected.snapshot?.[0]?.customFields || []).map((field) => <th key={field.key}>{field.label}</th>)}</tr></thead><tbody>{selected.snapshot.map((item, index) => <tr key={`${item.number}-${index}`}><td>{item.number || "—"}</td><td>{item.claimant || "—"}</td><td>{item.defendant || "—"}</td><td>{item.type || "—"}</td><td>{item.state || "—"}</td><td>{item.portfolio || "—"}</td><td>{item.jurisdiction || "—"}</td><td>{item.amount || "—"}</td>{(selected.snapshot?.[0]?.customFields || []).map((field) => <td key={field.key}>{item.customFields?.find((custom) => custom.key === field.key)?.value || "—"}</td>)}</tr>)}</tbody></table></div> : <div className="empty-table">Este reporte previo guarda metadatos, pero no contiene un snapshot.</div>}</section>}</>;
}

function parseAmount(value = "") {
  const cleaned = String(value).replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

type AgendaRecord = { id: string; values: string[]; caseId?: string; details?: string; createdAt?: string };

function agendaTimestamp(dateValue = "", timeValue = "") {
  const date = String(dateValue).trim();
  const time = String(timeValue || "00:00").trim();
  const local = date.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (local) return new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]), Number(time.slice(0, 2)) || 0, Number(time.slice(3, 5)) || 0).getTime();
  const parsed = Date.parse(`${date}T${time.length === 5 ? time : "00:00"}:00`);
  return Number.isFinite(parsed) ? parsed : 0;
}

function agendaInputDate(value = "") {
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  return match ? `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}` : "";
}

function AgendaPage({ cases, openCase, onSaved }: { cases: CaseRecord[]; openCase: (id: string) => void; onSaved: (message: string) => void }) {
  const moduleKey = "client/agenda";
  const responsibleCatalog = useModuleCatalog("client/configuracion/usersAbogado", defaultResponsibles);
  const [records, setRecords] = useState<AgendaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [period, setPeriod] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");
  const [caseId, setCaseId] = useState("");
  const [responsible, setResponsible] = useState("");
  const [status, setStatus] = useState("Pendiente");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const responsibleChoices = [...new Set([...responsibleCatalog, responsible || "Sin asignar"] )];

  async function load() {
    setLoading(true);
    try {
      let response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, { cache: "no-store" });
      let data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar la agenda");
      if (!data.initialized) {
        response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/initialize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: [] }) });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo inicializar la agenda");
      }
      setRecords(data.records || []); setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al cargar la agenda");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId(null); setDate(""); setTime(""); setActivity(""); setCaseId(""); setResponsible("Sin asignar"); setStatus("Pendiente"); setDetails("");
  }

  function edit(record: AgendaRecord) {
    setEditingId(record.id); setDate(agendaInputDate(record.values[0])); setTime(record.values[1] === "—" ? "" : record.values[1] || "");
    setActivity(record.values[2] || ""); setCaseId(record.caseId || ""); setResponsible(record.values[4] === "—" ? "Sin asignar" : record.values[4] || "Sin asignar");
    setStatus(record.values[5] || "Pendiente"); setDetails(record.details || ""); setShowForm(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const selectedCase = cases.find((item) => item.id === caseId);
    const values = [date, time || "—", activity.trim(), selectedCase?.fields.number || "—", responsible.trim() || "—", status];
    const body = { values, caseId: selectedCase?.id || "", details: details.trim() };
    try {
      const url = `/api/modules/${encodeURIComponent(moduleKey)}${editingId ? `/${encodeURIComponent(editingId)}` : ""}`;
      const response = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la actividad");
      setRecords((current) => editingId ? current.map((item) => item.id === editingId ? result : item) : [result, ...current]);
      resetForm(); setShowForm(false); setError("");
      onSaved(editingId ? "Actividad actualizada en la agenda" : "Actividad guardada en la agenda");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al guardar"); }
    finally { setBusy(false); }
  }

  async function changeStatus(record: AgendaRecord, nextStatus: string) {
    const values = [...record.values]; values[5] = nextStatus;
    const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(record.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "No se pudo actualizar el estado");
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, values: data.values || values } : item));
    onSaved("Estado de agenda actualizado");
  }

  async function remove(recordId: string) {
    if (!window.confirm("¿Eliminar esta actividad local de la agenda?")) return;
    const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(recordId)}`, { method: "DELETE" });
    if (!response.ok) return setError("No se pudo eliminar la actividad");
    setRecords((current) => current.filter((item) => item.id !== recordId));
    onSaved("Actividad eliminada de SQLite local");
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = dayStart + 86_400_000;
  const weekEnd = dayStart + 7 * 86_400_000;
  const dated = records.map((record) => ({ ...record, timestamp: agendaTimestamp(record.values[0], record.values[1]) }));
  const overdueCount = dated.filter((item) => item.timestamp < dayStart && item.values[5] !== "Completada" && item.values[5] !== "Cancelada").length;
  const todayCount = dated.filter((item) => item.timestamp >= dayStart && item.timestamp < tomorrow && item.values[5] !== "Completada" && item.values[5] !== "Cancelada").length;
  const upcomingCount = dated.filter((item) => item.timestamp >= tomorrow && item.timestamp < weekEnd && item.values[5] !== "Completada" && item.values[5] !== "Cancelada").length;
  const filtered = dated.filter((item) => {
    const active = item.values[5] !== "Completada" && item.values[5] !== "Cancelada";
    const matchesPeriod = period === "all" || (period === "overdue" && item.timestamp < dayStart && active) || (period === "today" && item.timestamp >= dayStart && item.timestamp < tomorrow && active) || (period === "upcoming" && item.timestamp >= tomorrow && item.timestamp < weekEnd && active) || (period === "completed" && (item.values[5] === "Completada" || item.values[5] === "Cancelada"));
    return matchesPeriod && `${item.values.join(" ")} ${item.details || ""}`.toLowerCase().includes(filter.toLowerCase());
  }).sort((a, b) => a.timestamp - b.timestamp);

  function exportCsv() {
    const rows = [["Fecha", "Hora", "Actividad", "Expediente", "Responsable", "Estado", "Detalle"], ...filtered.map((item) => [...item.values, item.details || ""])];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "agenda-local.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <><div className="page-title-row"><div><p className="eyebrow">TRABAJO DIARIO</p><h1>Agenda</h1><p className="muted">Actividades y vencimientos guardados localmente.</p></div><div className="title-actions"><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button><button className="primary-button" onClick={() => { resetForm(); setShowForm(true); }}>＋ Nueva actividad</button></div></div><div className="agenda-kpis"><button className={period === "overdue" ? "agenda-kpi selected" : "agenda-kpi"} onClick={() => setPeriod("overdue")}><span>Atrasadas</span><strong>{overdueCount}</strong></button><button className={period === "today" ? "agenda-kpi selected" : "agenda-kpi"} onClick={() => setPeriod("today")}><span>Hoy</span><strong>{todayCount}</strong></button><button className={period === "upcoming" ? "agenda-kpi selected" : "agenda-kpi"} onClick={() => setPeriod("upcoming")}><span>Próximos 7 días</span><strong>{upcomingCount}</strong></button><button className={period === "all" ? "agenda-kpi selected" : "agenda-kpi"} onClick={() => setPeriod("all")}><span>Todas</span><strong>{records.length}</strong></button></div>{error && <div className="inline-error" role="alert">{error}</div>}{showForm && <section className="panel agenda-form-panel"><div className="panel-heading"><div><h3>{editingId ? "Editar actividad" : "Nueva actividad"}</h3><p>Completa los datos y guarda en SQLite local.</p></div></div><form className="agenda-form" onSubmit={(event) => void save(event)}><label className="field"><span>Fecha</span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field"><span>Hora</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><label className="field"><span>Actividad</span><input required value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="Ej. Revisar vencimiento" /></label><label className="field"><span>Expediente asociado</span><select value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">Sin expediente asociado</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.fields.number || item.id} · {item.fields.title || "Caso local"}</option>)}</select></label><label className="field"><span>Responsable</span><select value={responsible} onChange={(event) => setResponsible(event.target.value)}>{responsibleChoices.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Pendiente</option><option>En curso</option><option>Completada</option><option>Cancelada</option></select></label><label className="field agenda-detail"><span>Detalle</span><textarea rows={3} value={details} onChange={(event) => setDetails(event.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}>{busy ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar actividad"}</button></div></form></section>}<section className="panel table-panel report-results"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar actividad, responsable o expediente..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Todos los períodos</option><option value="overdue">Atrasadas</option><option value="today">Hoy</option><option value="upcoming">Próximos 7 días</option><option value="completed">Completadas / canceladas</option></select><span className="muted">{filtered.length} actividades</span></div>{loading ? <div className="empty-table">Cargando agenda…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Hora</th><th>Actividad</th><th>Expediente</th><th>Responsable</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.values[0] || "—"}</td><td>{item.values[1] || "—"}</td><td title={item.details}>{item.values[2] || "—"}</td><td>{item.caseId ? <button className="text-button" onClick={() => openCase(item.caseId!)}>{item.values[3] || "Abrir"}</button> : item.values[3] || "—"}</td><td>{item.values[4] || "—"}</td><td><select aria-label="Estado de actividad" value={item.values[5] || "Pendiente"} onChange={(event) => void changeStatus(item, event.target.value)}><option>Pendiente</option><option>En curso</option><option>Completada</option><option>Cancelada</option></select></td><td><button className="text-button" onClick={() => edit(item)}>Editar</button><button className="text-button danger-text" onClick={() => void remove(item.id)}>Eliminar</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay actividades en este filtro.</div>}</section></>;
}

type InboxRecord = { id: string; values: string[]; caseId?: string; message?: string; createdAt?: string };

function InboxPage({ cases, openCase, onSaved }: { cases: CaseRecord[]; openCase: (id: string) => void; onSaved: (message: string) => void }) {
  const moduleKey = "client/inbox";
  const [records, setRecords] = useState<InboxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [caseId, setCaseId] = useState("");
  const [status, setStatus] = useState("Nuevo");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      let response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, { cache: "no-store" });
      let data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar Inbox");
      if (!data.initialized) {
        response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/initialize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: [] }) });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo inicializar Inbox");
      }
      setRecords(data.records || []); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al cargar Inbox"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId(null); setDate(new Date().toISOString().slice(0, 10)); setSubject(""); setSender(""); setCaseId(""); setStatus("Nuevo"); setMessage("");
  }
  function edit(record: InboxRecord) {
    setEditingId(record.id); setDate(agendaInputDate(record.values[0])); setSubject(record.values[1] || "");
    setSender(record.values[2] || ""); setCaseId(record.caseId || ""); setStatus(record.values[4] || "Nuevo");
    setMessage(record.message || ""); setShowForm(true);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const selectedCase = cases.find((item) => item.id === caseId);
    const values = [date, subject.trim(), sender.trim(), selectedCase?.fields.number || "—", status];
    const body = { values, caseId: selectedCase?.id || "", message: message.trim() };
    try {
      const path = `/api/modules/${encodeURIComponent(moduleKey)}${editingId ? `/${encodeURIComponent(editingId)}` : ""}`;
      const response = await fetch(path, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el mensaje");
      setRecords((current) => editingId ? current.map((item) => item.id === editingId ? data : item) : [data, ...current]);
      resetForm(); setShowForm(false); setError(""); onSaved(editingId ? "Mensaje actualizado en Inbox" : "Mensaje agregado a Inbox");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al guardar mensaje"); }
    finally { setBusy(false); }
  }
  async function changeStatus(record: InboxRecord, next: string) {
    const values = [...record.values]; values[4] = next;
    const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(record.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "No se pudo cambiar el estado");
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, values: data.values || values } : item));
    onSaved("Estado del mensaje actualizado");
  }
  async function remove(id: string) {
    if (!window.confirm("¿Eliminar este mensaje local?")) return;
    const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return setError("No se pudo eliminar el mensaje");
    setRecords((current) => current.filter((item) => item.id !== id)); onSaved("Mensaje eliminado de Inbox");
  }

  const unread = records.filter((item) => (item.values[4] || "Nuevo") === "Nuevo").length;
  const filtered = records.filter((item) => (statusFilter === "all" || (item.values[4] || "Nuevo") === statusFilter) && `${item.values.join(" ")} ${item.message || ""}`.toLowerCase().includes(filter.toLowerCase())).slice().sort((a, b) => agendaTimestamp(b.values[0]) - agendaTimestamp(a.values[0]));
  function exportCsv() {
    const rows = [["Fecha", "Asunto", "Remitente", "Expediente", "Estado", "Mensaje"], ...filtered.map((item) => [...item.values, item.message || ""])];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "inbox-local.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <><div className="page-title-row"><div><p className="eyebrow">TRABAJO DIARIO</p><h1>Inbox</h1><p className="muted">Mensajes y tareas recibidos guardados en SQLite local.</p></div><div className="title-actions"><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button><button className="primary-button" onClick={() => { resetForm(); setShowForm(true); }}>＋ Nuevo mensaje</button></div></div><div className="inbox-banner"><span>{unread} mensajes nuevos</span><span>Los mensajes se almacenan solo en esta réplica local.</span></div>{error && <div className="inline-error" role="alert">{error}</div>}{showForm && <section className="panel agenda-form-panel"><div className="panel-heading"><div><h3>{editingId ? "Editar mensaje" : "Nuevo mensaje"}</h3><p>Registra un mensaje o tarea recibida.</p></div></div><form className="agenda-form" onSubmit={(event) => void save(event)}><label className="field"><span>Fecha</span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field"><span>Asunto</span><input required value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label className="field"><span>Remitente</span><input required value={sender} onChange={(event) => setSender(event.target.value)} /></label><label className="field"><span>Expediente asociado</span><select value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">Sin expediente asociado</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.fields.number || item.id} · {item.fields.title || "Caso local"}</option>)}</select></label><label className="field"><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Nuevo</option><option>Leído</option><option>Respondido</option><option>Archivado</option></select></label><label className="field agenda-detail"><span>Mensaje / detalle</span><textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}>{busy ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar mensaje"}</button></div></form></section>}<section className="panel table-panel report-results"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar asunto, remitente o expediente..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option><option>Nuevo</option><option>Leído</option><option>Respondido</option><option>Archivado</option></select><span className="muted">{filtered.length} mensajes</span></div>{loading ? <div className="empty-table">Cargando Inbox…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Asunto</th><th>Remitente</th><th>Expediente</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.values[0] || "—"}</td><td title={item.message}>{item.values[1] || "—"}</td><td>{item.values[2] || "—"}</td><td>{item.caseId ? <button className="text-button" onClick={() => openCase(item.caseId!)}>{item.values[3] || "Abrir"}</button> : item.values[3] || "—"}</td><td><select aria-label="Estado del mensaje" value={item.values[4] || "Nuevo"} onChange={(event) => void changeStatus(item, event.target.value)}><option>Nuevo</option><option>Leído</option><option>Respondido</option><option>Archivado</option></select></td><td><button className="text-button" onClick={() => edit(item)}>Editar</button><button className="text-button danger-text" onClick={() => void remove(item.id)}>Eliminar</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay mensajes en este filtro.</div>}</section></>;
}

type MovementItem = { id: string; caseId: string; caseNumber: string; caseTitle: string; court: string; date: string; title: string; description: string; user: string; status: string; createdAt: string };

function MovementsPage({ cases, openCase, onSaved }: { cases: CaseRecord[]; openCase: (id: string) => void; onSaved: (message: string) => void }) {
  const [items, setItems] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/dashboards/movements", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar las novedades");
        if (!cancelled) setItems(data.items || []);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Error al cargar novedades"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);

  function resetForm() { setCaseId(""); setDate(new Date().toISOString().slice(0, 10)); setTitle(""); setDescription(""); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cases.some((item) => item.id === caseId)) return setError("Selecciona un expediente válido.");
    setBusy(true);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/entries/movements`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, title: title.trim(), description: description.trim(), user: "Cuenta local", state: "Nuevo" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo registrar el movimiento");
      resetForm(); setShowForm(false); setError(""); setRefresh((value) => value + 1);
      onSaved("Novedad guardada en el expediente");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al guardar novedad"); }
    finally { setBusy(false); }
  }
  async function changeStatus(item: MovementItem, status: string) {
    const response = await fetch(`/api/cases/${encodeURIComponent(item.caseId)}/entries/movements/${encodeURIComponent(item.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: status }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "No se pudo actualizar la novedad");
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: data.state || status } : entry));
    onSaved("Estado de novedad actualizado");
  }
  const filtered = items.filter((item) => (statusFilter === "all" || item.status === statusFilter) && `${item.caseNumber} ${item.caseTitle} ${item.title} ${item.description} ${item.court} ${item.user}`.toLowerCase().includes(filter.toLowerCase()));
  function exportCsv() {
    const rows = [["Fecha", "Expediente", "Carátula", "Movimiento", "Descripción", "Juzgado", "Usuario", "Estado"], ...filtered.map((item) => [item.date, item.caseNumber, item.caseTitle, item.title, item.description, item.court, item.user, item.status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "novedades-juicios-local.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <><div className="page-title-row"><div><p className="eyebrow">TRABAJO DIARIO</p><h1>Novedades de juicios</h1><p className="muted">Movimientos consolidados desde los expedientes locales.</p></div><div className="title-actions"><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button><button className="primary-button" onClick={() => { resetForm(); setShowForm(true); }}>＋ Registrar movimiento</button></div></div>{error && <div className="inline-error" role="alert">{error}</div>}{showForm && <section className="panel agenda-form-panel"><div className="panel-heading"><div><h3>Nuevo movimiento judicial</h3><p>Se guardará en la pestaña Novedades del caso seleccionado.</p></div></div><form className="agenda-form" onSubmit={(event) => void save(event)}><label className="field"><span>Expediente</span><select required value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">Seleccionar expediente</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.fields.number || item.id} · {item.fields.title || "Caso local"}</option>)}</select></label><label className="field"><span>Fecha</span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field"><span>Movimiento</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Presentación ingresada" /></label><label className="field agenda-detail"><span>Descripción</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Guardando…" : "Guardar movimiento"}</button></div></form></section>}<section className="panel table-panel report-results"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por expediente, movimiento o juzgado..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option><option>Nuevo</option><option>Pendiente</option><option>Revisado</option></select><span className="muted">{filtered.length} novedades</span></div>{loading ? <div className="empty-table">Cargando movimientos locales…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Expediente</th><th>Movimiento</th><th>Descripción</th><th>Juzgado</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.date}</td><td><button className="text-button" onClick={() => openCase(item.caseId)}>{item.caseNumber}</button></td><td>{item.title}</td><td>{item.description || "—"}</td><td>{item.court}</td><td><select aria-label="Estado de novedad" value={item.status} onChange={(event) => void changeStatus(item, event.target.value)}><option>Nuevo</option><option>Pendiente</option><option>Revisado</option></select></td><td><button className="text-button" onClick={() => openCase(item.caseId)}>Abrir caso</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay movimientos que coincidan con el filtro.</div>}</section></>;
}

type DocumentStatusItem = { id: string; caseId: string; section: string; caseNumber: string; title: string; type: string; date: string; status: string; fileName: string; hasFile: boolean; user: string; createdAt: string };

function DocumentStatusPage({ openCase, onSaved }: { openCase: (id: string) => void; onSaved: (message: string) => void }) {
  const [items, setItems] = useState<DocumentStatusItem[]>([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboards/documents", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el estado de documentos");
      if (!cancelled) { setItems(data.items || []); setTruncated(Boolean(data.truncated)); }
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Error al cargar documentos"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function changeStatus(item: DocumentStatusItem, status: string) {
    const response = await fetch(`/api/cases/${encodeURIComponent(item.caseId)}/entries/${encodeURIComponent(item.section)}/${encodeURIComponent(item.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: status }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "No se pudo actualizar el estado");
    setItems((current) => current.map((record) => record.id === item.id ? { ...record, status: data.state || status } : record));
    onSaved("Estado del documento actualizado");
  }
  const statuses = [...new Set(items.map((item) => item.status))];
  const filtered = items.filter((item) => (statusFilter === "all" || item.status === statusFilter) && `${item.caseNumber} ${item.title} ${item.type} ${item.fileName} ${item.user}`.toLowerCase().includes(filter.toLowerCase()));
  function exportCsv() {
    const rows = [["Fecha", "Expediente", "Documento", "Tipo", "Estado", "Archivo", "Sección", "Usuario"], ...filtered.map((item) => [item.date, item.caseNumber, item.title, item.type, item.status, item.fileName, item.section, item.user])];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "estado-documentos-local.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <><div className="page-title-row"><div><p className="eyebrow">ADMINISTRACIÓN / DOCUMENTOS</p><h1>Estado de documentos</h1><p className="muted">Documentos y presentaciones asociados a casos locales.</p></div><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button></div><div className="agenda-kpis"><div className="agenda-kpi"><span>Total de registros</span><strong>{items.length}</strong></div><div className="agenda-kpi"><span>Pendientes</span><strong>{items.filter((item) => item.status === "Pendiente" || item.status === "Borrador").length}</strong></div><div className="agenda-kpi"><span>Presentados / aprobados</span><strong>{items.filter((item) => item.status === "Presentado" || item.status === "Aprobado").length}</strong></div></div>{error && <div className="inline-error" role="alert">{error}</div>}{truncated && <p className="muted">Se muestran los 5000 registros más recientes.</p>}<section className="panel table-panel"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por expediente, documento o archivo..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><span className="muted">{filtered.length} documentos</span></div>{loading ? <div className="empty-table">Cargando documentos…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Expediente</th><th>Documento</th><th>Tipo</th><th>Archivo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.date}</td><td><button className="text-button" onClick={() => openCase(item.caseId)}>{item.caseNumber}</button></td><td>{item.title}</td><td>{item.type}</td><td>{item.hasFile ? <a href={`/api/cases/${encodeURIComponent(item.caseId)}/entries/${encodeURIComponent(item.section)}/${encodeURIComponent(item.id)}/file`}>{item.fileName || "Descargar"}</a> : "Sin archivo"}</td><td><select aria-label="Estado del documento" value={item.status} onChange={(event) => void changeStatus(item, event.target.value)}><option>Pendiente</option><option>Borrador</option><option>Presentado</option><option>Observado</option><option>Aprobado</option></select></td><td><button className="text-button" onClick={() => openCase(item.caseId)}>Abrir caso</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay documentos para este filtro.</div>}</section></>;
}

type FinanceItem = { id: string; caseId: string; caseNumber: string; caseTitle: string; section: "expenses" | "fees"; date: string; dueDate: string; title: string; type: string; amount: string; status: string; fileName: string; hasFile: boolean; createdAt: string };

function FinanceDashboardPage({ openCase, onSaved }: { openCase: (id: string) => void; onSaved: (message: string) => void }) {
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [filter, setFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboards/finance", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el tablero financiero");
      if (!cancelled) { setItems(data.items || []); setTruncated(Boolean(data.truncated)); }
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Error al cargar finanzas"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function changeStatus(item: FinanceItem, status: string) {
    const response = await fetch(`/api/cases/${encodeURIComponent(item.caseId)}/entries/${item.section}/${encodeURIComponent(item.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: status }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "No se pudo actualizar el pago");
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: data.state || status } : row));
    onSaved("Estado de pago actualizado");
  }
  const expensesTotal = items.filter((item) => item.section === "expenses").reduce((sum, item) => sum + parseAmount(item.amount), 0);
  const feesTotal = items.filter((item) => item.section === "fees").reduce((sum, item) => sum + parseAmount(item.amount), 0);
  const outstanding = items.filter((item) => !["Pagado", "Cancelado"].includes(item.status)).reduce((sum, item) => sum + parseAmount(item.amount), 0);
  const overdue = items.filter((item) => item.dueDate && agendaTimestamp(item.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)).getTime() && !["Pagado", "Cancelado"].includes(item.status)).length;
  const filtered = items.filter((item) => (kindFilter === "all" || item.section === kindFilter) && (statusFilter === "all" || item.status === statusFilter) && `${item.caseNumber} ${item.caseTitle} ${item.title} ${item.type} ${item.amount}`.toLowerCase().includes(filter.toLowerCase()));
  function exportCsv() {
    const rows = [["Fecha", "Expediente", "Tipo de registro", "Concepto", "Categoría", "Monto", "Vencimiento", "Estado"], ...filtered.map((item) => [item.date, item.caseNumber, item.section === "expenses" ? "Gasto" : "Honorario", item.title, item.type, item.amount, item.dueDate, item.status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "gastos-honorarios-local.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <><div className="page-title-row"><div><p className="eyebrow">REPORTES / FINANZAS</p><h1>Gastos y honorarios</h1><p className="muted">Consolidado de los registros cargados en cada expediente.</p></div><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button></div><div className="stats-grid"><div className="stat-card"><span>Gastos registrados</span><strong>{formatAmount(expensesTotal)}</strong><small>{items.filter((item) => item.section === "expenses").length} registros</small></div><div className="stat-card"><span>Honorarios registrados</span><strong>{formatAmount(feesTotal)}</strong><small>{items.filter((item) => item.section === "fees").length} registros</small></div><div className="stat-card"><span>Pendiente de pago</span><strong>{formatAmount(outstanding)}</strong><small>Suma de estados no pagados</small></div><div className="stat-card"><span>Vencidos</span><strong>{overdue}</strong><small>Con fecha de vencimiento anterior a hoy</small></div></div>{error && <div className="inline-error" role="alert">{error}</div>}{truncated && <p className="muted">Se muestran los 5000 registros más recientes.</p>}<section className="panel table-panel"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar expediente, concepto o categoría..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">Gastos y honorarios</option><option value="expenses">Gastos</option><option value="fees">Honorarios</option></select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option><option>Pendiente</option><option>Parcial</option><option>Pagado</option><option>Cancelado</option></select><span className="muted">{filtered.length} registros</span></div>{loading ? <div className="empty-table">Cargando gastos y honorarios…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Expediente</th><th>Tipo</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th>Adjunto</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.date}</td><td><button className="text-button" onClick={() => openCase(item.caseId)}>{item.caseNumber}</button></td><td>{item.section === "expenses" ? "Gasto" : "Honorario"}</td><td>{item.title}</td><td>{item.type}</td><td>{item.amount || "—"}</td><td>{item.dueDate || "—"}</td><td><select aria-label="Estado de pago" value={item.status} onChange={(event) => void changeStatus(item, event.target.value)}><option>Pendiente</option><option>Parcial</option><option>Pagado</option><option>Cancelado</option></select></td><td>{item.hasFile ? <a href={`/api/cases/${encodeURIComponent(item.caseId)}/entries/${item.section}/${encodeURIComponent(item.id)}/file`}>{item.fileName || "Descargar"}</a> : "—"}</td></tr>)}</tbody></table></div> : <div className="empty-table">No hay registros para este filtro.</div>}</section></>;
}

type AuditItem = { id: string; caseId: string | null; caseNumber: string; action: string; detail: string; user: string; date: string };

function MaintenanceHistoryPage({ openCase }: { openCase: (id: string) => void }) {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/audit", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el historial");
      if (!cancelled) { setItems(data.items || []); setTruncated(Boolean(data.truncated)); }
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Error al cargar el historial"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);
  const filtered = items.filter((item) => `${item.caseNumber} ${item.action} ${item.detail} ${item.user} ${item.date}`.toLowerCase().includes(filter.toLowerCase()));
  function exportCsv() {
    const rows = [["Fecha", "Usuario", "Acción", "Expediente", "Detalle"], ...filtered.map((item) => [new Date(item.date).toLocaleString("es-AR"), item.user, item.action, item.caseNumber, item.detail])];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "historial-mantenimiento-local.csv"; link.click(); URL.revokeObjectURL(url);
  }
  const casesAffected = new Set(filtered.map((item) => item.caseId).filter(Boolean)).size;
  return <><div className="page-title-row"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Historial de mantenimiento</h1><p className="muted">Auditoría local de cambios en casos y movimientos. No almacena el contenido de notas o mensajes.</p></div><div className="title-actions"><button className="secondary-button" onClick={() => setRefresh((value) => value + 1)}>Actualizar</button><button className="primary-button" onClick={exportCsv}>Exportar CSV</button></div></div><div className="agenda-kpis"><div className="agenda-kpi"><span>Eventos registrados</span><strong>{items.length}</strong></div><div className="agenda-kpi"><span>Casos involucrados</span><strong>{casesAffected}</strong></div></div>{error && <div className="inline-error" role="alert">{error}</div>}{truncated && <p className="muted">Se muestran los 1000 eventos más recientes.</p>}<section className="panel table-panel"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por expediente, usuario o acción..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><span className="muted">{filtered.length} eventos</span></div>{loading ? <div className="empty-table">Cargando historial…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Expediente</th><th>Detalle</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{new Date(item.date).toLocaleString("es-AR")}</td><td>{item.user}</td><td>{item.action}</td><td>{item.caseId ? <button className="text-button" onClick={() => openCase(item.caseId!)}>{item.caseNumber}</button> : item.caseNumber}</td><td>{item.detail}</td></tr>)}</tbody></table></div> : <div className="empty-table">Todavía no hay cambios auditados.</div>}</section></>;
}

type IntakeRecord = { id: string; values: string[]; candidateFields?: Record<string, string>; details?: string; caseId?: string; createdCaseId?: string };

function NewCaseIntakePage({ cases, states, substatesByState, onCreated, openCase, onSaved }: { cases: CaseRecord[]; states: string[]; substatesByState: Record<string, string[]>; onCreated: (item: CaseRecord) => void; openCase: (id: string) => void; onSaved: (message: string) => void }) {
  const moduleKey = "client/nuevos_juicios";
  const portfolioCatalog = useModuleCatalog("client/configuracion/portfolio", defaultPortfolios);
  const jurisdictionCatalog = useModuleCatalog("client/configuracion/jurisdicciones-organismos", defaultJurisdictions);
  const responsibleCatalog = useModuleCatalog("client/configuracion/usersAbogado", defaultResponsibles);
  const portfolioOptions = [...new Set(["General", ...portfolioCatalog])];
  const jurisdictionOptions = jurisdictionCatalog;
  const responsibleOptions = [...new Set(["Sin asignar", ...responsibleCatalog])];
  const [records, setRecords] = useState<IntakeRecord[]>([]);
  const [draft, setDraft] = useState({ number: "", title: "", claimant: "", defendant: "", type: "", jurisdiction: "Capital", court: "", amount: "", responsible: "Sin asignar", portfolio: "General", origin: "Manual", details: "" });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (portfolioOptions.length && !portfolioOptions.includes(draft.portfolio)) setDraft((current) => ({ ...current, portfolio: portfolioOptions[0] })); }, [portfolioCatalog, draft.portfolio]);
  useEffect(() => { if (jurisdictionOptions.length && !jurisdictionOptions.includes(draft.jurisdiction)) setDraft((current) => ({ ...current, jurisdiction: jurisdictionOptions[0] })); }, [jurisdictionCatalog, draft.jurisdiction]);
  useEffect(() => { if (responsibleOptions.length && !responsibleOptions.includes(draft.responsible)) setDraft((current) => ({ ...current, responsible: responsibleOptions[0] })); }, [responsibleCatalog, draft.responsible]);

  async function load() {
    setLoading(true);
    try {
      let response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, { cache: "no-store" });
      let data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar la bandeja");
      if (!data.initialized) {
        response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/initialize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: [] }) });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo inicializar la bandeja");
      }
      setRecords(data.records || []); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al cargar nuevos juicios"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusyId("new");
    const fields = Object.fromEntries(Object.entries(draft).filter(([key]) => key !== "details"));
    const values = [new Date().toLocaleDateString("es-AR"), draft.number.trim(), draft.title.trim(), draft.origin, "Pendiente"];
    try {
      const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values, candidateFields: fields, details: draft.details.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo registrar la propuesta");
      setRecords((current) => [data, ...current]);
      setDraft({ number: "", title: "", claimant: "", defendant: "", type: "", jurisdiction: "Capital", court: "", amount: "", responsible: "Sin asignar", portfolio: "General", origin: "Manual", details: "" });
      setShowForm(false); setError(""); onSaved("Propuesta agregada a Nuevos juicios");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al registrar propuesta"); }
    finally { setBusyId(""); }
  }

  async function setRequestState(record: IntakeRecord, status: string, associatedCaseId?: string) {
    const values = [...record.values]; values[4] = status;
    const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(record.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values, ...(associatedCaseId ? { caseId: associatedCaseId, createdCaseId: associatedCaseId } : {}) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo actualizar la propuesta");
    setRecords((current) => current.map((item) => item.id === record.id ? data : item));
    return data as IntakeRecord;
  }

  async function incorporate(record: IntakeRecord) {
    const number = record.candidateFields?.number || record.values[1] || "";
    const existing = cases.find((item) => item.fields.number?.trim().toLowerCase() === number.trim().toLowerCase());
    setBusyId(record.id); setError("");
    try {
      let caseId = existing?.id;
      if (!caseId) {
        const fields = record.candidateFields || { number, title: record.values[2] || "" };
        const createdAt = new Date().toLocaleDateString("es-AR");
        const state = fields.state || states[0] || "En trámite";
        const substate = fields.substate || substatesFor(substatesByState, state)[0] || "";
        const response = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: { ...fields, number, id: `LOCAL-${Date.now()}`, state, substate, created: createdAt, lastUpdate: createdAt, process: fields.type || "", portfolio: fields.portfolio || "General" } }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo crear el expediente");
        caseId = data.id;
        onCreated(data);
      }
      if (!caseId) throw new Error("No se pudo vincular el expediente");
      await setRequestState(record, "Incorporado", caseId);
      onSaved(existing ? "Propuesta asociada al expediente existente" : "Propuesta incorporada como expediente");
      openCase(caseId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al incorporar propuesta"); }
    finally { setBusyId(""); }
  }

  async function discard(record: IntakeRecord) {
    if (!window.confirm("¿Marcar esta propuesta como descartada? No se eliminará el registro.")) return;
    setBusyId(record.id);
    try { await setRequestState(record, "Descartado"); onSaved("Propuesta descartada sin borrar el registro"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo descartar"); }
    finally { setBusyId(""); }
  }

  const filtered = records.filter((record) => (statusFilter === "all" || (record.values[4] || "Pendiente") === statusFilter) && JSON.stringify(record).toLowerCase().includes(filter.toLowerCase()));
  function exportCsv() {
    const rows = [["Fecha", "Expediente", "Carátula", "Origen", "Estado"], ...filtered.map((item) => item.values)];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "nuevos-juicios-local.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <><div className="page-title-row"><div><p className="eyebrow">CASOS / REVISIÓN</p><h1>Nuevos juicios</h1><p className="muted">Bandeja local para revisar propuestas antes de crear o asociar expedientes.</p></div><div className="title-actions"><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button><button className="primary-button" onClick={() => setShowForm((value) => !value)}>＋ Nueva propuesta</button></div></div>{error && <div className="inline-error" role="alert">{error}</div>}{showForm && <section className="panel agenda-form-panel"><div className="panel-heading"><div><h3>Registrar propuesta</h3><p>La propuesta queda en revisión y no crea un expediente automáticamente.</p></div></div><form className="agenda-form" onSubmit={(event) => void saveProposal(event)}>{([ ["number", "Número de expediente", true], ["title", "Carátula", true], ["claimant", "Demandante", false], ["defendant", "Demandado", false], ["type", "Tipo de caso", false], ["court", "Juzgado", false], ["amount", "Monto", false], ["origin", "Origen", false] ] as const).map(([key, label, required]) => <label className="field" key={key}><span>{label}</span><input required={required} value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label className="field"><span>Jurisdicción</span><select value={draft.jurisdiction} onChange={(event) => setDraft((current) => ({ ...current, jurisdiction: event.target.value }))}>{jurisdictionOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Portfolio</span><select value={draft.portfolio} onChange={(event) => setDraft((current) => ({ ...current, portfolio: event.target.value }))}>{portfolioOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Responsable</span><select value={draft.responsible} onChange={(event) => setDraft((current) => ({ ...current, responsible: event.target.value }))}>{responsibleOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field agenda-detail"><span>Notas de revisión</span><textarea rows={3} value={draft.details} onChange={(event) => setDraft((current) => ({ ...current, details: event.target.value }))} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={busyId === "new"}>{busyId === "new" ? "Guardando…" : "Guardar propuesta"}</button></div></form></section>}<section className="panel table-panel report-results"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar número, carátula o parte..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option><option>Pendiente</option><option>Incorporado</option><option>Descartado</option></select><span className="muted">{filtered.length} propuestas</span></div>{loading ? <div className="empty-table">Cargando propuestas…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Expediente</th><th>Carátula</th><th>Origen</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map((record) => { const number = record.candidateFields?.number || record.values[1] || "—"; const existing = cases.find((item) => item.fields.number?.trim().toLowerCase() === number.trim().toLowerCase()); const linkedId = record.caseId || record.createdCaseId; const state = record.values[4] || "Pendiente"; return <tr key={record.id}><td>{record.values[0] || "—"}</td><td>{linkedId ? <button className="text-button" onClick={() => openCase(linkedId)}>{number}</button> : number}</td><td>{record.candidateFields?.title || record.values[2] || "—"}</td><td>{record.values[3] || "Manual"}</td><td>{state}</td><td>{state === "Pendiente" ? <>{existing ? <button className="text-button" disabled={busyId === record.id} onClick={() => void incorporate(record)}>Asociar existente</button> : <button className="text-button" disabled={busyId === record.id} onClick={() => void incorporate(record)}>Crear expediente</button>}<button className="text-button danger-text" disabled={busyId === record.id} onClick={() => void discard(record)}>Descartar</button></> : linkedId ? <button className="text-button" onClick={() => openCase(linkedId)}>Abrir caso</button> : "—"}</td></tr>; })}</tbody></table></div> : <div className="empty-table">No hay propuestas en esta bandeja.</div>}</section></>;
}

function HomePage({ navigate }: { navigate: (href: string) => void }) {
  const [summary, setSummary] = useState<{ totalCases: number; activeCases: number; stateCounts: Record<string, number>; movementCount: number; documentCount: number; expenseCount: number; agendaCount: number; overdueAgendaCount: number; upcomingAgenda: { date: string; time: string; title: string; caseId: string | null; caseNumber: string; status: string }[]; recent: { title: string; date: string; caseNumber?: string }[] } | null>(null);
  useEffect(() => { fetch("/api/summary", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then(setSummary).catch(() => setSummary(null)); }, []);
  return <><div className="page-title-row"><div><p className="eyebrow">ESTUDIO JURÍDICO</p><h1>Inicio</h1><p className="muted">Resumen calculado desde SQLite local.</p></div><button className="primary-button" onClick={() => navigate("#/client/administration")}>＋ Alta de caso</button></div><div className="stats-grid"><div className="stat-card"><span>Casos activos</span><strong>{summary?.activeCases ?? "—"}</strong><small>{summary?.totalCases ?? 0} en la base local</small></div><div className="stat-card"><span>Movimientos</span><strong>{summary?.movementCount ?? "—"}</strong><small>Registrados en el sistema</small></div><div className="stat-card"><span>Documentos</span><strong>{summary?.documentCount ?? "—"}</strong><small>Adjuntos locales</small></div><div className="stat-card"><span>Gastos</span><strong>{summary?.expenseCount ?? "—"}</strong><small>Registros locales</small></div></div><div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h3>Novedades recientes</h3><p>Actividad de los expedientes</p></div><button className="text-button" onClick={() => navigate("#/client/novedades_juicio")}>Ver novedades</button></div><Timeline items={summary?.recent || []} /></section><section className="panel"><div className="panel-heading"><div><h3>Estado procesal</h3><p>Distribución actual de casos</p></div><button className="text-button" onClick={() => navigate("#/client/dashboard/state")}>Ver tablero</button></div><StateBreakdown counts={summary?.stateCounts || {}} total={summary?.totalCases || 0} /></section></div><section className="panel upcoming-home"><div className="panel-heading"><div><h3>Próximas actividades</h3><p>{summary?.overdueAgendaCount || 0} atrasadas · próximas tareas vinculadas</p></div><button className="text-button" onClick={() => navigate("#/client/agenda")}>Ver agenda</button></div>{summary?.upcomingAgenda?.length ? <div className="upcoming-home-list">{summary.upcomingAgenda.map((item) => <button key={`${item.caseId || item.title}-${item.date}-${item.time}`} onClick={() => navigate(item.caseId ? `#/client/searchinf/detail/${item.caseId}` : "#/client/agenda")}><span>{item.date}{item.time && item.time !== "—" ? ` · ${item.time}` : ""}</span><strong>{item.title}</strong><small>{item.caseNumber}</small></button>)}</div> : <div className="empty-table compact-empty">No hay actividades próximas.</div>}</section><section className="panel quick-panel"><div className="panel-heading"><div><h3>Accesos rápidos</h3><p>Módulos de uso frecuente</p></div></div><div className="quick-links"><button onClick={() => navigate("#/client/searchinf")}>⌕<span>Búsqueda de casos</span></button><button onClick={() => navigate("#/client/inbox")}>✉<span>Inbox</span></button><button onClick={() => navigate("#/client/agenda")}>▦<span>Agenda</span></button><button onClick={() => navigate("#/admin/report")}>▥<span>Reportes</span></button></div></section></>;
}

function StateBreakdown({ counts, total }: { counts: Record<string, number>; total: number }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <div className="empty-table compact-empty">No hay casos para resumir.</div>;
  return <div className="state-list">{rows.map(([state, count]) => <div className="state-row" key={state}><span>{state}</span><div><i style={{ width: `${total ? Math.max(3, count / total * 100) : 0}%` }} /></div><strong>{count}</strong></div>)}</div>;
}

function StateDashboardPage({ cases }: { cases: CaseRecord[] }) {
  const counts = cases.reduce<Record<string, number>>((result, item) => {
    const state = item.fields.state?.trim() || "Sin estado";
    result[state] = (result[state] || 0) + 1;
    return result;
  }, {});
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  function exportCsv() {
    const content = [["Estado", "Cantidad", "Porcentaje"], ...rows.map(([state, count]) => [state, String(count), `${cases.length ? (count / cases.length * 100).toFixed(1) : "0.0"}%`])]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(content)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "estado-procesal-local.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <><div className="page-title-row"><div><p className="eyebrow">REPORTES / DASHBOARDS</p><h1>Estado procesal</h1><p className="muted">Distribución calculada sobre los casos guardados localmente.</p></div><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button></div><section className="panel state-dashboard"><div className="panel-heading"><div><h3>{cases.length} casos</h3><p>Porcentaje calculado respecto del total</p></div></div><StateBreakdown counts={counts} total={cases.length} /><div className="table-wrap"><table><thead><tr><th>Estado</th><th>Cantidad</th><th>Porcentaje</th></tr></thead><tbody>{rows.map(([state, count]) => <tr key={state}><td>{state}</td><td>{count}</td><td>{cases.length ? `${(count / cases.length * 100).toFixed(1)}%` : "0%"}</td></tr>)}</tbody></table></div></section></>;
}

type ActivityItem = { id: string; number: string; title: string; state: string; lastMovement: string; lastMovementDate: string; daysWithoutMovement: number | null; priority: string };

function ActivityDashboardPage({ kind, openCase }: { kind: "movimientos" | "impulse"; openCase: (id: string) => void }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isNoMovement = kind === "movimientos";
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboards/activity", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el tablero");
        if (!cancelled) setItems(data.items || []);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Error al cargar el tablero"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const candidates = isNoMovement ? items.filter((item) => item.daysWithoutMovement === null || item.daysWithoutMovement >= 30) : items;
  const filtered = candidates.filter((item) => `${item.number} ${item.title} ${item.state} ${item.lastMovement} ${item.priority}`.toLowerCase().includes(filter.toLowerCase()));
  const sorted = filtered.slice().sort((a, b) => (b.daysWithoutMovement ?? Number.MAX_SAFE_INTEGER) - (a.daysWithoutMovement ?? Number.MAX_SAFE_INTEGER));
  const title = isNoMovement ? "Casos sin movimientos recientes" : "Impulso procesal";

  function exportCsv() {
    const header = ["Expediente", "Carátula", "Estado", "Último movimiento", "Fecha", "Días sin movimiento", "Prioridad"];
    const rows = [header, ...sorted.map((item) => [item.number, item.title, item.state, item.lastMovement, item.lastMovementDate, item.daysWithoutMovement === null ? "" : String(item.daysWithoutMovement), item.priority])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${slug(title)}-local.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <><div className="page-title-row"><div><p className="eyebrow">REPORTES / DASHBOARDS</p><h1>{title}</h1><p className="muted">{isNoMovement ? "Se muestran los casos sin movimientos o con 30 días o más de inactividad." : "Prioridad calculada a partir del tiempo transcurrido desde el último movimiento."}</p></div><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button></div><section className="panel table-panel"><div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar expediente, carátula o estado..."/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><span className="muted">{sorted.length} casos</span></div>{error && <div className="inline-error" role="alert">{error}</div>}{loading ? <div className="empty-table">Calculando desde movimientos locales…</div> : sorted.length ? <div className="table-wrap"><table><thead><tr><th>Expediente</th><th>Carátula</th><th>Último movimiento</th><th>Fecha</th><th>Días</th><th>Prioridad</th><th>Estado judicial</th><th></th></tr></thead><tbody>{sorted.map((item) => <tr key={item.id}><td>{item.number}</td><td>{item.title}</td><td>{item.lastMovement}</td><td>{item.lastMovementDate}</td><td>{item.daysWithoutMovement ?? "—"}</td><td><span className={`tag ${item.priority === "Alta" || item.priority === "Sin movimientos" ? "red" : item.priority === "Media" ? "yellow" : "green"}`}>{item.priority}</span></td><td>{item.state}</td><td><button className="text-button" onClick={() => openCase(item.id)}>Abrir →</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay casos que coincidan con este tablero.</div>}</section></>;
}

type StockData = { month: string; label: string; altas: number; solicitudes: number; pendientes: number };

function StockDashboardPage({ navigate }: { navigate: (href: string) => void }) {
  const [data, setData] = useState<{ totalCases: number; totalRequests: number; pendingRequests: number; months: StockData[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/dashboards/stock", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar el tablero");
      setData(result);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Error al cargar el tablero"));
  }, []);
  const max = Math.max(1, ...(data?.months || []).flatMap((month) => [month.altas, month.solicitudes]));
  function exportCsv() {
    const rows = [["Mes", "Altas", "Solicitudes de baja", "Pendientes"], ...(data?.months || []).map((month) => [month.label, String(month.altas), String(month.solicitudes), String(month.pendientes)])];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "stock-casos-local.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <><div className="page-title-row"><div><p className="eyebrow">REPORTES / DASHBOARDS</p><h1>Stock de casos</h1><p className="muted">Altas y solicitudes registradas en los últimos seis meses.</p></div><div className="title-actions"><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button><button className="primary-button" onClick={() => navigate("#/client/bajajuicio")}>Solicitudes de baja</button></div></div>{error && <div className="inline-error" role="alert">{error}</div>}<div className="stats-grid"><div className="stat-card"><span>Casos en la base local</span><strong>{data?.totalCases ?? "—"}</strong><small>Registros conservados</small></div><div className="stat-card"><span>Solicitudes de baja</span><strong>{data?.totalRequests ?? "—"}</strong><small>No equivalen a casos eliminados</small></div><div className="stat-card"><span>Solicitudes pendientes</span><strong>{data?.pendingRequests ?? "—"}</strong><small>Requieren revisión</small></div></div><section className="panel stock-dashboard"><div className="panel-heading"><div><h3>Actividad mensual</h3><p>Altas nuevas y solicitudes de baja; no se ejecutan bajas automáticamente.</p></div></div>{data ? <><div className="stock-bars">{data.months.map((month) => <div className="stock-bar-group" key={month.month}><div className="stock-bar-pair"><i className="stock-bar alta" style={{ height: `${Math.max(3, month.altas / max * 100)}%` }} title={`Altas: ${month.altas}`} /><i className="stock-bar solicitud" style={{ height: `${Math.max(3, month.solicitudes / max * 100)}%` }} title={`Solicitudes: ${month.solicitudes}`} /></div><span>{month.label}</span><strong>+{month.altas} / {month.solicitudes}</strong></div>)}</div><div className="stock-legend"><span><i className="alta" /> Altas</span><span><i className="solicitud" /> Solicitudes de baja</span></div><div className="table-wrap"><table><thead><tr><th>Mes</th><th>Altas</th><th>Solicitudes</th><th>Pendientes</th></tr></thead><tbody>{data.months.map((month) => <tr key={month.month}><td>{month.label}</td><td>{month.altas}</td><td>{month.solicitudes}</td><td>{month.pendientes}</td></tr>)}</tbody></table></div></> : <div className="empty-table">Cargando tablero…</div>}</section></>;
}

type DeactivationRequest = { id: string; values: string[]; caseId?: string; createdAt?: string };

function CaseDeactivationPage({ cases, openCase, onSaved }: { cases: CaseRecord[]; openCase: (id: string) => void; onSaved: (message: string) => void }) {
  const moduleKey = "client/bajajuicio";
  const [requests, setRequests] = useState<DeactivationRequest[]>([]);
  const [caseId, setCaseId] = useState("");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadRequests() {
    setLoading(true);
    try {
      let response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, { cache: "no-store" });
      let data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las solicitudes");
      if (!data.initialized) {
        response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/initialize`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: [] }),
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo inicializar el módulo");
      }
      setRequests(data.records || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadRequests(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = cases.find((item) => item.id === caseId);
    if (!selected) return setError("Selecciona un expediente válido.");
    setBusy(true);
    try {
      const values = [selected.fields.number || selected.id, reason.trim(), new Date().toLocaleDateString("es-AR"), "Pendiente"];
      const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values, caseId: selected.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la solicitud");
      setRequests((current) => [data, ...current]);
      setCaseId(""); setReason(""); setError("");
      onSaved("Solicitud de baja registrada; el expediente sigue intacto");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la solicitud");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(request: DeactivationRequest, status: string) {
    const values = [...request.values]; values[3] = status;
    const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(request.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "No se pudo actualizar el estado");
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, values: data.values || values } : item));
    onSaved("Estado de solicitud actualizado");
  }

  const filtered = requests.filter((item) => item.values.join(" ").toLowerCase().includes(filter.toLowerCase()));
  function exportCsv() {
    const rows = [["Expediente", "Motivo", "Solicitado", "Estado"], ...filtered.map((item) => item.values)];
    const csv = rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "solicitudes-baja-local.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <><div className="page-title-row"><div><p className="eyebrow">CASOS / ADMINISTRACIÓN</p><h1>Solicitudes de baja</h1><p className="muted">Registra y revisa solicitudes. Ninguna solicitud elimina el expediente automáticamente.</p></div><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button></div><section className="panel fields-panel"><form onSubmit={(event) => void submit(event)}><div className="fields-grid"><label className="field"><span>Expediente</span><select required value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">Seleccionar expediente</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.fields.number || item.id} · {item.fields.title || item.fields.claimant || "Caso local"}</option>)}</select></label><label className="field"><span>Motivo de la solicitud</span><textarea required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe el motivo de la solicitud" /></label></div><div className="modal-actions"><button className="primary-button" type="submit" disabled={busy || !cases.length}>{busy ? "Guardando…" : "Registrar solicitud"}</button></div></form></section><section className="panel table-panel report-results"><div className="panel-heading"><div><h3>Historial de solicitudes</h3><p>{requests.length} solicitudes guardadas localmente.</p></div></div>{error && <div className="inline-error" role="alert">{error}</div>}<div className="search-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por expediente, motivo o estado..." /><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><span className="muted">{filtered.length} resultados</span></div>{loading ? <div className="empty-table">Cargando…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Expediente</th><th>Motivo</th><th>Solicitado</th><th>Estado de solicitud</th><th>Acción</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.caseId ? <button className="text-button" onClick={() => openCase(item.caseId!)}>{item.values[0] || "—"}</button> : item.values[0] || "—"}</td><td>{item.values[1] || "—"}</td><td>{item.values[2] || "—"}</td><td><select aria-label="Estado de solicitud" value={item.values[3] || "Pendiente"} onChange={(event) => void updateStatus(item, event.target.value)}><option>Pendiente</option><option>Revisada</option><option>Cancelada</option></select></td><td>{item.caseId ? <button className="text-button" onClick={() => openCase(item.caseId!)}>Abrir caso</button> : "—"}</td></tr>)}</tbody></table></div> : <div className="empty-table">Todavía no hay solicitudes de baja.</div>}</section></>;
}

function ModulePage({ route, title, onSaved }: { route: string; title: string; onSaved: (s: string) => void }) {
  const definition = moduleDefinitions[route] ?? { description: "Gestión de información del estudio.", columns: ["Nombre", "Descripción", "Estado"], rows: [], action: "Nuevo registro" };
  const moduleKey = route.replace(/^#\//, "");
  const [records, setRecords] = useState<{ id: string; values: string[] }[]>([]);
  const [filter, setFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draftValues, setDraftValues] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const filtered = records.filter((record) => record.values.join(" ").toLowerCase().includes(filter.toLowerCase()));

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      setLoading(true);
      try {
        const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el módulo");
        let list = data.records || [];
        if (!data.initialized) {
          const seeded = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/initialize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: definition.rows.map((values) => ({ values })) }),
          });
          const seededData = await seeded.json();
          if (!seeded.ok) throw new Error(seededData.error || "No se pudo inicializar el módulo");
          list = seededData.records || [];
        }
        if (!cancelled) setRecords(list.map((record: { id: string; values?: string[] }) => ({ id: record.id, values: record.values || [] })));
        if (!cancelled) setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error de conexión con la base local");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, [moduleKey]);

  async function addRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftValues[0]?.trim()) return;
    const values = definition.columns.map((column, index) => {
      const value = draftValues[index]?.trim();
      if (value) return value;
      if (/activo/i.test(column)) return "Sí";
      if (/estado/i.test(column)) return "Pendiente";
      return "—";
    });
    try {
      const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el registro");
      setRecords((current) => editingId
        ? current.map((record) => record.id === editingId ? { id: data.id, values: data.values || values } : record)
        : [{ id: data.id, values: data.values || values }, ...current]);
      setDraftValues([]);
      setEditingId(null);
      setModalOpen(false);
      setError("");
      onSaved(editingId ? "Cambios guardados en SQLite local" : "Registro guardado en SQLite local");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  function editRow(record: { id: string; values: string[] }) {
    setEditingId(record.id);
    setDraftValues(definition.columns.map((_, index) => record.values[index] || ""));
    setModalOpen(true);
  }

  async function deleteRow(id: string) {
    if (!window.confirm("¿Eliminar este registro local?")) return;
    try {
      const response = await fetch(`/api/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo eliminar el registro");
      setRecords((current) => current.filter((record) => record.id !== id));
      onSaved("Registro eliminado de SQLite local");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  function exportCsv() {
    const csv = [definition.columns, ...filtered.map((record) => record.values)].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([sanitizeCsv(csv)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug(title)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <><div className="page-title-row"><div><p className="eyebrow">LEGALRUN / ESTUDIO</p><h1>{title}</h1><p className="muted">{definition.description} · guardado en SQLite local</p></div><div className="title-actions"><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button>{definition.action && <button className="primary-button" onClick={() => { setEditingId(null); setDraftValues(definition.columns.map(() => "")); setModalOpen(true); }}>＋ {definition.action}</button>}</div></div><section className="panel table-panel"><div className="search-toolbar"><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Buscar en ${title.toLowerCase()}...`}/><button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button><span className="muted">{filtered.length} registros</span></div>{error && <div className="inline-error" role="alert">{error}</div>}{loading ? <div className="empty-table">Cargando desde SQLite…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr>{definition.columns.map((column) => <th key={column}>{column}</th>)}<th>Acciones</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}>{definition.columns.map((_, j) => <td key={`${j}-${record.values[j]}`}>{record.values[j] || "—"}</td>)}<td><button className="text-button" onClick={() => editRow(record)}>Editar</button><button className="text-button danger-text" onClick={() => void deleteRow(record.id)}>Eliminar</button></td></tr>)}</tbody></table></div> : <div className="empty-table">No hay registros todavía.</div>}</section>{modalOpen && <div className="modal-backdrop" onClick={() => setModalOpen(false)}><section className="modal-card module-modal" onClick={(e) => e.stopPropagation()}><div className="panel-heading"><div><h3>{editingId ? "Editar registro" : definition.action}</h3><p>El registro se guardará en la base local.</p></div><button className="icon-button" onClick={() => { setModalOpen(false); setEditingId(null); }} aria-label="Cerrar">×</button></div><form onSubmit={addRow}><div className="module-form-grid">{definition.columns.map((column, index) => <label className="field" key={`${column}-${index}`}><span>{column}</span><input type={/fecha|date/i.test(column) ? "date" : /hora/i.test(column) ? "time" : /email|correo/i.test(column) ? "email" : "text"} value={draftValues[index] || ""} onChange={(event) => setDraftValues((current) => definition.columns.map((_, itemIndex) => itemIndex === index ? event.target.value : current[itemIndex] || ""))} required={index === 0} autoFocus={index === 0} /></label>)}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setModalOpen(false); setEditingId(null); }}>Cancelar</button><button className="primary-button" type="submit">Guardar</button></div></form></section></div>}</>;
}
function slug(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function BackupPage({ onSaved, onRestored }: { onSaved: (message: string) => void; onRestored: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [backupText, setBackupText] = useState("");
  const [preview, setPreview] = useState<{ cases: number; entries: number; modules: number; attachments: number } | null>(null);

  async function createBackup() {
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/backup", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear la copia de seguridad");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url;
      link.download = `legalrun-backup-local-${new Date().toISOString().slice(0, 10)}.json`;
      link.click(); URL.revokeObjectURL(url);
      setResult(`${data.counts.cases} casos · ${data.counts.entries} registros · ${data.counts.attachments} adjuntos`);
      onSaved("Copia de seguridad local descargada");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al crear la copia"); }
    finally { setBusy(false); }
  }

  async function inspectFile(file?: File) {
    setBackupText(""); setPreview(null); setError(""); setResult("");
    if (!file) return;
    if (file.size > 100_000_000) return setError("La copia supera el límite de 100 MB.");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data?.format !== "legalrun-local-backup" || data?.schemaVersion !== 1) throw new Error("El archivo no es una copia compatible.");
      const counts = { cases: data.cases?.length || 0, entries: data.entries?.length || 0, modules: data.modules?.length || 0, attachments: (data.entries || []).filter((item: { attachment?: unknown }) => Boolean(item.attachment)).length };
      setBackupText(text); setPreview(counts);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo leer el JSON seleccionado."); }
  }

  async function restoreBackup() {
    if (!backupText || !preview) return;
    if (!window.confirm(`Se combinarán ${preview.cases} casos, ${preview.entries} registros y ${preview.attachments} adjuntos. Lo existente no se sobrescribirá. ¿Continuar?`)) return;
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/backup/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: backupText });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo combinar la copia");
      await onRestored();
      setResult(`Añadidos ${data.casesAdded} casos, ${data.entriesAdded} registros, ${data.modulesAdded} módulos y ${data.filesAdded} adjuntos; duplicados omitidos: ${data.casesSkipped + data.entriesSkipped + data.modulesSkipped}.`);
      setBackupText(""); setPreview(null);
      onSaved("Copia combinada sin sobrescribir datos existentes");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al restaurar copia"); }
    finally { setBusy(false); }
  }

  return <><div className="page-title-row"><div><p className="eyebrow">CONFIGURACIÓN / DATOS</p><h1>Copia de seguridad</h1><p className="muted">Exporta o combina datos locales desde un respaldo compatible.</p></div></div><section className="panel password-panel backup-panel"><div className="panel-heading"><div><h3>Respaldo de la base local</h3><p>Incluye expedientes, movimientos, módulos, configuraciones, auditoría y adjuntos codificados.</p></div></div><div className="backup-warning"><strong>Protege el archivo de respaldo.</strong><span>Contiene información jurídica y no está cifrado. No incluye contraseñas ni sesiones. La restauración combina datos: no borra ni sobrescribe registros existentes.</span></div>{error && <div className="inline-error" role="alert">{error}</div>}{result && <p className="form-message" role="status">{result}</p>}<div className="backup-actions"><button className="primary-button" onClick={() => void createBackup()} disabled={busy}>{busy ? "Preparando…" : "Descargar copia JSON"}</button><label className="field"><span>Seleccionar respaldo JSON (máximo 100 MB)</span><input type="file" accept=".json,application/json" disabled={busy} onChange={(event) => void inspectFile(event.target.files?.[0])} /></label>{preview && <div className="backup-preview"><strong>Vista previa validada</strong><span>{preview.cases} casos · {preview.entries} registros · {preview.modules} módulos · {preview.attachments} adjuntos</span><button className="secondary-button" disabled={busy} onClick={() => void restoreBackup()}>{busy ? "Combinando…" : "Combinar con esta base"}</button></div>}</div></section></>;
}

function PasswordSettingsPage({ onSaved }: { onSaved: (message: string) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(false);
    if (newPassword !== confirmation) return setError("La confirmación no coincide con la nueva contraseña.");
    if (newPassword.length < 12) return setError("La nueva contraseña debe tener al menos 12 caracteres.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cambiar la contraseña");
      setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setSuccess(true);
      onSaved("Contraseña cambiada; las demás sesiones se cerraron");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al cambiar la contraseña"); }
    finally { setBusy(false); }
  }
  return <><div className="page-title-row"><div><p className="eyebrow">CONFIGURACIÓN / SEGURIDAD</p><h1>Cambiar contraseña</h1><p className="muted">Actualiza la contraseña de esta cuenta local.</p></div></div><section className="panel password-panel"><div className="panel-heading"><div><h3>Seguridad de la cuenta</h3><p>Se cerrarán las demás sesiones al confirmar el cambio.</p></div></div><form onSubmit={(event) => void submit(event)}><label className="field"><span>Contraseña actual</span><input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label className="field"><span>Nueva contraseña</span><input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small className="muted">Mínimo 12 caracteres.</small></label><label className="field"><span>Confirmar nueva contraseña</span><input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error && <div className="inline-error" role="alert">{error}</div>}{success && <p className="form-message" role="status">Contraseña actualizada. Esta sesión sigue activa.</p>}<div className="modal-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? "Actualizando…" : "Cambiar contraseña"}</button></div></form></section></>;
}

function AuthPage({ mode, navigate, onAuthenticated }: { mode: "login" | "register" | "forgot"; navigate: (href: string) => void; onAuthenticated: (user: LocalUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busy, setBusy] = useState(false);
  const title = mode === "register" ? "Crear cuenta local" : mode === "forgot" ? "Recuperar contraseña" : "Ingresar";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMensaje("");
    if (mode === "forgot") {
      setMensaje("La recuperación por email requiere configurar un proveedor de correo.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión");
      onAuthenticated(data.user);
      navigate("#/client/home_estudio_juridico");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "Error de conexión con el backend local");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page"><div className="login-card"><div className="login-brand"><div className="brand-mark">LR</div><div><strong>LegalRun</strong><span>Gestión jurídica local</span></div></div><p className="eyebrow">ESPACIO DE TRABAJO</p><h1>{title}</h1><p className="muted">Cuenta propia de esta réplica; no usa las credenciales de LegalRun.</p><form onSubmit={submit}><label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ingresar email" autoComplete="email" required /></label>{mode !== "forgot" && <label className="field"><span>Contraseña</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 12 caracteres" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : 1} required /></label>}{mode === "login" && <label className="remember"><input type="checkbox"/> Recordarme</label>}<button className="primary-button login-submit" type="submit" disabled={busy}>{busy ? "Procesando…" : mode === "forgot" ? "Enviar instrucciones" : mode === "register" ? "Crear cuenta" : "Ingresar"}</button>{mensaje && <p className="form-message" role="status">{mensaje}</p>}</form><div className="auth-links">{mode === "login" ? <><button onClick={() => navigate("#/auth/forgot")}>¿Olvidó su contraseña?</button><span>¿No tiene cuenta?</span><button onClick={() => navigate("#/auth/register")}>Registrarse</button></> : <button onClick={() => navigate("#/auth/login")}>Volver a ingresar</button>}</div><p className="demo-note">Backend local · base SQLite · datos independientes</p></div></main>;
}
