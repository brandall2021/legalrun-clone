import { useEffect, useMemo, useState, type FormEvent } from "react";

export const ACCOUNT_STATUS_OPTIONS = ["Activo", "Pendiente", "Vencido", "Inactivo"] as const;

type AccountStatus = (typeof ACCOUNT_STATUS_OPTIONS)[number];

type CredentialRecord = {
  id: string;
  name: string;
  credentialType: string;
  ownerName: string;
  status: AccountStatus;
  expiresOn: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type CredentialDraft = {
  name: string;
  credentialType: string;
  ownerName: string;
  status: AccountStatus;
  expiresOn: string;
  notes: string;
};

function emptyDraft(): CredentialDraft {
  return {
    name: "",
    credentialType: "",
    ownerName: "",
    status: "Activo",
    expiresOn: "",
    notes: "",
  };
}

function sortCredentials(list: CredentialRecord[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

export function CredentialsPage({ onSaved }: { onSaved: (message: string) => void }) {
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CredentialDraft>(emptyDraft);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/credentials", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar las credenciales");
        if (!cancelled) {
          setCredentials(sortCredentials(data.credentials || []));
          setError("");
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las credenciales");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return credentials;
    return credentials.filter((credential) =>
      `${credential.name} ${credential.credentialType} ${credential.ownerName} ${credential.status} ${credential.notes}`.toLowerCase().includes(needle),
    );
  }, [credentials, filter]);

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

  function openEdit(credential: CredentialRecord) {
    setError("");
    setEditingId(credential.id);
    setDraft({
      name: credential.name,
      credentialType: credential.credentialType,
      ownerName: credential.ownerName,
      status: credential.status,
      expiresOn: credential.expiresOn,
      notes: credential.notes,
    });
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: draft.name.trim(),
        credentialType: draft.credentialType.trim(),
        ownerName: draft.ownerName.trim(),
        status: draft.status,
        expiresOn: draft.expiresOn,
        notes: draft.notes.trim(),
      };
      const response = await fetch(`/api/admin/credentials${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la credencial");
      const saved = data.credential as CredentialRecord;
      setCredentials((current) => sortCredentials(editingId ? current.map((credential) => credential.id === saved.id ? saved : credential) : [saved, ...current]));
      closeModal();
      onSaved(editingId ? "Credencial actualizada en la base local" : "Credencial creada en la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la credencial");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">CONFIGURACIÓN / ADMINISTRACIÓN</p>
          <h1>Credenciales</h1>
          <p className="muted">Administrá credenciales locales del estudio sin validar servicios externos y manteniendo la sesión HTTP-only actual.</p>
        </div>
        <div className="title-actions">
          <button className="primary-button" onClick={openCreate}>Nueva credencial</button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="search-toolbar">
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por nombre, tipo, titular o estado..." />
          <button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button>
          <span className="muted">{credentials.length} totales</span>
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
                  <th>Titular</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((credential) => (
                  <tr key={credential.id}>
                    <td>{credential.name}</td>
                    <td>{credential.credentialType}</td>
                    <td>{credential.ownerName}</td>
                    <td>{credential.status}</td>
                    <td>{credential.expiresOn || "—"}</td>
                    <td>
                      <button className="text-button" aria-label={`Editar credencial ${credential.name}`} onClick={() => openEdit(credential)}>
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
            {credentials.length ? "No hay resultados para el filtro aplicado." : "No hay credenciales cargadas todavía."}
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <section className="modal-card module-modal" role="dialog" aria-modal="true" aria-label={editingId ? "Editar credencial" : "Nueva credencial"} onClick={(event) => event.stopPropagation()}>
            <div className="panel-heading">
              <div>
                <h3>{editingId ? "Editar credencial" : "Nueva credencial"}</h3>
                <p>Este módulo es local/manual: solo registra la credencial en SQLite.</p>
              </div>
            </div>

            <form onSubmit={(event) => void submit(event)}>
              <div className="module-form-grid">
                <label className="field">
                  <span>Nombre</span>
                  <input required disabled={saving} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Tipo</span>
                  <input required disabled={saving} value={draft.credentialType} onChange={(event) => setDraft((current) => ({ ...current, credentialType: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Titular</span>
                  <input required disabled={saving} value={draft.ownerName} onChange={(event) => setDraft((current) => ({ ...current, ownerName: event.target.value }))} />
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
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Notas</span>
                  <textarea disabled={saving} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
                </label>
              </div>
              {error ? <div className="inline-error" role="alert">{error}</div> : null}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeModal} disabled={saving}>Cancelar</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar credencial"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
