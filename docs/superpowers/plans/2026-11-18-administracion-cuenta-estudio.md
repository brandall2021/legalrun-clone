# Administración de cuenta y estudio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real local account-and-studio administration suite with Profile, Users, Roles, Credentials, and SCBA Tokens on top of the existing auth/session system.

**Architecture:** Extend the current SQLite-backed auth model in `server/index.mjs` with dedicated admin tables and protected `/api/account/*` + `/api/admin/*` endpoints. Add specialized frontend pages for account/studio administration, keeping the existing hash router in `src/App.tsx` while moving page components into focused files under `src/account/` and `src/admin/`.

**Tech Stack:** React 19, TypeScript, Vite 6, Vitest, Testing Library, Node ESM, SQLite

**Spec:** `docs/superpowers/specs/2026-11-18-administracion-cuenta-estudio-design.md`

## Global Constraints

- Debe seguir siendo una réplica **local-only**.
- Debe reutilizar la autenticación/sesión HTTP-only ya existente.
- Debe mantener el hash router y los patrones visuales actuales.
- Debe convivir con el backend actual en `server/index.mjs` y SQLite local.
- Debe evitar refactors amplios fuera del alcance del bloque de cuenta/estudio.
- Debe cubrir los nuevos flujos con tests de frontend y/o backend donde aporte señal real.
- Solo usuarios con rol **Administrador** pueden ver y usar Usuarios, Roles, Credenciales y Token SCBA.
- Los usuarios creados desde la suite administrativa se crean con **contraseña temporal local**.
- Los estados válidos para Credenciales y Token SCBA son exactamente: `Activo`, `Pendiente`, `Vencido`, `Inactivo`.
- Este workspace no está inicializado como repositorio Git; los pasos de commit deben reemplazarse por registro claro de archivos cambiados y verificación ejecutada.

## Review Focus

- Un usuario autenticado sin `isAdmin` no debe poder abrir ni operar módulos `/api/admin/*`; la UI debe ocultarlos y el backend debe rechazar acceso directo.
- La creación de usuario administrativo debe requerir contraseña temporal y no debe degradar el login/registro local existente.
- Roles inactivos no deben aparecer como opción para nuevas asignaciones, pero los usuarios ya vinculados deben seguir mostrando su rol actual.
- Los listados vacíos de Credenciales y Token SCBA deben renderizar estado vacío claro y CTA de creación, no tablas rotas.
- El perfil propio debe seguir siendo editable aunque el usuario no sea administrador.

---

### Task 1: Extend auth/session model and add account/admin endpoints

**Files:**
- Modify: `server/index.mjs`
- Create: `server/account-admin.test.mjs`

**Interfaces:**
- Consumes: existing `users`, `sessions`, `sessionUser(req)`, `issueSession(res, userId)`, `getJson(req)`, `sendJson(res, status, payload)`
- Produces:
  - enriched auth/session user shape `{ id: string; email: string; firstName: string; lastName: string; roleName: string; isAdmin: boolean }`
  - `GET /api/account/profile`
  - `PUT /api/account/profile`
  - `GET /api/admin/roles`
  - `POST /api/admin/roles`
  - `PUT /api/admin/roles/:id`
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `PUT /api/admin/users/:id`
  - `GET /api/admin/credentials`
  - `POST /api/admin/credentials`
  - `PUT /api/admin/credentials/:id`
  - `GET /api/admin/scba-tokens`
  - `POST /api/admin/scba-tokens`
  - `PUT /api/admin/scba-tokens/:id`

- [ ] **Step 1: Write the failing backend tests**

```js
it("returns enriched session user data from /api/auth/me", async () => {
  expect(user.roleName).toBe("Administrador");
  expect(user.isAdmin).toBe(true);
});

it("rejects non-admin access to /api/admin/users", async () => {
  expect(status).toBe(403);
});

it("creates admin-managed users with a temporary password", async () => {
  expect(status).toBe(201);
  expect(body.user.email).toBe("nuevo@estudio.local");
});
```

- [ ] **Step 2: Run targeted test file to verify it fails**

Run: `npm.cmd test -- server/account-admin.test.mjs`  
Expected: FAIL because the test file/endpoints/schema do not exist yet

- [ ] **Step 3: Implement schema changes and routes in `server/index.mjs`**

