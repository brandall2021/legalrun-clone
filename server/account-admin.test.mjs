/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer as createNetServer } from "node:net";
import { randomUUID } from "node:crypto";

const ROOT = resolve(__dirname, "..");

async function getFreePort() {
  return await new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else resolvePort(port);
      });
    });
  });
}

async function delay(ms) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function waitForServer(baseUrl, child) {
  const startedAt = Date.now();
  let lastError = "server did not start";
  while (Date.now() - startedAt < 10_000) {
    if (child.exitCode != null) throw new Error(`server exited early with code ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      if (response.ok) return;
      lastError = `health returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(50);
  }
  throw new Error(`server did not start: ${lastError}`);
}

function ensureAdminBootstrap(dataDir, email, overrides = {}) {
  const roleId = randomUUID();
  const script = `
    import { DatabaseSync } from "node:sqlite";
    import { join } from "node:path";

    const db = new DatabaseSync(join(process.env.DATA_DIR, "legalrun.sqlite"));
    const ensureUserColumn = (name, definition) => {
      const columns = new Set(db.prepare("PRAGMA table_info(users)").all().map((column) => column.name));
      if (!columns.has(name)) db.exec(\`ALTER TABLE users ADD COLUMN \${name} \${definition}\`);
    };
    ensureUserColumn("first_name", "TEXT NOT NULL DEFAULT ''");
    ensureUserColumn("last_name", "TEXT NOT NULL DEFAULT ''");
    ensureUserColumn("role_id", "TEXT");
    ensureUserColumn("job_title", "TEXT NOT NULL DEFAULT ''");
    ensureUserColumn("is_active", "INTEGER NOT NULL DEFAULT 1");
    ensureUserColumn("is_responsible", "INTEGER NOT NULL DEFAULT 0");
    ensureUserColumn("updated_at", "TEXT NOT NULL DEFAULT ''");
    db.exec(\`
      CREATE TABLE IF NOT EXISTS studio_roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        description TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    \`);
    const createdAt = new Date().toISOString();
    const existingRole = db.prepare("SELECT id FROM studio_roles WHERE name = ? COLLATE NOCASE").get("Administrador");
    const roleId = existingRole?.id || process.env.ROLE_ID;
    if (!existingRole) {
      db.prepare("INSERT INTO studio_roles(id, name, description, is_active, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)")
        .run(roleId, "Administrador", "Rol administrador local", 1, createdAt, createdAt);
    }
    db.prepare(\`
      UPDATE users
      SET first_name = ?, last_name = ?, role_id = ?, job_title = ?, is_active = 1, is_responsible = 1, updated_at = ?
      WHERE email = ? COLLATE NOCASE
    \`).run(
      process.env.FIRST_NAME,
      process.env.LAST_NAME,
      roleId,
      process.env.JOB_TITLE,
      createdAt,
      process.env.EMAIL,
    );
    db.close();
  `;
  execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      EMAIL: email,
      FIRST_NAME: overrides.firstName || "Ada",
      LAST_NAME: overrides.lastName || "Admin",
      JOB_TITLE: overrides.jobTitle || "Administradora",
      ROLE_ID: roleId,
    },
    cwd: ROOT,
    stdio: "pipe",
  });
  return { roleId };
}

async function requestJson(baseUrl, path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return {
    status: response.status,
    body,
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
  };
}

async function registerAndGetCookie(baseUrl, email, password = "Segura123456") {
  const result = await requestJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: { email, password },
  });
  expect(result.status).toBe(201);
  expect(result.cookie).toBeTruthy();
  return result.cookie;
}

