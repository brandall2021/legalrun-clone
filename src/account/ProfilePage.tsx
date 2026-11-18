import { useEffect, useState, type FormEvent } from "react";
import type { LocalUser } from "./types";

type AccountProfile = LocalUser & {
  phoneMobile: string;
  phoneWork: string;
  jobTitle: string;
};

type ProfilePageProps = {
  session: LocalUser;
  onSessionUpdated: (user: LocalUser) => void;
  onSaved: (message: string) => void;
};

function defaultProfile(session: LocalUser): AccountProfile {
  return {
    ...session,
    phoneMobile: "",
    phoneWork: "",
    jobTitle: "",
  };
}

function readProfile(value: unknown, session: LocalUser): AccountProfile {
  const raw = typeof value === "object" && value ? value as Partial<AccountProfile> : {};
  return {
    id: String(raw.id || session.id),
    email: String(raw.email || session.email),
    firstName: String(raw.firstName || ""),
    lastName: String(raw.lastName || ""),
    roleName: String(raw.roleName || session.roleName || ""),
    isAdmin: raw.isAdmin === undefined ? session.isAdmin : Boolean(raw.isAdmin),
    phoneMobile: String(raw.phoneMobile || ""),
    phoneWork: String(raw.phoneWork || ""),
    jobTitle: String(raw.jobTitle || ""),
  };
}

function toSessionUser(profile: AccountProfile): LocalUser {
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    roleName: profile.roleName,
    isAdmin: profile.isAdmin,
  };
}

export function ProfilePage({ session, onSessionUpdated, onSaved }: ProfilePageProps) {
  const [profile, setProfile] = useState<AccountProfile>(() => defaultProfile(session));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSuccess(false);
    setProfile(defaultProfile(session));
    fetch("/api/account/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el perfil");
        if (!cancelled) setProfile(readProfile(data?.profile, session));
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo cargar el perfil");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [session.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const payload = {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phoneMobile: profile.phoneMobile.trim(),
        phoneWork: profile.phoneWork.trim(),
        jobTitle: profile.jobTitle.trim(),
      };
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el perfil");
      const next = readProfile(data?.profile, session);
      setProfile(next);
      setSuccess(true);
      onSessionUpdated(toSessionUser(next));
      onSaved("Perfil actualizado en la base local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">CONFIGURACIÓN / CUENTA</p>
          <h1>Perfil</h1>
          <p className="muted">Actualizá tus datos personales de esta cuenta local sin salir del flujo autenticado actual.</p>
        </div>
      </div>
      <section className="panel password-panel">
        <div className="panel-heading">
          <div>
            <h3>Datos personales</h3>
            <p>La cuenta activa es <strong>{profile.email}</strong> y los cambios se guardan en la base SQLite local.</p>
          </div>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          <div className="fields-grid">
            <label className="field">
              <span>Email</span>
              <input value={profile.email} disabled readOnly />
            </label>
            <label className="field">
              <span>Rol</span>
              <input value={profile.roleName || (profile.isAdmin ? "Administrador" : "Usuario")} disabled readOnly />
            </label>
            <label className="field">
              <span>Nombre</span>
              <input disabled={loading || saving} value={profile.firstName} onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))} />
            </label>
            <label className="field">
              <span>Apellido</span>
              <input disabled={loading || saving} value={profile.lastName} onChange={(event) => setProfile((current) => ({ ...current, lastName: event.target.value }))} />
            </label>
            <label className="field">
              <span>Teléfono celular</span>
              <input disabled={loading || saving} value={profile.phoneMobile} onChange={(event) => setProfile((current) => ({ ...current, phoneMobile: event.target.value }))} />
            </label>
            <label className="field">
              <span>Teléfono trabajo</span>
              <input disabled={loading || saving} value={profile.phoneWork} onChange={(event) => setProfile((current) => ({ ...current, phoneWork: event.target.value }))} />
            </label>
            <label className="field">
              <span>Cargo</span>
              <input disabled={loading || saving} value={profile.jobTitle} onChange={(event) => setProfile((current) => ({ ...current, jobTitle: event.target.value }))} />
            </label>
          </div>
          {error ? <div className="inline-error" role="alert">{error}</div> : null}
          {success ? <p className="form-message" role="status">Perfil actualizado correctamente.</p> : null}
          <div className="panel-footer">
            <span className="muted">Podés seguir usando el flujo actual de seguridad para cambiar tu contraseña.</span>
            <div className="modal-actions">
              <a className="secondary-button button-link" href="#/client/configuracion/security">Cambiar contraseña</a>
              <button className="primary-button" type="submit" disabled={loading || saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
            </div>
          </div>
        </form>
      </section>
    </>
  );
}