Add profile/admin columns to `users`, create `studio_roles`, `studio_credentials`, and `studio_scba_tokens`, seed an admin role if needed, enrich the auth payloads, enforce `isAdmin` checks for `/api/admin/*`, and support admin user creation with `temporaryPassword: string`.

- [ ] **Step 4: Run targeted backend tests**

Run: `npm.cmd test -- server/account-admin.test.mjs`  
Expected: PASS

- [ ] **Step 5: Record changed files and verification**

Record the changed files plus the passing command/output in the task report; no Git commit in this workspace.

### Task 2: Add shared account/admin frontend types and route gating

**Files:**
- Create: `src/account/types.ts`
- Modify: `src/App.tsx`
- Create: `src/App.account-admin.test.tsx`

**Interfaces:**
- Consumes: enriched auth user from Task 1
- Produces:
  - `export type LocalUser = { id: string; email: string; firstName: string; lastName: string; roleName: string; isAdmin: boolean }`
  - route hashes:
    - `#/client/configuracion/profile`
    - `#/client/configuracion/roles`
    - `#/client/configuracion/credentials`
    - `#/client/configuracion/scba-tokens`
  - admin-only navigation visibility rules

- [ ] **Step 1: Write the failing route-gating test**

```tsx
it("hides estudio admin navigation for non-admin users", async () => {
  expect(screen.queryByText("Roles")).toBeNull();
  expect(screen.queryByText("Credenciales")).toBeNull();
});

it("shows estudio admin navigation for admin users", async () => {
  expect(await screen.findByText("Roles")).toBeTruthy();
  expect(screen.getByText("Credenciales")).toBeTruthy();
});
```

- [ ] **Step 2: Run targeted test to verify it fails**

Run: `npm.cmd test -- src/App.account-admin.test.tsx`  
Expected: FAIL because LocalUser shape/nav rules/routes are not implemented yet

- [ ] **Step 3: Implement shared user shape and route/nav gating**

Update session state, topbar/sidebar identity rendering, and route handling in `src/App.tsx` so only admins can reach studio-admin pages while all authenticated users can still reach Profile and Password.

- [ ] **Step 4: Run targeted frontend test**

Run: `npm.cmd test -- src/App.account-admin.test.tsx`  
Expected: PASS

- [ ] **Step 5: Record changed files and verification**

Record the changed files plus the passing command/output in the task report; no Git commit in this workspace.

### Task 3: Implement Profile page and self-service account update flow

**Files:**
- Create: `src/account/ProfilePage.tsx`
- Create: `src/account/ProfilePage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/account/profile`
  - `PUT /api/account/profile`
  - `LocalUser`
- Produces:
  - `export function ProfilePage({ session, onSessionUpdated, onSaved }: { session: LocalUser; onSessionUpdated: (user: LocalUser) => void; onSaved: (message: string) => void })`

- [ ] **Step 1: Write the failing Profile page test**

```tsx
it("loads and updates the current user's profile", async () => {
  expect(await screen.findByDisplayValue("María")).toBeTruthy();
  await userEvent.clear(screen.getByLabelText("Nombre"));
  await userEvent.type(screen.getByLabelText("Nombre"), "Ana");
  await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(saveProfile).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run targeted test to verify it fails**

Run: `npm.cmd test -- src/account/ProfilePage.test.tsx`  
Expected: FAIL because `ProfilePage` does not exist yet

- [ ] **Step 3: Implement `ProfilePage` and route wiring**

Render personal identity fields, keep email prominent, allow editing `firstName`, `lastName`, `phoneMobile`, `phoneWork`, `jobTitle`, and include a CTA to `#/client/configuracion/security`.

- [ ] **Step 4: Run targeted tests**

Run: `npm.cmd test -- src/account/ProfilePage.test.tsx src/App.account-admin.test.tsx`  
Expected: PASS

- [ ] **Step 5: Record changed files and verification**

Record the changed files plus the passing command/output in the task report; no Git commit in this workspace.

### Task 4: Implement Roles and Users admin pages