describe("account and admin backend", () => {
  let dataDir;
  let baseUrl;
  let child;

  beforeEach(async () => {
    dataDir = mkdtempSync(join(tmpdir(), "legalrun-account-admin-"));
    const port = await getFreePort();
    baseUrl = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ["server/index.mjs"], {
      cwd: ROOT,
      env: {
        ...process.env,
        API_PORT: String(port),
        LEGALRUN_DATA_DIR: dataDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForServer(baseUrl, child);
  });

  afterEach(async () => {
    if (child && child.exitCode == null) {
      child.kill();
      await Promise.race([
        new Promise((resolveExit) => child.once("exit", resolveExit)),
        delay(2_000),
      ]);
      if (child.exitCode == null) child.kill("SIGKILL");
    }
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  });

  it("returns enriched session user data from /api/auth/me", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "admin@estudio.local");
    ensureAdminBootstrap(dataDir, "admin@estudio.local");

    const result = await requestJson(baseUrl, "/api/auth/me", { cookie });

    expect(result.status).toBe(200);
    expect(result.body.user).toMatchObject({
      email: "admin@estudio.local",
      firstName: "Ada",
      lastName: "Admin",
      roleName: "Administrador",
      isAdmin: true,
    });
    expect(result.body.user.id).toBeTruthy();
  });

  it("makes the first registered user an administrator bootstrap account", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "primero@estudio.local");

    const session = await requestJson(baseUrl, "/api/auth/me", { cookie });
    expect(session.status).toBe(200);
    expect(session.body.user).toMatchObject({
      email: "primero@estudio.local",
      roleName: "Administrador",
      isAdmin: true,
    });

    const profile = await requestJson(baseUrl, "/api/account/profile", { cookie });
    expect(profile.status).toBe(200);
    expect(profile.body.profile).toMatchObject({
      email: "primero@estudio.local",
      roleName: "Administrador",
      isAdmin: true,
      isResponsible: true,
    });
  });

  it("gets and updates the local account profile", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "perfil@estudio.local");

    const initial = await requestJson(baseUrl, "/api/account/profile", { cookie });
    expect(initial.status).toBe(200);
    expect(initial.body.profile).toMatchObject({
      phoneMobile: "",
      phoneWork: "",
      jobTitle: "",
      isResponsible: true,
    });

    const updated = await requestJson(baseUrl, "/api/account/profile", {
      method: "PUT",
      cookie,
      body: {
        firstName: "Ana",
        lastName: "Perfil",
        phoneMobile: "+54 9 341 555 0101",
        phoneWork: "0341 555 0202",
        jobTitle: "Abogada",
      },
    });

    expect(updated.status).toBe(200);
    expect(updated.body.profile).toMatchObject({
      email: "perfil@estudio.local",
      firstName: "Ana",
      lastName: "Perfil",
      phoneMobile: "+54 9 341 555 0101",
      phoneWork: "0341 555 0202",
      jobTitle: "Abogada",
      isResponsible: true,
    });
  });

  it("ignores forged isResponsible updates on the self-service profile endpoint", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "perfil-seguro@estudio.local");

    const updated = await requestJson(baseUrl, "/api/account/profile", {
      method: "PUT",
      cookie,
      body: {
        firstName: "Ana",
        isResponsible: false,
      },
    });

    expect(updated.status).toBe(200);
    expect(updated.body.profile).toMatchObject({
      email: "perfil-seguro@estudio.local",
      firstName: "Ana",
      isResponsible: true,
    });

    const persisted = await requestJson(baseUrl, "/api/account/profile", { cookie });
    expect(persisted.status).toBe(200);
    expect(persisted.body.profile.isResponsible).toBe(true);
  });

  it("rejects non-admin access to /api/admin/users", async () => {
    await registerAndGetCookie(baseUrl, "admin-bootstrap@estudio.local");
    const cookie = await registerAndGetCookie(baseUrl, "operador@estudio.local");

    const result = await requestJson(baseUrl, "/api/admin/users", { cookie });

    expect(result.status).toBe(403);
  });

  it("creates and updates studio roles through admin endpoints", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "admin-roles@estudio.local");
    ensureAdminBootstrap(dataDir, "admin-roles@estudio.local");

    const created = await requestJson(baseUrl, "/api/admin/roles", {
      method: "POST",
      cookie,
      body: {
        name: "Operador",
        description: "Operación diaria",
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.role).toMatchObject({ name: "Operador", isActive: true });

    const listed = await requestJson(baseUrl, "/api/admin/roles", { cookie });
    expect(listed.status).toBe(200);
    expect(listed.body.roles.some((role) => role.name === "Operador")).toBe(true);

    const updated = await requestJson(baseUrl, `/api/admin/roles/${created.body.role.id}`, {
      method: "PUT",
      cookie,
      body: {
        description: "Operación local",
        isActive: false,
      },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.role).toMatchObject({
      id: created.body.role.id,
      name: "Operador",
      description: "Operación local",
      isActive: false,
    });
  });

  it("prevents renaming the seeded admin role so admin access is preserved", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "admin-guard@estudio.local");

    const roles = await requestJson(baseUrl, "/api/admin/roles", { cookie });
    expect(roles.status).toBe(200);
    const adminRole = roles.body.roles.find((role) => role.name === "Administrador");
    expect(adminRole).toBeTruthy();

    const renamed = await requestJson(baseUrl, `/api/admin/roles/${adminRole.id}`, {
      method: "PUT",
      cookie,
      body: {
        name: "Backoffice",
      },
    });

    expect(renamed.status).toBe(400);

    const session = await requestJson(baseUrl, "/api/auth/me", { cookie });
    expect(session.status).toBe(200);
    expect(session.body.user).toMatchObject({
      email: "admin-guard@estudio.local",
      roleName: "Administrador",
      isAdmin: true,
    });

    const adminUsers = await requestJson(baseUrl, "/api/admin/users", { cookie });
    expect(adminUsers.status).toBe(200);
  });

  it("creates admin-managed users with a temporary password", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "admin-users@estudio.local");
    ensureAdminBootstrap(dataDir, "admin-users@estudio.local");

    const role = await requestJson(baseUrl, "/api/admin/roles", {
      method: "POST",
      cookie,
      body: {
        name: "Operador",
        description: "Operación diaria",
      },
    });
    expect(role.status).toBe(201);

    const created = await requestJson(baseUrl, "/api/admin/users", {
      method: "POST",
      cookie,
      body: {
        email: "nuevo@estudio.local",
        firstName: "Nuevo",
        lastName: "Usuario",
        roleId: role.body.role.id,
        temporaryPassword: "Temporal123456",
      },
    });

    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({
      email: "nuevo@estudio.local",
      firstName: "Nuevo",
      lastName: "Usuario",
      roleName: "Operador",
      isAdmin: false,
    });

    const login = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: {
        email: "nuevo@estudio.local",
        password: "Temporal123456",
      },
    });
    expect(login.status).toBe(200);

    const listed = await requestJson(baseUrl, "/api/admin/users", { cookie });
    expect(listed.status).toBe(200);
    expect(listed.body.users.some((user) => user.email === "nuevo@estudio.local")).toBe(true);
  });

  it("creates and updates studio credentials through admin endpoints", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "admin-cred@estudio.local");
    ensureAdminBootstrap(dataDir, "admin-cred@estudio.local");

    const created = await requestJson(baseUrl, "/api/admin/credentials", {
      method: "POST",
      cookie,
      body: {
        name: "AFIP principal",
        credentialType: "AFIP",
        ownerName: "Estudio Demo",
        status: "Pendiente",
        expiresOn: "2027-12-31",
        notes: "Alta inicial",
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.credential).toMatchObject({
      name: "AFIP principal",
      status: "Pendiente",
    });

    const listed = await requestJson(baseUrl, "/api/admin/credentials", { cookie });
    expect(listed.status).toBe(200);
    expect(listed.body.credentials).toHaveLength(1);

    const updated = await requestJson(baseUrl, `/api/admin/credentials/${created.body.credential.id}`, {
      method: "PUT",
      cookie,
      body: {
        status: "Activo",
        notes: "Validada",
      },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.credential).toMatchObject({
      id: created.body.credential.id,
      status: "Activo",
      notes: "Validada",
    });
  });

  it("creates and updates multiple scba tokens through admin endpoints", async () => {
    const cookie = await registerAndGetCookie(baseUrl, "admin-scba@estudio.local");
    ensureAdminBootstrap(dataDir, "admin-scba@estudio.local");

    const first = await requestJson(baseUrl, "/api/admin/scba-tokens", {
      method: "POST",
      cookie,
      body: {
        alias: "Token SCBA principal",
        holderName: "Estudio Demo",
        status: "Activo",
        expiresOn: "2027-10-10",
        notes: "Operativo",
      },
    });
    expect(first.status).toBe(201);

    const second = await requestJson(baseUrl, "/api/admin/scba-tokens", {
      method: "POST",
      cookie,
      body: {
        alias: "Token SCBA respaldo",
        holderName: "Estudio Demo",
        status: "Pendiente",
        expiresOn: "2027-11-11",
        notes: "Pendiente de activación",
      },
    });
    expect(second.status).toBe(201);

    const listed = await requestJson(baseUrl, "/api/admin/scba-tokens", { cookie });
    expect(listed.status).toBe(200);
    expect(listed.body.scbaTokens).toHaveLength(2);

    const updated = await requestJson(baseUrl, `/api/admin/scba-tokens/${second.body.scbaToken.id}`, {
      method: "PUT",
      cookie,
      body: {
        status: "Vencido",
        lastCheckedAt: "2026-11-18T12:00:00.000Z",
      },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.scbaToken).toMatchObject({
      id: second.body.scbaToken.id,
      status: "Vencido",
      lastCheckedAt: "2026-11-18T12:00:00.000Z",
    });
  });
});
