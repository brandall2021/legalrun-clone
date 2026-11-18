import { useEffect, useMemo, useState, type FormEvent } from "react";

type StudioRole = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type StudioUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string | null;
  roleName: string;
  jobTitle: string;
  phoneMobile: string;
  phoneWork: string;
  isAdmin: boolean;
  isActive: boolean;
  isResponsible: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserDraft = {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  jobTitle: string;
  temporaryPassword: string;
  isActive: boolean;
  isResponsible: boolean;
};

function sortUsers(list: StudioUser[]) {
  return [...list].sort((a, b) => a.email.localeCompare(b.email, "es", { sensitivity: "base" }));
}

function activeRoles(roles: StudioRole[]) {
  return roles.filter((role) => role.isActive);
}

function roleOptionsFor(roles: StudioRole[], currentRoleId?: string | null) {
  return roles.filter((role) => role.isActive || role.id === currentRoleId);
}

function draftForCreate(roles: StudioRole[]): UserDraft {
  return {
    email: "",
    firstName: "",
    lastName: "",
    roleId: activeRoles(roles)[0]?.id || "",
    jobTitle: "",
    temporaryPassword: "",
    isActive: true,
    isResponsible: false,
  };
}

function draftForEdit(user: StudioUser): UserDraft {
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleId: user.roleId || "",
    jobTitle: user.jobTitle,
    temporaryPassword: "",
    isActive: user.isActive,
    isResponsible: user.isResponsible,
  };
}

export function UsersAdminPage({ onSaved }: { onSaved: (message: string) => void }) {
  const [roles, setRoles] = useState<StudioRole[]>([]);
  const [users, setUsers] = useState<StudioUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserDraft>(draftForCreate([]));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/admin/roles", { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los roles");
        return data.roles || [];
      }),
      fetch("/api/admin/users", { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los usuarios");
        return data.users || [];
      }),
    ])
      .then(([nextRoles, nextUsers]) => {
        if (!cancelled) {
          setRoles(nextRoles);
          setUsers(sortUsers(nextUsers));
          setError("");
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => `${user.email} ${user.firstName} ${user.lastName} ${user.roleName} ${user.jobTitle}`.toLowerCase().includes(needle));
  }, [filter, users]);

  const activeRoleList = activeRoles(roles);
  const currentRoleId = editingId ? users.find((user) => user.id === editingId)?.roleId || null : null;
  const availableRoles = roleOptionsFor(roles, currentRoleId);

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setDraft(draftForCreate(roles));
  }

  function openCreate() {
    setError("");
    setEditingId(null);
    setDraft(draftForCreate(roles));
    setModalOpen(true);
  }

  function openEdit(user: StudioUser) {
    setError("");
    setEditingId(user.id);
    setDraft(draftForEdit(user));
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        email: draft.email.trim().toLowerCase(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        roleId: draft.roleId || null,
        jobTitle: draft.jobTitle.trim(),
        isActive: draft.isActive,
        isResponsible: draft.isResponsible,
      };
      if (editingId) {
        if (draft.temporaryPassword.trim()) payload.temporaryPassword = draft.temporaryPassword;
      } else {
        payload.temporaryPassword = draft.temporaryPassword;
      }

      const response = await fetch(`/api/admin/users${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el usuario");
      const saved = data.user as StudioUser;
      setUsers((current) => sortUsers(editingId ? current.map((user) => user.id === saved.id ? saved : user) : [saved, ...current]));
      closeModal();
      onSaved(editingId ? "Usuario actualizado en la base local" : "Usuario creado en la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">CONFIGURACIÓN / ADMINISTRACIÓN</p>
          <h1>Usuarios</h1>
          <p className="muted">Creá y editá usuarios locales con contraseña temporal, rol asignado y marcas de estado/responsable.</p>
          <p className="muted">
            Roles activos disponibles para alta:{" "}
            {activeRoleList.length ? activeRoleList.map((role, index) => (
              <span key={role.id}>
                {index ? ", " : ""}
                {role.name}
              </span>
            )) : "sin roles activos"}
            .
          </p>
        </div>
        <div className="title-actions">
          <button className="primary-button" onClick={openCreate}>Nuevo usuario</button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="search-toolbar">
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por email, nombre, rol o cargo..." />
          <button className="secondary-button" onClick={() => setFilter("")}>Limpiar</button>
          <span className="muted">{users.filter((user) => user.isActive).length} activos · {users.length} totales</span>
        </div>

        {error ? <div className="inline-error" role="alert">{error}</div> : null}

        {loading ? (
          <div className="empty-table">Cargando desde SQLite…</div>
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Cargo</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "—"}</td>
                    <td>{user.roleName || "Sin rol"}</td>
                    <td>{user.jobTitle || "—"}</td>
                    <td>{user.isResponsible ? "Sí" : "No"}</td>
                    <td>{user.isActive ? "Activo" : "Inactivo"}</td>
                    <td>
                      <button className="text-button" aria-label={`Editar usuario ${user.email}`} onClick={() => openEdit(user)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-table">No hay usuarios cargados todavía.</div>
        )}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <section className="modal-card module-modal" role="dialog" aria-modal="true" aria-label={editingId ? "Editar usuario" : "Nuevo usuario"} onClick={(event) => event.stopPropagation()}>
            <div className="panel-heading">
              <div>
                <h3>{editingId ? "Editar usuario" : "Nuevo usuario"}</h3>
                <p>La cuenta se guarda en la base SQLite local y reutiliza la sesión HTTP-only existente.</p>
              </div>
            </div>

            <form onSubmit={(event) => void submit(event)}>
              <div className="module-form-grid">
                <label className="field">
                  <span>Email</span>
                  <input required type="email" disabled={saving} value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label className="field">
                  <span>{editingId ? "Nueva contraseña temporal" : "Contraseña temporal"}</span>
                  <input type="password" required={!editingId} disabled={saving} value={draft.temporaryPassword} onChange={(event) => setDraft((current) => ({ ...current, temporaryPassword: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Nombre</span>
                  <input disabled={saving} value={draft.firstName} onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Apellido</span>
                  <input disabled={saving} value={draft.lastName} onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Cargo</span>
                  <input disabled={saving} value={draft.jobTitle} onChange={(event) => setDraft((current) => ({ ...current, jobTitle: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Rol</span>
                  <select value={draft.roleId} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, roleId: event.target.value }))}>
                    <option value="">Sin rol</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check-item">
                  <input type="checkbox" checked={draft.isActive} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                  <span>Activo</span>
                </label>
                <label className="check-item">
                  <input type="checkbox" checked={draft.isResponsible} disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, isResponsible: event.target.checked }))} />
                  <span>Responsable</span>
                </label>
              </div>
              {error ? <div className="inline-error" role="alert">{error}</div> : null}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeModal} disabled={saving}>Cancelar</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar usuario"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
