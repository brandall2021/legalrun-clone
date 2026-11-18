import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  STANDARD_TEMPLATE_FIELDS,
  extractTemplateVariables,
  insertTemplateVariable,
  renderTemplate,
  templateCaseValues,
  templateVariableLabel,
  type TemplateFieldOption,
} from "./templateEngine";

const MODULE_KEY = "client/configuracion/template@v2";
const MODULE_URL = `/api/modules/${encodeURIComponent(MODULE_KEY)}`;

type TemplateRecord = { id: string; values: string[]; body: string };
type TemplateCase = { id: string; fields: Record<string, string> };
type TemplateField = { key: string; label: string };

type TemplateDraft = { name: string; documentType: string; body: string };

const TEMPLATE_SEEDS = [
  {
    values: ["12/03/2025", "Escrito", "Presentación simple", "—"],
    body: [
      "Señor Juez:",
      "",
      "{{claimant}}, por mi intermedio, en autos caratulados «{{title}}» (Expte. {{number}}), constituyendo domicilio procesal, comparece y solicita que se tenga por presentado.",
      "",
      "Juzgado: {{court}}",
      "Jurisdicción: {{jurisdiction}}",
      "",
      "Saluda atentamente.",
    ].join("\n"),
  },
  {
    values: ["12/03/2025", "Oficio", "Oficio", "—"],
    body: [
      "Oficio judicial",
      "",
      "Expediente: {{number}}",
      "Carátula: {{title}}",
      "Juzgado: {{court}}",
      "Secretaría: {{secretary}}",
      "",
      "Tengo el agrado de dirigirme a usted en los autos de referencia a fin de solicitar lo que a continuación se detalla.",
    ].join("\n"),
  },
];

const STARTER_BODY = [
  "Señor Juez:",
  "",
  "{{claimant}}, por mi intermedio, en autos caratulados «{{title}}» (Expte. {{number}}), comparece y solicita que se tenga por presentado.",
  "",
  "Juzgado: {{court}}",
  "Jurisdicción: {{jurisdiction}}",
  "",
  "Saluda atentamente.",
].join("\n");

function emptyDraft(): TemplateDraft {
  return { name: "", documentType: "Escrito", body: "" };
}

function todayLabel() {
  return new Date().toLocaleDateString("es-AR");
}

function normalizeRecord(record: { id: string; values?: string[]; body?: string }): TemplateRecord {
  return {
    id: record.id,
    values: Array.isArray(record.values) ? record.values : [],
    body: typeof record.body === "string" ? record.body : "",
  };
}

