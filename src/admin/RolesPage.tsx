import { useEffect, useMemo, useState, type FormEvent } from "react";

type StudioRole = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RoleDraft = {
  name: string;
  description: string;
  isActive: boolean;
};

const emptyDraft = (): RoleDraft => ({
  name: "",
  description: "",
  isActive: true,
});

function sortRoles(list: StudioRole[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

export function RolesPage({ onSaved }: { onSaved: (message: string) => void }) {
  const [roles, setRoles] = useState<StudioRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoleDraft>(emptyDraft);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/roles", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los roles");
        if (!cancelled) {
          setRoles(sortRoles(data.roles || []));
          setError("");
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los roles");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return roles;
    return roles.filter((role) => `${role.name} ${role.description}`.toLowerCase().includes(needle));
  }, [filter, roles]);

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

  function openEdit(role: StudioRole) {
    setError("");
    setEditingId(role.id);
    setDraft({
      name: role.name,
      description: role.description,
      isActive: role.isActive,
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
        description: draft.description.trim(),
        isActive: draft.isActive,
      };
      const response = await fetch(`/api/admin/roles${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el rol");
      const saved = data.role as StudioRole;
      setRoles((current) => sortRoles(editingId ? current.map((role) => role.id === saved.id ? saved : role) : [saved, ...current]));
      closeModal();
      onSaved(editingId ? "Rol actualizado en la base local" : "Rol creado en la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el rol");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">CONFIGURACIÓN / ADMINISTRACIÓN</p>
          <h1>Roles</h1>
          <p className="muted">Administrá los roles locales del estudio y su estado activo/inactivo sin salir del flujo autenticado actual.</p>
        </div>
        <div className="title-actions">
          <button className="primary-button" onClick={openCreate}>Nuevo rol</button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="search-toolbar">
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por nombre o descripción..." />
          <button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button>
          <span className="muted">{roles.filter((role) => role.isActive).length} activos · {roles.length} totales</span>
        </div>

        {error ? <div className="inline-error" role="alert">{error}</div> : null}

        {loading ? (
          <div className="empty-table">Cargando desde SQLite…</div>
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rol</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Actualizado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((role) => (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    <td>{role.description || "—"}</td>
                    <td>{role.isActive ? "Activo" : "Inactivo"}</td>
                    <td>{role.updatedAt || role.createdAt || "—"}</td>
                    <td>
                      <button className="text-button" aria-label={`Editar rol ${role.name}`} onClick={() => openEdit(role)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-table">No hay roles cargados todavía.</div>
        )}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-label={editingId ? "Editar rol" : "Nuevo rol"} onClick={(event) => event.stopPropagation()}>
            <div className="panel-heading">
              <div>
                <h3>{editingId ? "Editar rol" : "Nuevo rol"}</h3>
                <p>Los cambios se guardan en la base SQLite local.</p>
              </div>
            </div>

            <form onSubmit={(event) => void submit(event)}>
              <div className="fields-grid">
                <label className="field">
                  <span>Nombre</span>
                  <input required disabled={saving} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Descripción</span>
                  <input disabled={saving} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
                </label>
                <label className="check-item">
                  <input type="checkbox" checked={draft.isActive} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                  <span>Activo</span>
                </label>
              </div>
              {error ? <div className="inline-error" role="alert">{error}</div> : null}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeModal} disabled={saving}>Cancelar</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar rol"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
