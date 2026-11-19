import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  SUGGESTION_MODULE_KEY,
  defaultSuggestionRecords,
  ruleValues,
  rulesFromRecords,
  type SuggestionRule,
} from "./suggestionRules";

const MODULE_URL = `/api/modules/${encodeURIComponent(SUGGESTION_MODULE_KEY)}`;
const TEMPLATE_MODULE_URL = `/api/modules/${encodeURIComponent("client/configuracion/template@v2")}`;
const BASE_TEMPLATE_OPTIONS = ["Presentación simple", "Oficio"];

type Draft = { label: string; state: string; substate: string; template: string; automatic: boolean };

function emptyDraft(state: string): Draft {
  return { label: "", state, substate: "", template: BASE_TEMPLATE_OPTIONS[0], automatic: false };
}

function normalizeRecord(record: { id: string; values?: string[] }) {
  return { id: record.id, values: Array.isArray(record.values) ? record.values : [] };
}

export function SuggestionRulesPage({ states, onSaved }: { states: string[]; onSaved: (message: string) => void }) {
  const stateOptions = states.length ? states : ["En trámite"];
  const [rules, setRules] = useState<SuggestionRule[]>([]);
  const [templateOptions, setTemplateOptions] = useState<string[]>(BASE_TEMPLATE_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; values: string[] } | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(stateOptions[0]));

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      setLoading(true);
      try {
        const response = await fetch(MODULE_URL, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar las reglas de sugerencia");
        let list: Array<{ id: string; values?: string[] }> = Array.isArray(data.records) ? data.records.map(normalizeRecord) : [];
        if (!data.initialized) {
          const seeded = await fetch(`${MODULE_URL}/initialize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: defaultSuggestionRecords() }),
          });
          const seededData = await seeded.json();
          if (!seeded.ok) throw new Error(seededData.error || "No se pudieron inicializar las reglas de sugerencia");
          list = Array.isArray(seededData.records) ? seededData.records.map(normalizeRecord) : [];
        }
        if (cancelled) return;
        setRules(list.length ? rulesFromRecords(list) : []);
        setError("");
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las reglas de sugerencia");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(TEMPLATE_MODULE_URL, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || cancelled) return;
        const names = (Array.isArray(data.records) ? data.records : [])
          .map((record: { values?: string[] }) => String(record.values?.[2] || "").trim())
          .filter(Boolean);
        if (!names.length) return;
        setTemplateOptions((current) => [...new Set([...current, ...names])].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })));
      })
      .catch(() => { /* la paleta conserva las opciones base */ });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return rules;
    return rules.filter((rule) => `${rule.label} ${rule.state} ${rule.substate} ${rule.template}`.toLowerCase().includes(needle));
  }, [rules, filter]);

  function openCreate() {
    setError("");
    setEditing(null);
    setDraft(emptyDraft(stateOptions[0]));
    setModalOpen(true);
  }

  function openEdit(rule: SuggestionRule) {
    setError("");
    setEditing(rule.id && rule.values ? { id: rule.id, values: rule.values } : null);
    setDraft({
      label: rule.label,
      state: rule.state || stateOptions[0],
      substate: rule.substate,
      template: rule.template || BASE_TEMPLATE_OPTIONS[0],
      automatic: rule.automatic,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = draft.label.trim();
    if (!label) {
      setError("La etiqueta es obligatoria");
      return;
    }
    const rule: SuggestionRule = {
      label,
      template: draft.template.trim(),
      state: draft.state.trim() || stateOptions[0],
      substate: draft.substate.trim(),
      automatic: draft.automatic,
    };
    const values = editing ? [...editing.values] : ruleValues(rule);
    values[5] = rule.label;
    values[7] = rule.automatic ? "Sí" : "No";
    values[9] = rule.template;
    values[11] = rule.state;
    values[12] = rule.substate;
    if (!values[0]) values[0] = `Sugerencia para ${rule.label}`;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${MODULE_URL}${editing ? `/${encodeURIComponent(editing.id)}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la regla de sugerencia");
      const saved = normalizeRecord(data);
      setRules((current) => {
        const next = editing
          ? current.map((item) => (item.id === editing.id ? rulesFromRecords([saved])[0] : item))
          : [...current, rulesFromRecords([saved])[0]];
        return next.filter(Boolean);
      });
      closeModal();
      onSaved(editing ? "Regla de sugerencia actualizada" : "Regla de sugerencia guardada en la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la regla de sugerencia");
    } finally {
      setSaving(false);
    }
  }

  async function remove(rule: SuggestionRule) {
    if (!rule.id) return;
    if (!window.confirm("¿Eliminar esta regla de sugerencia?")) return;
    try {
      const response = await fetch(`${MODULE_URL}/${encodeURIComponent(rule.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo eliminar la regla de sugerencia");
      setRules((current) => current.filter((item) => item.id !== rule.id));
      onSaved("Regla de sugerencia eliminada de la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la regla de sugerencia");
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">CONFIGURACIÓN / ETIQUETADO</p>
          <h1>Sugerencias por etiqueta</h1>
          <p className="muted">Definí qué estado judicial y qué template propone la app cuando detecta una etiqueta en un movimiento.</p>
        </div>
        <div className="title-actions">
          <button className="primary-button" onClick={openCreate}>Nueva regla</button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="search-toolbar">
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por etiqueta, estado o template..." />
          <button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button>
          <span className="muted">{rules.length} reglas</span>
        </div>

        <p className="muted suggestion-hint">Estas reglas alimentan la sugerencia local de estado y template que se muestra al registrar una novedad.</p>

        {error ? <div className="inline-error" role="alert">{error}</div> : null}

        {loading ? (
          <div className="empty-table">Cargando desde SQLite…</div>
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Etiqueta</th>
                  <th>Estado judicial</th>
                  <th>Subestado</th>
                  <th>Template</th>
                  <th>Automático</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rule) => (
                  <tr key={rule.id || rule.label}>
                    <td><span className="tag blue">{rule.label}</span></td>
                    <td>{rule.state || "—"}</td>
                    <td>{rule.substate || "—"}</td>
                    <td>{rule.template || "—"}</td>
                    <td>{rule.automatic ? "Sí" : "No"}</td>
                    <td>
                      <button className="text-button" aria-label={`Editar regla ${rule.label}`} onClick={() => openEdit(rule)}>Editar</button>
                      <button className="text-button danger-text" onClick={() => void remove(rule)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-table">
            {rules.length ? "No hay resultados para el filtro aplicado." : "No hay reglas de sugerencia cargadas todavía."}
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <section
            className="modal-card module-modal"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Editar regla de sugerencia" : "Nueva regla de sugerencia"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-heading">
              <div>
                <h3>{editing ? "Editar regla de sugerencia" : "Nueva regla de sugerencia"}</h3>
                <p>La etiqueta se compara sin distinguir mayúsculas ni tildes.</p>
              </div>
              <button className="icon-button" aria-label="Cerrar" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={(event) => void submit(event)}>
              <label className="field">
                <span>Etiqueta</span>
                <input required value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Ej. Sentencia" />
              </label>
              <label className="field">
                <span>Estado judicial</span>
                <select value={draft.state} onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))}>
                  {[...new Set([...stateOptions, draft.state].filter(Boolean))].map((state) => <option key={state}>{state}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Subestado judicial</span>
                <input value={draft.substate} onChange={(event) => setDraft((current) => ({ ...current, substate: event.target.value }))} placeholder="Opcional" />
              </label>
              <label className="field">
                <span>Template</span>
                <select value={draft.template} onChange={(event) => setDraft((current) => ({ ...current, template: event.target.value }))}>
                  {[...new Set([...templateOptions, draft.template].filter(Boolean))].map((template) => <option key={template}>{template}</option>)}
                </select>
              </label>
              <label className="check-field">
                <input type="checkbox" checked={draft.automatic} onChange={(event) => setDraft((current) => ({ ...current, automatic: event.target.checked }))} />
                <span>Marcar la sugerencia como automática</span>
              </label>
              {error ? <div className="inline-error" role="alert">{error}</div> : null}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? "Guardando…" : "Guardar regla"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