function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function TemplatesPage({
  cases,
  customFields,
  onSaved,
}: {
  cases: TemplateCase[];
  customFields: TemplateField[];
  onSaved: (message: string) => void;
}) {
  const [records, setRecords] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      setLoading(true);
      try {
        const response = await fetch(MODULE_URL, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los templates");
        let list = Array.isArray(data.records) ? data.records : [];
        if (!data.initialized) {
          const seeded = await fetch(`${MODULE_URL}/initialize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: TEMPLATE_SEEDS }),
          });
          const seededData = await seeded.json();
          if (!seeded.ok) throw new Error(seededData.error || "No se pudieron inicializar los templates");
          list = Array.isArray(seededData.records) ? seededData.records : [];
        }
        if (!cancelled) {
          setRecords(list.map(normalizeRecord));
          setError("");
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los templates");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);

  const variableOptions = useMemo(() => {
    const options: TemplateFieldOption[] = [...STANDARD_TEMPLATE_FIELDS];
    for (const field of customFields) {
      if (!options.some((option) => option.key === field.key)) {
        options.push({ key: field.key, label: field.label });
      }
    }
    return options;
  }, [customFields]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((record) => {
      const haystack = `${record.values[2] || ""} ${record.values[1] || ""} ${record.body}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [records, filter]);

  const generatingRecord = records.find((record) => record.id === generatingId) || null;
  const selectedCase = cases.find((item) => item.id === caseId) || cases[0] || null;
  const rendered = useMemo(() => {
    if (!generatingRecord) return { text: "", missing: [] as string[] };
    const values = selectedCase ? templateCaseValues(selectedCase.fields) : { fecha: new Date().toLocaleDateString("es-AR") };
    return renderTemplate(generatingRecord.body, values);
  }, [generatingRecord, selectedCase]);

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
  }

  function openCreate() {
    setError("");
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(record: TemplateRecord) {
    setError("");
    setEditingId(record.id);
    setDraft({
      name: record.values[2] || "",
      documentType: record.values[1] || "Escrito",
      body: record.body,
    });
    setModalOpen(true);
  }

  function insertVariable(key: string) {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? draft.body.length;
    const end = textarea?.selectionEnd ?? start;
    const next = insertTemplateVariable(draft.body, key, start, end);
    setDraft((current) => ({ ...current, body: next.body }));
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        bodyRef.current?.focus();
        bodyRef.current?.setSelectionRange(next.caret, next.caret);
      });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError("El nombre del template es obligatorio");
      return;
    }
    const current = records.find((record) => record.id === editingId);
    const values = [
      current?.values[0] || todayLabel(),
      draft.documentType.trim() || "Escrito",
      name,
      current?.values[3] || "—",
    ];
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${MODULE_URL}${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, body: draft.body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el template");
      const saved = normalizeRecord(data);
      setRecords((list) => editingId
        ? list.map((record) => record.id === editingId ? saved : record)
        : [saved, ...list]);
      closeModal();
      onSaved(editingId ? "Template actualizado en la base local" : "Template guardado en la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el template");
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: TemplateRecord) {
    if (!window.confirm("¿Eliminar este template local?")) return;
    try {
      const response = await fetch(`${MODULE_URL}/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo eliminar el template");
      setRecords((current) => current.filter((item) => item.id !== record.id));
      if (generatingId === record.id) setGeneratingId(null);
      onSaved("Template eliminado de la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el template");
    }
  }

  async function copyRendered() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(rendered.text);
        setCopyStatus("Escrito copiado al portapapeles");
      } else {
        setCopyStatus("El navegador no permite copiar automáticamente; usá Descargar .txt");
      }
    } catch {
      setCopyStatus("No se pudo copiar; usá Descargar .txt");
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">CONFIGURACIÓN / TEMPLATES</p>
          <h1>Plantillas de escritos</h1>
          <p className="muted">Creá templates con comodines y generá escritos completos con los datos de un expediente local.</p>
        </div>
        <div className="title-actions">
          <button className="primary-button" onClick={openCreate}>Nuevo template</button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="search-toolbar">
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por nombre, tipo o variables..." />
          <button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button>
          <span className="muted">{records.length} templates</span>
        </div>

        {error ? <div className="inline-error" role="alert">{error}</div> : null}

        {loading ? (
          <div className="empty-table">Cargando desde SQLite…</div>
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Variables</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const variables = extractTemplateVariables(record.body);
                  return (
                    <tr key={record.id}>
                      <td>{record.values[2] || "Template sin nombre"}</td>
                      <td>{record.values[1] || "Escrito"}</td>
                      <td>{variables.length ? variables.map((key) => `{{${key}}}`).join(", ") : "Sin variables"}</td>
                      <td>{record.values[0] || "—"}</td>
                      <td>
                        <button className="text-button" aria-label={`Generar escrito ${record.values[2] || "template"}`} onClick={() => { setGeneratingId(record.id); setCaseId(""); setCopyStatus(""); }}>
                          Generar
                        </button>
                        <button className="text-button" aria-label={`Editar template ${record.values[2] || "template"}`} onClick={() => openEdit(record)}>
                          Editar
                        </button>
                        <button className="text-button danger-text" onClick={() => void remove(record)}>Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-table">
            {records.length ? "No hay resultados para el filtro aplicado." : "No hay plantillas cargadas todavía."}
          </div>
        )}
      </section>

      {generatingRecord ? (
        <section className="panel fields-panel template-generator">
          <div className="panel-heading">
            <div>
              <h3>Generar escrito: {generatingRecord.values[2] || "template"}</h3>
              <p>Los comodines se completan con los datos del expediente seleccionado.</p>
            </div>
            <button className="icon-button" aria-label="Cerrar generador" onClick={() => { setGeneratingId(null); setCopyStatus(""); }}>×</button>
          </div>
          {cases.length ? (
            <>
              <label className="field">
                <span>Expediente</span>
                <select value={selectedCase?.id || ""} onChange={(event) => setCaseId(event.target.value)}>
                  {cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fields.number || item.id} · {item.fields.title || "Caso local"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="template-actions">
                <button className="secondary-button" onClick={() => void copyRendered()}>Copiar</button>
                <button className="secondary-button" onClick={() => downloadText(`${generatingRecord.values[2] || "escrito"}.txt`, rendered.text)}>Descargar .txt</button>
              </div>
              {copyStatus ? <p className="muted" role="status">{copyStatus}</p> : null}
              <pre className="template-preview" aria-label="Vista previa del escrito">{rendered.text}</pre>
              {rendered.missing.length ? (
                <p className="template-warning" role="status">
                  Variables sin dato: {rendered.missing.map((key) => templateVariableLabel(key, variableOptions)).join(", ")}
                </p>
              ) : null}
            </>
          ) : (
            <div className="empty-table">No hay expedientes disponibles para generar el escrito.</div>
          )}
        </section>
      ) : null}

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <section
            className="modal-card module-modal template-modal"
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Editar template" : "Nuevo template"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-heading">
              <div>
                <h3>{editingId ? "Editar template" : "Nuevo template"}</h3>
                <p>Usá la paleta para insertar comodines en el contenido.</p>
              </div>
              <button className="icon-button" aria-label="Cerrar" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={(event) => void submit(event)}>
              <label className="field">
                <span>Nombre</span>
                <input required value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Contestación de demanda" />
              </label>
              <label className="field">
                <span>Tipo de documento</span>
                <input value={draft.documentType} onChange={(event) => setDraft((current) => ({ ...current, documentType: event.target.value }))} placeholder="Escrito, Oficio, Cédula..." />
              </label>
              <label className="field">
                <span>Contenido</span>
                <textarea ref={bodyRef} rows={10} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Escribí el texto y agregá comodines como {{number}}." />
              </label>
              <div className="template-palette">
                <span className="muted">Insertar variable:</span>
                {variableOptions.map((option) => (
                  <button type="button" key={option.key} className="template-chip" onClick={() => insertVariable(option.key)}>
                    {option.label}
                  </button>
                ))}
              </div>
              {!draft.body.trim() ? (
                <button type="button" className="text-button" onClick={() => setDraft((current) => ({ ...current, body: STARTER_BODY }))}>
                  Insertar estructura de ejemplo
                </button>
              ) : null}
              {error ? <div className="inline-error" role="alert">{error}</div> : null}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? "Guardando…" : "Guardar template"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