**Files:**
- Create: `src/admin/RolesPage.tsx`
- Create: `src/admin/UsersAdminPage.tsx`
- Create: `src/admin/RolesPage.test.tsx`
- Create: `src/admin/UsersAdminPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes:
  - `GET/POST/PUT /api/admin/roles`
  - `GET/POST/PUT /api/admin/users`
  - `LocalUser`
- Produces:
  - `export function RolesPage({ onSaved }: { onSaved: (message: string) => void })`
  - `export function UsersAdminPage({ onSaved }: { onSaved: (message: string) => void })`

- [ ] **Step 1: Write the failing admin page tests**

```tsx
it("creates and deactivates a role", async () => {
  expect(await screen.findByText("Administrador")).toBeTruthy();
});

it("creates a studio user with temporary password and assigned role", async () => {
  expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
    email: "nuevo@estudio.local",
    temporaryPassword: "Temporal123456",
  }));
});
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `npm.cmd test -- src/admin/RolesPage.test.tsx src/admin/UsersAdminPage.test.tsx`  
Expected: FAIL because the pages do not exist yet

- [ ] **Step 3: Implement `RolesPage` and `UsersAdminPage`**

Roles must support active/inactive state. Users must support create/edit, role assignment, active flag, responsible flag, and temporary password on create. New user role selectors must exclude inactive roles while existing assigned inactive roles still display.

- [ ] **Step 4: Run targeted tests**

Run: `npm.cmd test -- src/admin/RolesPage.test.tsx src/admin/UsersAdminPage.test.tsx`  
Expected: PASS

- [ ] **Step 5: Record changed files and verification**

Record the changed files plus the passing command/output in the task report; no Git commit in this workspace.

### Task 5: Implement Credentials and SCBA Tokens admin pages

**Files:**
- Create: `src/admin/CredentialsPage.tsx`
- Create: `src/admin/ScbaTokensPage.tsx`
- Create: `src/admin/CredentialsPage.test.tsx`
- Create: `src/admin/ScbaTokensPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes:
  - `GET/POST/PUT /api/admin/credentials`
  - `GET/POST/PUT /api/admin/scba-tokens`
- Produces:
  - `export const ACCOUNT_STATUS_OPTIONS = ["Activo", "Pendiente", "Vencido", "Inactivo"] as const`
  - `export function CredentialsPage({ onSaved }: { onSaved: (message: string) => void })`
  - `export function ScbaTokensPage({ onSaved }: { onSaved: (message: string) => void })`

- [ ] **Step 1: Write the failing page tests**

```tsx
it("renders empty-state CTA for credentials", async () => {
  expect(await screen.findByText("No hay credenciales cargadas todavía.")).toBeTruthy();
});

it("creates and lists multiple SCBA tokens", async () => {
  expect(await screen.findByText("Token SCBA principal")).toBeTruthy();
  expect(screen.getByText("Token suplente")).toBeTruthy();
});
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `npm.cmd test -- src/admin/CredentialsPage.test.tsx src/admin/ScbaTokensPage.test.tsx`  
Expected: FAIL because the pages do not exist yet

- [ ] **Step 3: Implement `CredentialsPage` and `ScbaTokensPage`**

Both modules must support list + create/edit flows, use the fixed status enum, render clear empty states, and treat SCBA as multiple token records.

- [ ] **Step 4: Run targeted tests**

Run: `npm.cmd test -- src/admin/CredentialsPage.test.tsx src/admin/ScbaTokensPage.test.tsx`  
Expected: PASS

- [ ] **Step 5: Record changed files and verification**

Record the changed files plus the passing command/output in the task report; no Git commit in this workspace.

### Task 6: Documentation and final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed account/studio suite from Tasks 1-5
- Produces: updated feature documentation for Perfil, Usuarios, Roles, Credenciales, and Token SCBA

- [ ] **Step 1: Update README scope documentation**

Add concise bullets under `## Alcance actual` describing the new account/studio administration capabilities and the admin-only scope of study modules.

- [ ] **Step 2: Run the final verification**

Run: `npm.cmd test -- server/account-admin.test.mjs src/App.account-admin.test.tsx src/account/ProfilePage.test.tsx src/admin/RolesPage.test.tsx src/admin/UsersAdminPage.test.tsx src/admin/CredentialsPage.test.tsx src/admin/ScbaTokensPage.test.tsx && npm.cmd run build`  
Expected: all tests PASS and build completes successfully

- [ ] **Step 3: Record changed files and verification**

Record the changed files plus the passing command/output in the task report; no Git commit in this workspace.
