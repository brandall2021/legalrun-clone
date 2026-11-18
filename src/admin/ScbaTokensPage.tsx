import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ACCOUNT_STATUS_OPTIONS } from "./CredentialsPage";

type AccountStatus = (typeof ACCOUNT_STATUS_OPTIONS)[number];

type ScbaTokenRecord = {
  id: string;
  alias: string;
  holderName: string;
  status: AccountStatus;
  expiresOn: string;
  lastCheckedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type ScbaTokenDraft = {
  alias: string;
  holderName: string;
  status: AccountStatus;
  expiresOn: string;
  lastCheckedAt: string;
  notes: string;
};

function emptyDraft(): ScbaTokenDraft {
  return {
    alias: "",
    holderName: "",
    status: "Activo",
    expiresOn: "",
    lastCheckedAt: "",
    notes: "",
  };
}

function sortTokens(list: ScbaTokenRecord[]) {
  return [...list].sort((a, b) => a.alias.localeCompare(b.alias, "es", { sensitivity: "base" }));
}

function normalizeDateInputValue(value: string) {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function serializeLastCheckedAt(value: string, originalValue: string) {
  const normalized = normalizeDateInputValue(value);
  if (!normalized) return "";
  return normalizeDateInputValue(originalValue) === normalized ? String(originalValue || "").trim() : normalized;
}

export function ScbaTokensPage({ onSaved }: { onSaved: (message: string) => void }) {
  const [tokens, setTokens] = useState<ScbaTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOriginalLastCheckedAt, setEditingOriginalLastCheckedAt] = useState("");
  const [draft, setDraft] = useState<ScbaTokenDraft>(emptyDraft);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/scba-tokens", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los tokens SCBA");
        if (!cancelled) {
          setTokens(sortTokens(data.scbaTokens || []));
          setError("");
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los tokens SCBA");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return tokens;
    return tokens.filter((token) =>
      `${token.alias} ${token.holderName} ${token.status} ${token.notes}`.toLowerCase().includes(needle),
    );
  }, [filter, tokens]);

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setEditingOriginalLastCheckedAt("");
    setDraft(emptyDraft());
  }

  function openCreate() {
    setError("");
    setEditingId(null);
    setEditingOriginalLastCheckedAt("");
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(token: ScbaTokenRecord) {
    setError("");
    setEditingId(token.id);
    setEditingOriginalLastCheckedAt(token.lastCheckedAt);
    setDraft({
      alias: token.alias,
      holderName: token.holderName,
      status: token.status,
      expiresOn: token.expiresOn,
      lastCheckedAt: normalizeDateInputValue(token.lastCheckedAt),
      notes: token.notes,
    });
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        alias: draft.alias.trim(),
        holderName: draft.holderName.trim(),
        status: draft.status,
        expiresOn: draft.expiresOn,
        lastCheckedAt: serializeLastCheckedAt(draft.lastCheckedAt, editingOriginalLastCheckedAt),
        notes: draft.notes.trim(),
      };
      const response = await fetch(`/api/admin/scba-tokens${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el token SCBA");
      const saved = data.scbaToken as ScbaTokenRecord;
      setTokens((current) => sortTokens(editingId ? current.map((token) => token.id === saved.id ? saved : token) : [saved, ...current]));
      closeModal();
      onSaved(editingId ? "Token SCBA actualizado en la base local" : "Token SCBA creado en la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el token SCBA");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">CONFIGURACIÓN / ADMINISTRACIÓN</p>
          <h1>Tokens SCBA</h1>
          <p className="muted">Llevá un registro local/manual de múltiples tokens SCBA del estudio, sus titulares y sus vencimientos.</p>
        </div>
        <div className="title-actions">
          <button className="primary-button" onClick={openCreate}>Nuevo token SCBA</button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="search-toolbar">
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por alias, titular o estado..." />
          <button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button>
          <span className="muted">{tokens.length} totales</span>
        </div>

        {error ? <div className="inline-error" role="alert">{error}</div> : null}

        {loading ? (
          <div className="empty-table">Cargando desde SQLite…</div>
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Titular</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>Último control</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((token) => (
                  <tr key={token.id}>
                    <td>{token.alias}</td>
                    <td>{token.holderName}</td>
                    <td>{token.status}</td>
                    <td>{token.expiresOn || "—"}</td>
                    <td>{token.lastCheckedAt || "—"}</td>
                    <td>
                      <button className="text-button" aria-label={`Editar token ${token.alias}`} onClick={() => openEdit(token)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-table">
            {tokens.length ? "No hay resultados para el filtro aplicado." : "No hay tokens SCBA cargados todavía."}
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <section className="modal-card module-modal" role="dialog" aria-modal="true" aria-label={editingId ? "Editar token SCBA" : "Nuevo token SCBA"} onClick={(event) => event.stopPropagation()}>
            <div className="panel-heading">
              <div>
                <h3>{editingId ? "Editar token SCBA" : "Nuevo token SCBA"}</h3>
                <p>Los datos se guardan de forma local, sin integración ni validación automática contra servicios externos.</p>
              </div>
            </div>

            <form onSubmit={(event) => void submit(event)}>
              <div className="module-form-grid">
                <label className="field">
                  <span>Alias</span>
                  <input required disabled={saving} value={draft.alias} onChange={(event) => setDraft((current) => ({ ...current, alias: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Titular</span>
                  <input required disabled={saving} value={draft.holderName} onChange={(event) => setDraft((current) => ({ ...current, holderName: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Estado</span>
                  <select value={draft.status} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as AccountStatus }))}>
                    {ACCOUNT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Vence</span>
                  <input type="date" disabled={saving} value={draft.expiresOn} onChange={(event) => setDraft((current) => ({ ...current, expiresOn: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Último control</span>
                  <input type="date" disabled={saving} value={draft.lastCheckedAt} onChange={(event) => setDraft((current) => ({ ...current, lastCheckedAt: event.target.value }))} />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Notas</span>
                  <textarea disabled={saving} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
                </label>
              </div>
              {error ? <div className="inline-error" role="alert">{error}</div> : null}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeModal} disabled={saving}>Cancelar</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar token"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
