import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";

const PORT = Number(process.env.API_PORT || 3001);
const DATA_DIR = resolve(process.env.LEGALRUN_DATA_DIR || "./data");
const UPLOAD_DIR = resolve(DATA_DIR, "uploads");
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });
const db = new DatabaseSync(resolve(DATA_DIR, "legalrun.sqlite"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS case_entries (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_case_entries_case_section
    ON case_entries(case_id, section, created_at);
  CREATE TABLE IF NOT EXISTS module_records (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_module_records_module
    ON module_records(module, created_at);
  CREATE TABLE IF NOT EXISTS module_seeds (
    module TEXT PRIMARY KEY,
    seeded_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    case_id TEXT,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_audit_log_created ON audit_log(created_at);
`);

const now = () => new Date().toISOString();
const readJson = (value) => JSON.parse(value);
function dateTimestamp(value) {
  const text = String(value || "").trim();
  const localDate = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (localDate) return new Date(Number(localDate[3]), Number(localDate[2]) - 1, Number(localDate[1])).getTime();
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : null;
}
const caseCount = db.prepare("SELECT COUNT(*) AS count FROM cases").get().count;

if (caseCount === 0) {
  const createdAt = now();
  const initialCase = {
    fields: {
      id: "10482",
      title: "Expediente de ejemplo 1842/2025",
      number: "1842/2025",
      amount: "$ 1.250.000,00",
      type: "Cobro ejecutivo",
      year: "2025",
      claimant: "Empresa de ejemplo S.A.",
      defendant: "Persona de prueba",
      expediente: "1842/25",
      state: "En trámite",
      substate: "Pendiente",
      created: "12/02/2025",
      portfolio: "Cobros",
      jurisdiction: "Capital",
      court: "Juzgado Civil y Comercial de Ejemplo",
      secretary: "Secretaría 2",
      judge: "—",
      process: "Ejecutivo",
      lastUpdate: "18/03/2025",
      lastOrder: "A despacho",
      location: "Mesa de entradas",
      custom1: "—",
      custom2: "—",
    },
  };
  db.prepare("INSERT INTO cases(id, data, created_at, updated_at) VALUES(?, ?, ?, ?)")
    .run("demo-10482", JSON.stringify(initialCase), createdAt, createdAt);

  const seedEntry = db.prepare("INSERT INTO case_entries(id, case_id, section, data, created_at) VALUES(?, ?, ?, ?, ?)");
  [
    ["movements", { date: "18/03/2025", title: "Movimiento registrado", description: "Se provee presentación", user: "Sistema" }],
    ["movements", { date: "12/03/2025", title: "Documento adjuntado", description: "Documento de ejemplo", user: "Equipo demo" }],
    ["documents", { date: "12/03/2025", title: "Demanda inicial", type: "PDF", filename: "demanda-demo.pdf" }],
    ["notes", { date: "18/03/2025", title: "Nota de ejemplo", text: "Registro ficticio para probar la interfaz.", user: "Equipo demo" }],
    ["expenses", { date: "18/03/2025", title: "Tasa de justicia", amount: "$ 15.000,00", state: "Pendiente" }],
  ].forEach(([section, data]) => seedEntry.run(randomUUID(), "demo-10482", section, JSON.stringify(data), createdAt));
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

function cookieValue(req, name) {
  const header = req.headers.cookie || "";
  const part = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function sessionUser(req) {
  const token = cookieValue(req, "legalrun_session");
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return db.prepare(`SELECT users.id, users.email
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(tokenHash, now()) || null;
}

function addAudit(req, caseId, action, detail) {
  const user = sessionUser(req);
  db.prepare("INSERT INTO audit_log(id, user_id, case_id, action, detail, created_at) VALUES(?, ?, ?, ?, ?, ?)")
    .run(randomUUID(), user?.id || null, caseId || null, action, detail, now());
}

function issueSession(res, userId) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES(?, ?, ?)").run(tokenHash, userId, expiresAt);
  const secure = process.env.LEGALRUN_SECURE_COOKIE === "true" ? "; Secure" : "";
  res.setHeader("set-cookie", `legalrun_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800${secure}`);
}

async function getJson(req, maxBytes = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("El cuerpo supera el límite permitido");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("JSON inválido");
  }
}

function allCases(query = "") {
  const rows = db.prepare("SELECT id, data, created_at, updated_at FROM cases ORDER BY updated_at DESC").all();
  const cases = rows.map((row) => ({ id: row.id, ...readJson(row.data), createdAt: row.created_at, updatedAt: row.updated_at }));
  const needle = query.trim().toLowerCase();
  if (!needle) return cases;
  return cases.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { status: "ok", storage: "sqlite", mode: "local-only" });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/register") {
      const body = await getJson(req);
      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");
      if (!/^\S+@\S+\.\S+$/.test(email)) return sendJson(res, 400, { error: "Ingresá un email válido" });
      if (password.length < 12) return sendJson(res, 400, { error: "La contraseña debe tener al menos 12 caracteres" });
      const salt = randomBytes(16).toString("hex");
      const hash = scryptSync(password, salt, 64).toString("hex");
      const id = randomUUID();
      try {
        db.prepare("INSERT INTO users(id, email, salt, password_hash, created_at) VALUES(?, ?, ?, ?, ?)")
          .run(id, email, salt, hash, now());
      } catch (error) {
        if (String(error?.code || "").includes("CONSTRAINT")) return sendJson(res, 409, { error: "Ya existe una cuenta con ese email" });
        throw error;
      }
      issueSession(res, id);
      return sendJson(res, 201, { user: { id, email } });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await getJson(req);
      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");
      const user = db.prepare("SELECT id, email, salt, password_hash FROM users WHERE email = ? COLLATE NOCASE").get(email);
      if (!user) return sendJson(res, 401, { error: "Email o contraseña incorrectos" });
      const actual = scryptSync(password, user.salt, 64);
      const expected = Buffer.from(user.password_hash, "hex");
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return sendJson(res, 401, { error: "Email o contraseña incorrectos" });
      }
      issueSession(res, user.id);
      return sendJson(res, 200, { user: { id: user.id, email: user.email } });
    }

    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      return sendJson(res, 200, { user: sessionUser(req) });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      const token = cookieValue(req, "legalrun_session");
      if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(createHash("sha256").update(token).digest("hex"));
      res.setHeader("set-cookie", "legalrun_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0");
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/password") {
      const user = sessionUser(req);
      if (!user) return sendJson(res, 401, { error: "Iniciá sesión para continuar" });
      const body = await getJson(req);
      const currentPassword = String(body?.currentPassword || "");
      const newPassword = String(body?.newPassword || "");
      const stored = db.prepare("SELECT salt, password_hash FROM users WHERE id = ?").get(user.id);
      if (!stored) return sendJson(res, 401, { error: "Cuenta local no encontrada" });
      const actual = scryptSync(currentPassword, stored.salt, 64);
      const expected = Buffer.from(stored.password_hash, "hex");
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return sendJson(res, 401, { error: "La contraseña actual es incorrecta" });
      if (newPassword.length < 12) return sendJson(res, 400, { error: "La nueva contraseña debe tener al menos 12 caracteres" });
      if (newPassword === currentPassword) return sendJson(res, 400, { error: "La nueva contraseña debe ser distinta de la actual" });
      const salt = randomBytes(16).toString("hex");
      const passwordHash = scryptSync(newPassword, salt, 64).toString("hex");
      db.prepare("UPDATE users SET salt = ?, password_hash = ? WHERE id = ?").run(salt, passwordHash, user.id);
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
      issueSession(res, user.id);
      return sendJson(res, 200, { ok: true });
    }

    if (!sessionUser(req)) return sendJson(res, 401, { error: "Iniciá sesión para continuar" });

    if (req.method === "GET" && url.pathname === "/api/backup") {
      const cases = db.prepare("SELECT id, data, created_at, updated_at FROM cases ORDER BY created_at").all().map((row) => ({ id: row.id, data: readJson(row.data), createdAt: row.created_at, updatedAt: row.updated_at }));
      const entryRows = db.prepare("SELECT id, case_id, section, data, created_at FROM case_entries ORDER BY created_at").all();
      let includedFiles = 0;
      let missingFiles = 0;
      const entries = entryRows.map((row) => {
        const data = readJson(row.data);
        let attachment = null;
        if (data.storageId) {
          const filePath = resolve(UPLOAD_DIR, data.storageId);
          if (!relative(UPLOAD_DIR, filePath).startsWith("..") && existsSync(filePath)) {
            const ext = extname(filePath).toLowerCase();
            const types = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".txt": "text/plain", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
            attachment = { name: data.fileName || "documento", size: data.fileSize || 0, mimeType: types[ext] || "application/octet-stream", base64: readFileSync(filePath).toString("base64") };
            includedFiles++;
          } else missingFiles++;
          delete data.storageId;
        }
        return { id: row.id, caseId: row.case_id, section: row.section, data, createdAt: row.created_at, attachment };
      });
      const modules = db.prepare("SELECT id, module, data, created_at FROM module_records ORDER BY created_at").all().map((row) => ({ id: row.id, module: row.module, data: readJson(row.data), createdAt: row.created_at }));
      const initializedModules = db.prepare("SELECT module, seeded_at FROM module_seeds ORDER BY module").all();
      const audit = db.prepare("SELECT id, action, detail, case_id AS caseId, created_at AS date FROM audit_log ORDER BY created_at").all();
      return sendJson(res, 200, {
        format: "legalrun-local-backup",
        schemaVersion: 1,
        createdAt: now(),
        warning: "No incluye contraseñas ni sesiones. El archivo contiene datos de expedientes y adjuntos; mantenelo protegido.",
        counts: { cases: cases.length, entries: entries.length, modules: modules.length, attachments: includedFiles, missingAttachments: missingFiles, auditEvents: audit.length },
        cases, entries, modules, initializedModules, audit,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/backup/restore") {
      const backup = await getJson(req, 100_000_000);
      if (backup?.format !== "legalrun-local-backup" || backup?.schemaVersion !== 1) return sendJson(res, 400, { error: "El archivo no es una copia compatible de esta réplica" });
      const cases = Array.isArray(backup.cases) ? backup.cases : [];
      const entries = Array.isArray(backup.entries) ? backup.entries : [];
      const modules = Array.isArray(backup.modules) ? backup.modules : [];
      const seeds = Array.isArray(backup.initializedModules) ? backup.initializedModules : [];
      const audit = Array.isArray(backup.audit) ? backup.audit : [];
      if (cases.length > 20_000 || entries.length > 100_000 || modules.length > 100_000 || audit.length > 100_000) return sendJson(res, 413, { error: "La copia supera los límites de registros permitidos" });

      const caseIdMap = new Map();
      const writtenFiles = [];
      let casesAdded = 0, casesSkipped = 0, entriesAdded = 0, entriesSkipped = 0;
      let modulesAdded = 0, modulesSkipped = 0, filesAdded = 0, auditAdded = 0;
      db.exec("BEGIN IMMEDIATE");
      try {
        const currentCases = db.prepare("SELECT id, data FROM cases").all();
        const currentById = new Map(currentCases.map((row) => [row.id, readJson(row.data)]));
        const currentByNumber = new Map(currentCases.map((row) => [String(readJson(row.data).fields?.number || "").trim().toLowerCase(), row.id]).filter(([number]) => number));
        const insertCase = db.prepare("INSERT INTO cases(id, data, created_at, updated_at) VALUES(?, ?, ?, ?)");
        for (const source of cases) {
          const oldId = String(source?.id || "").trim();
          const sourceData = source?.data && typeof source.data === "object" ? source.data : null;
          const number = String(sourceData?.fields?.number || "").trim();
          if (!oldId || !sourceData || !number) { casesSkipped++; continue; }
          const existingId = currentById.has(oldId) ? oldId : currentByNumber.get(number.toLowerCase());
          if (existingId) {
            caseIdMap.set(oldId, existingId); casesSkipped++; continue;
          }
          const id = currentById.has(oldId) ? randomUUID() : oldId;
          const createdAt = String(source.createdAt || now());
          const updatedAt = String(source.updatedAt || createdAt);
          const data = { ...sourceData, fields: { ...sourceData.fields, number } };
          insertCase.run(id, JSON.stringify(data), createdAt, updatedAt);
          currentById.set(id, data); currentByNumber.set(number.toLowerCase(), id); caseIdMap.set(oldId, id); casesAdded++;
        }

        const hasEntry = db.prepare("SELECT id FROM case_entries WHERE id = ?");
        const insertEntry = db.prepare("INSERT INTO case_entries(id, case_id, section, data, created_at) VALUES(?, ?, ?, ?, ?)");
        for (const source of entries) {
          const sourceId = String(source?.id || "").trim();
          const caseId = caseIdMap.get(String(source?.caseId || ""));
          const section = String(source?.section || "").trim();
          if (!sourceId || !caseId || !section || !source?.data || typeof source.data !== "object" || hasEntry.get(sourceId)) { entriesSkipped++; continue; }
          const data = { ...source.data };
          delete data.storageId; delete data.fileBase64;
          const attachment = source.attachment;
          if (attachment) {
            if (!["documents", "filings", "expenses", "fees", "movements"].includes(section)) throw new Error("La copia contiene un adjunto en una sección no compatible");
            const base64 = String(attachment.base64 || "");
            if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error("La copia contiene un adjunto inválido");
            const bytes = Buffer.from(base64, "base64");
            if (bytes.length === 0 || bytes.length > 5_000_000) throw new Error("Un adjunto supera el límite de 5 MB");
            const safeName = basename(String(attachment.name || "documento").replaceAll("\\", "/")).replace(/[\r\n\0]/g, "").slice(0, 180) || "documento";
            const ext = extname(safeName).toLowerCase();
            if (![".pdf", ".png", ".jpg", ".jpeg", ".txt", ".doc", ".docx"].includes(ext)) throw new Error("La copia contiene un formato de adjunto no permitido");
            const storageId = `${randomUUID()}${ext}`;
            writeFileSync(resolve(UPLOAD_DIR, storageId), bytes, { flag: "wx" });
            writtenFiles.push(resolve(UPLOAD_DIR, storageId));
            data.storageId = storageId; data.fileName = safeName; data.fileSize = bytes.length; filesAdded++;
          }
          insertEntry.run(sourceId, caseId, section, JSON.stringify(data), String(source.createdAt || now()));
          entriesAdded++;
        }

        const hasModule = db.prepare("SELECT id FROM module_records WHERE id = ?");
        const insertModule = db.prepare("INSERT INTO module_records(id, module, data, created_at) VALUES(?, ?, ?, ?)");
        for (const source of modules) {
          const id = String(source?.id || "").trim();
          const module = String(source?.module || "").trim();
          if (!id || !module || !source?.data || typeof source.data !== "object" || hasModule.get(id)) { modulesSkipped++; continue; }
          insertModule.run(id, module, JSON.stringify(source.data), String(source.createdAt || now()));
          modulesAdded++;
        }
        const addSeed = db.prepare("INSERT OR IGNORE INTO module_seeds(module, seeded_at) VALUES(?, ?)");
        for (const seed of seeds) if (seed?.module) addSeed.run(String(seed.module), String(seed.seeded_at || now()));

        const hasAudit = db.prepare("SELECT id FROM audit_log WHERE id = ?");
        const insertAudit = db.prepare("INSERT INTO audit_log(id, user_id, case_id, action, detail, created_at) VALUES(?, NULL, ?, ?, ?, ?)");
        for (const source of audit) {
          const id = String(source?.id || "").trim();
          if (!id || hasAudit.get(id)) continue;
          insertAudit.run(id, caseIdMap.get(String(source.caseId || "")) || null, String(source.action || "backup.event"), String(source.detail || "Evento importado desde respaldo"), String(source.date || now()));
          auditAdded++;
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        for (const filePath of writtenFiles) if (existsSync(filePath)) unlinkSync(filePath);
        throw error;
      }
      addAudit(req, null, "backup.restored", `Combinar copia: ${casesAdded} casos, ${entriesAdded} registros, ${modulesAdded} módulos`);
      return sendJson(res, 200, { ok: true, casesAdded, casesSkipped, entriesAdded, entriesSkipped, modulesAdded, modulesSkipped, filesAdded, auditAdded });
    }

    if (req.method === "GET" && url.pathname === "/api/summary") {
      const caseRows = db.prepare("SELECT id, data FROM cases").all();
      const stateCounts = {};
      for (const row of caseRows) {
        const fields = readJson(row.data).fields || {};
        const state = String(fields.state || "Sin estado");
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      }
      const activeCases = caseRows.filter((row) => {
        const state = String(readJson(row.data).fields?.state || "").toLowerCase();
        return state !== "finalizado" && state !== "cerrado";
      }).length;
      const counts = Object.fromEntries(db.prepare("SELECT section, COUNT(*) AS count FROM case_entries GROUP BY section").all().map((row) => [row.section, row.count]));
      const recent = db.prepare("SELECT case_id, data, created_at FROM case_entries WHERE section = 'movements' ORDER BY created_at DESC LIMIT 4").all().map((row) => {
        const data = readJson(row.data);
        const caseRow = caseRows.find((item) => item.id === row.case_id);
        const caseFields = caseRow ? readJson(caseRow.data).fields : {};
        return { date: data.date || row.created_at, title: data.title || data.description || "Movimiento", caseNumber: caseFields.number || "—" };
      });
      const agendaRows = db.prepare("SELECT data, created_at FROM module_records WHERE module = 'client/agenda' ORDER BY created_at DESC").all();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      let overdueAgendaCount = 0;
      const upcomingAgenda = agendaRows.map((row) => {
        const data = readJson(row.data);
        const values = Array.isArray(data.values) ? data.values : [];
        const baseDate = dateTimestamp(values[0]) ?? Date.parse(row.created_at);
        const time = String(values[1] || "").match(/^(\d{1,2}):(\d{2})/);
        const dueAt = new Date(baseDate);
        if (time) dueAt.setHours(Number(time[1]), Number(time[2]), 0, 0);
        const status = String(values[5] || "Pendiente");
        if (["Completada", "Cancelada"].includes(status)) return null;
        if (dueAt.getTime() < today.getTime()) { overdueAgendaCount++; return null; }
        const caseRow = data.caseId ? caseRows.find((item) => item.id === data.caseId) : null;
        const caseFields = caseRow ? readJson(caseRow.data).fields || {} : {};
        return { date: String(values[0] || "—"), time: String(values[1] || ""), title: String(values[2] || "Actividad"), caseId: data.caseId || null, caseNumber: caseFields.number || values[3] || "—", status, dueAt: dueAt.getTime() };
      }).filter(Boolean).sort((a, b) => a.dueAt - b.dueAt).slice(0, 3);
      const agendaCount = agendaRows.length;
      return sendJson(res, 200, { totalCases: caseRows.length, activeCases, stateCounts, movementCount: counts.movements || 0, documentCount: (counts.documents || 0) + (counts.filings || 0), expenseCount: counts.expenses || 0, agendaCount, overdueAgendaCount, upcomingAgenda, recent });
    }

    if (req.method === "GET" && url.pathname === "/api/audit") {
      const rows = db.prepare(`SELECT audit_log.id, audit_log.case_id, audit_log.action, audit_log.detail, audit_log.created_at, users.email
        FROM audit_log LEFT JOIN users ON users.id = audit_log.user_id
        ORDER BY audit_log.created_at DESC LIMIT 1000`).all();
      const items = rows.map((row) => {
        const caseRow = row.case_id ? db.prepare("SELECT data FROM cases WHERE id = ?").get(row.case_id) : null;
        const fields = caseRow ? readJson(caseRow.data).fields || {} : {};
        return { id: row.id, caseId: row.case_id, caseNumber: fields.number || "—", action: row.action, detail: row.detail, user: row.email || "Cuenta local", date: row.created_at };
      });
      const needle = (url.searchParams.get("q") || "").trim().toLowerCase();
      return sendJson(res, 200, { items: needle ? items.filter((item) => JSON.stringify(item).toLowerCase().includes(needle)) : items, truncated: rows.length === 1000 });
    }

    if (req.method === "GET" && url.pathname === "/api/dashboards/activity") {
      const caseRows = db.prepare("SELECT id, data, created_at FROM cases ORDER BY updated_at DESC").all();
      const movementRows = db.prepare("SELECT case_id, data, created_at FROM case_entries WHERE section = 'movements' ORDER BY created_at DESC").all();
      const latest = new Map();
      for (const row of movementRows) {
        const data = readJson(row.data);
        const timestamp = dateTimestamp(data.date) ?? Date.parse(row.created_at) ?? 0;
        const previous = latest.get(row.case_id);
        if (!previous || timestamp > previous.timestamp) latest.set(row.case_id, { data, timestamp, createdAt: row.created_at });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const items = caseRows.map((row) => {
        const fields = readJson(row.data).fields || {};
        const movement = latest.get(row.id);
        const daysWithoutMovement = movement ? Math.max(0, Math.floor((today.getTime() - new Date(movement.timestamp).setHours(0, 0, 0, 0)) / 86_400_000)) : null;
        const priority = daysWithoutMovement === null ? "Sin movimientos" : daysWithoutMovement >= 60 ? "Alta" : daysWithoutMovement >= 30 ? "Media" : "Baja";
        return {
          id: row.id,
          number: String(fields.number || row.id),
          title: String(fields.title || `${fields.claimant || "—"} c/ ${fields.defendant || "—"}`),
          state: String(fields.state || "Sin estado"),
          lastMovement: movement?.data.title || movement?.data.description || "Sin movimientos registrados",
          lastMovementDate: movement ? movement.data.date || movement.createdAt : "—",
          daysWithoutMovement,
          priority,
        };
      });
      return sendJson(res, 200, { items });
    }

    if (req.method === "GET" && url.pathname === "/api/dashboards/movements") {
      const caseRows = db.prepare("SELECT id, data FROM cases").all();
      const casesById = new Map(caseRows.map((row) => [row.id, readJson(row.data).fields || {}]));
      const rows = db.prepare(`SELECT id, case_id, data, created_at FROM case_entries
        WHERE section = 'movements' ORDER BY created_at DESC LIMIT 5000`).all();
      const items = rows.map((row) => {
        const data = readJson(row.data);
        const fields = casesById.get(row.case_id) || {};
        return {
          id: row.id,
          caseId: row.case_id,
          caseNumber: String(fields.number || row.case_id),
          caseTitle: String(fields.title || `${fields.claimant || "—"} c/ ${fields.defendant || "—"}`),
          court: String(fields.court || "—"),
          date: String(data.date || row.created_at),
          title: String(data.title || "Movimiento judicial"),
          description: String(data.description || ""),
          user: String(data.user || "Cuenta local"),
          status: String(data.state || "Nuevo"),
          createdAt: row.created_at,
        };
      });
      items.sort((a, b) => (dateTimestamp(b.date) ?? Date.parse(b.createdAt)) - (dateTimestamp(a.date) ?? Date.parse(a.createdAt)));
      return sendJson(res, 200, { items, total: items.length, truncated: rows.length === 5000 });
    }

    if (req.method === "GET" && url.pathname === "/api/dashboards/documents") {
      const caseRows = db.prepare("SELECT id, data FROM cases").all();
      const casesById = new Map(caseRows.map((row) => [row.id, readJson(row.data).fields || {}]));
      const rows = db.prepare(`SELECT id, case_id, section, data, created_at FROM case_entries
        WHERE section IN ('documents', 'filings') ORDER BY created_at DESC LIMIT 5000`).all();
      const items = rows.map((row) => {
        const data = readJson(row.data);
        const fields = casesById.get(row.case_id) || {};
        return {
          id: row.id,
          caseId: row.case_id,
          section: row.section,
          caseNumber: String(fields.number || row.case_id),
          title: String(data.title || "Documento sin título"),
          type: String(data.type || (row.section === "filings" ? "Presentación" : "Documento")),
          date: String(data.date || row.created_at),
          status: String(data.state || "Pendiente"),
          fileName: String(data.fileName || data.filename || ""),
          hasFile: Boolean(data.storageId),
          user: String(data.user || "Cuenta local"),
          createdAt: row.created_at,
        };
      });
      items.sort((a, b) => (dateTimestamp(b.date) ?? Date.parse(b.createdAt)) - (dateTimestamp(a.date) ?? Date.parse(a.createdAt)));
      return sendJson(res, 200, { items, total: items.length, truncated: rows.length === 5000 });
    }

    if (req.method === "GET" && url.pathname === "/api/dashboards/finance") {
      const caseRows = db.prepare("SELECT id, data FROM cases").all();
      const casesById = new Map(caseRows.map((row) => [row.id, readJson(row.data).fields || {}]));
      const rows = db.prepare(`SELECT id, case_id, section, data, created_at FROM case_entries
        WHERE section IN ('expenses', 'fees') ORDER BY created_at DESC LIMIT 5000`).all();
      const items = rows.map((row) => {
        const data = readJson(row.data);
        const fields = casesById.get(row.case_id) || {};
        return {
          id: row.id,
          caseId: row.case_id,
          caseNumber: String(fields.number || row.case_id),
          caseTitle: String(fields.title || `${fields.claimant || "—"} c/ ${fields.defendant || "—"}`),
          section: row.section,
          date: String(data.date || row.created_at),
          dueDate: String(data.dueDate || ""),
          title: String(data.title || "Registro sin concepto"),
          type: String(data.type || "Sin categoría"),
          amount: String(data.amount || ""),
          status: String(data.state || "Pendiente"),
          fileName: String(data.fileName || ""),
          hasFile: Boolean(data.storageId),
          createdAt: row.created_at,
        };
      });
      items.sort((a, b) => (dateTimestamp(b.date) ?? Date.parse(b.createdAt)) - (dateTimestamp(a.date) ?? Date.parse(a.createdAt)));
      return sendJson(res, 200, { items, total: items.length, truncated: rows.length === 5000 });
    }

    if (req.method === "GET" && url.pathname === "/api/dashboards/stock") {
      const caseRows = db.prepare("SELECT created_at FROM cases").all();
      const requestRows = db.prepare("SELECT data FROM module_records WHERE module = 'client/bajajuicio'").all();
      const monthKey = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      };
      const altas = new Map();
      for (const row of caseRows) {
        const key = monthKey(Date.parse(row.created_at));
        altas.set(key, (altas.get(key) || 0) + 1);
      }
      const solicitudes = new Map();
      const pendientes = new Map();
      for (const row of requestRows) {
        const data = readJson(row.data);
        const values = Array.isArray(data.values) ? data.values : [];
        const timestamp = dateTimestamp(values[2]);
        if (timestamp === null) continue;
        const key = monthKey(timestamp);
        solicitudes.set(key, (solicitudes.get(key) || 0) + 1);
        if (String(values[3] || "Pendiente") === "Pendiente") pendientes.set(key, (pendientes.get(key) || 0) + 1);
      }
      const currentMonth = new Date();
      const months = [];
      for (let offset = 5; offset >= 0; offset--) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - offset, 1);
        const key = monthKey(date.getTime());
        months.push({
          month: key,
          label: date.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
          altas: altas.get(key) || 0,
          solicitudes: solicitudes.get(key) || 0,
          pendientes: pendientes.get(key) || 0,
        });
      }
      return sendJson(res, 200, { totalCases: caseRows.length, totalRequests: requestRows.length, pendingRequests: requestRows.filter((row) => String((readJson(row.data).values || [])[3] || "Pendiente") === "Pendiente").length, months });
    }

    if (req.method === "POST" && url.pathname === "/api/cases/import") {
      const body = await getJson(req, 5_000_000);
      const records = Array.isArray(body.records) ? body.records : [];
      if (records.length === 0 || records.length > 2000) return sendJson(res, 400, { error: "El archivo debe contener entre 1 y 2000 filas" });
      const seen = new Set(db.prepare("SELECT data FROM cases").all().map((row) => String(readJson(row.data).fields?.number || "").trim().toLowerCase()).filter(Boolean));
      const insert = db.prepare("INSERT INTO cases(id, data, created_at, updated_at) VALUES(?, ?, ?, ?)");
      const imported = [];
      let duplicates = 0;
      let invalid = 0;
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const item of records) {
          const fields = item?.fields && typeof item.fields === "object" ? item.fields : {};
          const number = String(fields.number || "").trim();
          if (!number) { invalid++; continue; }
          const key = number.toLowerCase();
          if (seen.has(key)) { duplicates++; continue; }
          seen.add(key);
          const id = randomUUID();
          const createdAt = now();
          const data = { fields: { ...fields, number, state: String(fields.state || "En trámite") } };
          insert.run(id, JSON.stringify(data), createdAt, createdAt);
          imported.push({ id, ...data, createdAt, updatedAt: createdAt });
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      if (imported.length) addAudit(req, null, "cases.import", `Importados ${imported.length} casos`);
      return sendJson(res, 201, { imported: imported.length, duplicates, invalid, cases: imported });
    }

    if (req.method === "POST" && url.pathname === "/api/cases/bulk-update") {
      const body = await getJson(req, 5_000_000);
      const records = Array.isArray(body.records) ? body.records : [];
      if (records.length === 0 || records.length > 2000) return sendJson(res, 400, { error: "El archivo debe contener entre 1 y 2000 filas" });
      const existing = db.prepare("SELECT id, data, created_at, updated_at FROM cases").all().map((row) => ({ ...row, data: readJson(row.data) }));
      const update = db.prepare("UPDATE cases SET data = ?, updated_at = ? WHERE id = ?");
      let updated = 0;
      let missing = 0;
      let ambiguous = 0;
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const item of records) {
          const fields = item?.fields && typeof item.fields === "object" ? item.fields : {};
          const id = String(fields.id || "").trim();
          const number = String(fields.number || "").trim().toLowerCase();
          const matches = id
            ? existing.filter((row) => row.id === id || String(row.data.fields?.id || "") === id)
            : existing.filter((row) => number && String(row.data.fields?.number || "").trim().toLowerCase() === number);
          if (matches.length === 0) { missing++; continue; }
          if (matches.length > 1) { ambiguous++; continue; }
          const row = matches[0];
          row.data = { ...row.data, fields: { ...row.data.fields, ...fields } };
          row.updated_at = now();
          update.run(JSON.stringify(row.data), row.updated_at, row.id);
          updated++;
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      if (updated) addAudit(req, null, "cases.bulk_update", `Actualizados ${updated} casos`);
      return sendJson(res, 200, { updated, missing, ambiguous });
    }

    if (parts[0] === "api" && parts[1] === "cases" && parts.length === 2) {
      if (req.method === "GET") return sendJson(res, 200, { cases: allCases(url.searchParams.get("q") || "") });
      if (req.method === "POST") {
        const body = await getJson(req);
        const fields = body?.fields && typeof body.fields === "object" ? body.fields : {};
        const number = String(fields.number || body.number || "").trim();
        if (!number) return sendJson(res, 400, { error: "El número de expediente es obligatorio" });
        const duplicate = db.prepare("SELECT id, data FROM cases").all().find((row) => String(readJson(row.data).fields?.number || "").trim().toLowerCase() === number.toLowerCase());
        if (duplicate) return sendJson(res, 409, { error: "Ya existe un expediente con ese número", caseId: duplicate.id });
        const id = randomUUID();
        const createdAt = now();
        const data = { ...body, fields: { ...fields, number } };
        db.prepare("INSERT INTO cases(id, data, created_at, updated_at) VALUES(?, ?, ?, ?)")
          .run(id, JSON.stringify(data), createdAt, createdAt);
        addAudit(req, id, "case.created", "Se creó el expediente");
        return sendJson(res, 201, { id, ...data, createdAt, updatedAt: createdAt });
      }
    }

    if (parts[0] === "api" && parts[1] === "modules" && parts[2]) {
      const module = parts[2];
      if (req.method === "GET" && parts.length === 3) {
        const rows = db.prepare("SELECT id, data, created_at FROM module_records WHERE module = ? ORDER BY created_at DESC").all(module);
        const initialized = Boolean(db.prepare("SELECT module FROM module_seeds WHERE module = ?").get(module));
        return sendJson(res, 200, { initialized, records: rows.map((row) => ({ id: row.id, ...readJson(row.data), createdAt: row.created_at })) });
      }
      if (req.method === "POST" && parts.length === 4 && parts[3] === "initialize") {
        const body = await getJson(req);
        const mark = db.prepare("INSERT OR IGNORE INTO module_seeds(module, seeded_at) VALUES(?, ?)").run(module, now());
        if (mark.changes) {
          const insert = db.prepare("INSERT INTO module_records(id, module, data, created_at) VALUES(?, ?, ?, ?)");
          for (const record of Array.isArray(body.rows) ? body.rows : []) {
            insert.run(randomUUID(), module, JSON.stringify(record), now());
          }
        }
        const rows = db.prepare("SELECT id, data, created_at FROM module_records WHERE module = ? ORDER BY created_at DESC").all(module);
        return sendJson(res, 200, { initialized: true, records: rows.map((row) => ({ id: row.id, ...readJson(row.data), createdAt: row.created_at })) });
      }
      if (req.method === "POST" && parts.length === 3) {
        const body = await getJson(req, module === "admin/mis_reportes" ? 10_000_000 : 1_000_000);
        const id = randomUUID();
        const createdAt = now();
        db.prepare("INSERT INTO module_records(id, module, data, created_at) VALUES(?, ?, ?, ?)")
          .run(id, module, JSON.stringify(body), createdAt);
        addAudit(req, body.caseId || null, "module.created", `Se agregó un registro en ${module}`);
        return sendJson(res, 201, { id, ...body, createdAt });
      }
      if ((req.method === "PUT" || req.method === "PATCH") && parts.length === 4) {
        const current = db.prepare("SELECT data, created_at FROM module_records WHERE module = ? AND id = ?").get(module, parts[3]);
        if (!current) return sendJson(res, 404, { error: "Registro no encontrado" });
        const body = await getJson(req);
        const data = { ...readJson(current.data), ...body };
        db.prepare("UPDATE module_records SET data = ? WHERE module = ? AND id = ?")
          .run(JSON.stringify(data), module, parts[3]);
        addAudit(req, data.caseId || null, "module.updated", `Se actualizó un registro en ${module}`);
        return sendJson(res, 200, { id: parts[3], ...data, createdAt: current.created_at });
      }
      if (req.method === "DELETE" && parts[3]) {
        const current = db.prepare("SELECT data FROM module_records WHERE module = ? AND id = ?").get(module, parts[3]);
        const result = db.prepare("DELETE FROM module_records WHERE module = ? AND id = ?").run(module, parts[3]);
        if (result.changes) addAudit(req, current ? readJson(current.data).caseId || null : null, "module.deleted", `Se eliminó un registro en ${module}`);
        return sendJson(res, result.changes ? 200 : 404, result.changes ? { ok: true } : { error: "Registro no encontrado" });
      }
    }

    if (parts[0] === "api" && parts[1] === "cases" && parts[2]) {
      const caseId = parts[2];
      const existing = db.prepare("SELECT id, data, created_at, updated_at FROM cases WHERE id = ?").get(caseId);
      if (!existing) return sendJson(res, 404, { error: "Expediente no encontrado" });
      const caseData = readJson(existing.data);

      if (parts.length === 3 && req.method === "GET") {
        return sendJson(res, 200, { id: existing.id, ...caseData, createdAt: existing.created_at, updatedAt: existing.updated_at });
      }
      if (parts.length === 3 && (req.method === "PUT" || req.method === "PATCH")) {
        const body = await getJson(req);
        const updated = { ...caseData, ...body, fields: { ...caseData.fields, ...body.fields } };
        const updatedAt = now();
        db.prepare("UPDATE cases SET data = ?, updated_at = ? WHERE id = ?")
          .run(JSON.stringify(updated), updatedAt, caseId);
        const changedFields = Object.keys(body.fields || body).filter((key) => key !== "followed");
        addAudit(req, caseId, "case.updated", `Campos actualizados: ${changedFields.join(", ") || "seguimiento"}`);
        return sendJson(res, 200, { id: caseId, ...updated, createdAt: existing.created_at, updatedAt });
      }

      if (parts[3] === "entries" && parts[4]) {
        const section = parts[4];
        if (req.method === "GET" && parts.length === 5) {
          const entries = db.prepare("SELECT id, data, created_at FROM case_entries WHERE case_id = ? AND section = ? ORDER BY created_at DESC").all(caseId, section);
          return sendJson(res, 200, { entries: entries.map((entry) => ({ id: entry.id, ...readJson(entry.data), createdAt: entry.created_at })) });
        }
        if (req.method === "GET" && parts[5] && parts[6] === "file") {
          const row = db.prepare("SELECT data FROM case_entries WHERE id = ? AND case_id = ? AND section = ?").get(parts[5], caseId, section);
          if (!row) return sendJson(res, 404, { error: "Archivo no encontrado" });
          const entry = readJson(row.data);
          if (!entry.storageId) return sendJson(res, 404, { error: "Este registro no tiene un archivo adjunto" });
          const filePath = resolve(UPLOAD_DIR, entry.storageId);
          if (relative(UPLOAD_DIR, filePath).startsWith("..") || !existsSync(filePath)) return sendJson(res, 404, { error: "Archivo no encontrado" });
          const ext = extname(filePath).toLowerCase();
          const types = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".txt": "text/plain", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
          const file = readFileSync(filePath);
          res.writeHead(200, { "content-type": types[ext] || "application/octet-stream", "content-length": file.length, "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(entry.fileName || "documento")}`, "x-content-type-options": "nosniff", "cache-control": "no-store" });
          return res.end(file);
        }
        if ((req.method === "PUT" || req.method === "PATCH") && parts.length === 6) {
          const row = db.prepare("SELECT data, created_at FROM case_entries WHERE id = ? AND case_id = ? AND section = ?").get(parts[5], caseId, section);
          if (!row) return sendJson(res, 404, { error: "Registro no encontrado" });
          const body = await getJson(req, 8_000_000);
          const current = readJson(row.data);
          const updateFields = { ...body };
          delete updateFields.storageId;
          delete updateFields.fileBase64;
          const entry = { ...current, ...updateFields };
          let replacementStorageId = null;
          if (body.fileBase64) {
            if (!["documents", "filings", "expenses", "fees", "movements"].includes(section)) return sendJson(res, 400, { error: "Esta sección no admite adjuntos" });
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(body.fileBase64)) return sendJson(res, 400, { error: "Archivo inválido" });
            const bytes = Buffer.from(body.fileBase64, "base64");
            if (bytes.length === 0 || bytes.length > 5_000_000) return sendJson(res, 413, { error: "El archivo debe pesar entre 1 byte y 5 MB" });
            const safeName = basename(String(body.fileName || "documento").replaceAll("\\", "/")).replace(/[\r\n\0]/g, "").slice(0, 180) || "documento";
            const ext = extname(safeName).toLowerCase();
            if (![".pdf", ".png", ".jpg", ".jpeg", ".txt", ".doc", ".docx"].includes(ext)) return sendJson(res, 400, { error: "Formato no permitido (PDF, imagen, TXT o Word)" });
            replacementStorageId = `${randomUUID()}${ext}`;
            writeFileSync(resolve(UPLOAD_DIR, replacementStorageId), bytes, { flag: "wx" });
            entry.fileName = safeName;
            entry.fileSize = bytes.length;
            entry.storageId = replacementStorageId;
          } else if (current.storageId) {
            entry.storageId = current.storageId;
            entry.fileName = current.fileName;
            entry.fileSize = current.fileSize;
          }
          entry.updatedAt = now();
          db.prepare("UPDATE case_entries SET data = ? WHERE id = ? AND case_id = ? AND section = ?")
            .run(JSON.stringify(entry), parts[5], caseId, section);
          addAudit(req, caseId, "entry.updated", `Se actualizó un registro de ${section}`);
          if (replacementStorageId && current.storageId) {
            const previousPath = resolve(UPLOAD_DIR, current.storageId);
            if (!relative(UPLOAD_DIR, previousPath).startsWith("..") && existsSync(previousPath)) unlinkSync(previousPath);
          }
          return sendJson(res, 200, { id: parts[5], ...entry, createdAt: row.created_at });
        }
        if (req.method === "POST" && parts.length === 5) {
          const body = await getJson(req, 8_000_000);
          const entry = { ...body };
          delete entry.storageId;
          delete entry.fileBase64;
          if (body.fileBase64) {
            if (!["documents", "filings", "expenses", "fees", "movements"].includes(section)) return sendJson(res, 400, { error: "Esta sección no admite adjuntos" });
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(body.fileBase64)) return sendJson(res, 400, { error: "Archivo inválido" });
            const bytes = Buffer.from(body.fileBase64, "base64");
            if (bytes.length === 0 || bytes.length > 5_000_000) return sendJson(res, 413, { error: "El archivo debe pesar entre 1 byte y 5 MB" });
            const safeName = basename(String(body.fileName || "documento").replaceAll("\\", "/")).replace(/[\r\n\0]/g, "").slice(0, 180) || "documento";
            const ext = extname(safeName).toLowerCase();
            if (![".pdf", ".png", ".jpg", ".jpeg", ".txt", ".doc", ".docx"].includes(ext)) return sendJson(res, 400, { error: "Formato no permitido (PDF, imagen, TXT o Word)" });
            const storageId = `${randomUUID()}${ext}`;
            writeFileSync(resolve(UPLOAD_DIR, storageId), bytes, { flag: "wx" });
            delete entry.fileBase64;
            entry.fileName = safeName;
            entry.fileSize = bytes.length;
            entry.storageId = storageId;
          }
          const id = randomUUID();
          const createdAt = now();
          db.prepare("INSERT INTO case_entries(id, case_id, section, data, created_at) VALUES(?, ?, ?, ?, ?)")
            .run(id, caseId, section, JSON.stringify(entry), createdAt);
          addAudit(req, caseId, "entry.created", `Se agregó un registro de ${section}`);
          return sendJson(res, 201, { id, ...entry, createdAt });
        }
        if (req.method === "DELETE" && parts[5]) {
          const row = db.prepare("SELECT data FROM case_entries WHERE id = ? AND case_id = ? AND section = ?").get(parts[5], caseId, section);
          if (row) {
            const entry = readJson(row.data);
            if (entry.storageId) {
              const filePath = resolve(UPLOAD_DIR, entry.storageId);
              if (!relative(UPLOAD_DIR, filePath).startsWith("..") && existsSync(filePath)) unlinkSync(filePath);
            }
          }
          const result = db.prepare("DELETE FROM case_entries WHERE id = ? AND case_id = ? AND section = ?").run(parts[5], caseId, section);
          if (result.changes) addAudit(req, caseId, "entry.deleted", `Se eliminó un registro de ${section}`);
          return sendJson(res, result.changes ? 200 : 404, result.changes ? { ok: true } : { error: "Registro no encontrado" });
        }
      }
    }

    return sendJson(res, 404, { error: "Ruta no encontrada" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[api] LegalRun clone local en http://127.0.0.1:${PORT}`);
  console.log(`[api] SQLite local: ${resolve(DATA_DIR, "legalrun.sqlite")}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
