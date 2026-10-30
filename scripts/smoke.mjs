import { randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";

const base = process.env.LEGALRUN_API_URL || "http://127.0.0.1:3001";
const email = `smoke-${randomUUID()}@example.test`;
const password = randomBytes(18).toString("base64url");
let caseId = null;
let importedCaseId = null;
let documentEntryId = null;
let moduleKey = null;
let moduleRecordId = null;
let savedReportId = null;
let agendaRecordId = null;
let inboxRecordId = null;
let intakeRecordId = null;
let restoredCaseId = null;
let restoredEntryId = null;
let restoredModuleKey = null;
let restoredModuleRecordId = null;
let cookie = "";

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) },
  });
  return { response, data: await response.json() };
}

try {
  const health = await request("/api/health");
  if (!health.response.ok) throw new Error("health check failed");

  const registered = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (registered.response.status !== 201) throw new Error("registration failed");
  cookie = registered.response.headers.get("set-cookie")?.split(";")[0] || "";
  if (!cookie) throw new Error("session cookie missing");

  const list = await request("/api/cases");
  if (!list.response.ok || !Array.isArray(list.data.cases)) throw new Error("case list failed");

  const create = await request("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { number: `SMOKE-${randomUUID()}`, claimant: "Prueba local", responsible: "Equipo smoke" } }),
  });
  if (create.response.status !== 201) throw new Error("case creation failed");
  caseId = create.data.id;
  if (create.data.fields.responsible !== "Equipo smoke") throw new Error("case responsibility field persistence failed");
  const duplicateCase = await request("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { number: create.data.fields.number, title: "Intento duplicado" } }),
  });
  if (duplicateCase.response.status !== 409) throw new Error("duplicate case numbers should be rejected");

  const importNumber = `IMPORT-${randomUUID()}`;
  const imported = await request("/api/cases/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields: { number: importNumber } }] }),
  });
  if (imported.response.status !== 201 || imported.data.imported !== 1 || imported.data.cases[0].fields.state !== "En trámite") throw new Error("case import failed");
  importedCaseId = imported.data.cases[0].id;

  const bulk = await request("/api/cases/bulk-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields: { number: importNumber, state: "Finalizado", custom1: "Valor personalizado" } }] }),
  });
  if (!bulk.response.ok || bulk.data.updated !== 1) throw new Error("bulk case update failed");
  const bulkResult = await request(`/api/cases/${importedCaseId}`);
  if (!bulkResult.response.ok || bulkResult.data.fields.state !== "Finalizado" || bulkResult.data.fields.custom1 !== "Valor personalizado") throw new Error("bulk update persistence failed");

  const update = await request(`/api/cases/${caseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { state: "En trámite" } }),
  });
  if (!update.response.ok) throw new Error("case update failed");
  const audit = await request("/api/audit");
  if (!audit.response.ok || !audit.data.items.some((item) => item.caseId === caseId && item.action === "case.updated")) throw new Error("case audit history failed");
  const followedCase = await request(`/api/cases/${caseId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followed: true }) });
  if (!followedCase.response.ok || followedCase.data.followed !== true) throw new Error("case follow toggle failed");
  const followedList = await request("/api/cases");
  if (!followedList.response.ok || !followedList.data.cases.some((item) => item.id === caseId && item.followed)) throw new Error("follow state should appear in case list");
  const unfollowedCase = await request(`/api/cases/${caseId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followed: false }) });
  if (!unfollowedCase.response.ok || unfollowedCase.data.followed !== false) throw new Error("case follow removal failed");

  const entry = await request(`/api/cases/${caseId}/entries/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Nota de smoke test", text: "Temporal" }),
  });
  if (entry.response.status !== 201) throw new Error("entry creation failed");

  const entries = await request(`/api/cases/${caseId}/entries/notes`);
  if (!entries.response.ok || entries.data.entries.length !== 1) throw new Error("entry list failed");

  const contact = await request(`/api/cases/${caseId}/entries/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Contacto de prueba", role: "Cliente", email: "contacto@example.test", phone: "+54 11 0000-0000" }),
  });
  if (contact.response.status !== 201 || contact.data.role !== "Cliente" || contact.data.email !== "contacto@example.test") throw new Error("structured contact creation failed");

  const extrajudicial = await request(`/api/cases/${caseId}/entries/extrajudicial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Seguimiento de prueba", state: "En negociación", nextDate: "2026-11-15", amount: "125000" }),
  });
  if (extrajudicial.response.status !== 201 || extrajudicial.data.nextDate !== "2026-11-15") throw new Error("extrajudicial tracking creation failed");

  const expense = await request(`/api/cases/${caseId}/entries/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Gasto de prueba", type: "Tasa de justicia", amount: "12500", state: "Pagado", dueDate: "2026-11-30" }),
  });
  if (expense.response.status !== 201 || expense.data.type !== "Tasa de justicia" || expense.data.state !== "Pagado") throw new Error("structured expense creation failed");
  const financeDashboard = await request("/api/dashboards/finance");
  const financeItem = financeDashboard.data.items?.find((item) => item.id === expense.data.id);
  if (!financeDashboard.response.ok || !financeItem || financeItem.amount !== "12500" || financeItem.section !== "expenses") throw new Error("finance dashboard aggregation failed");

  const agreement = await request(`/api/cases/${caseId}/entries/agreements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Acuerdo smoke", parties: "Parte A / Parte B", type: "Plan de cuotas", amount: "60000", installments: "6", dueDate: "2026-12-01", state: "Vigente", description: "Términos temporales" }),
  });
  if (agreement.response.status !== 201 || agreement.data.parties !== "Parte A / Parte B" || agreement.data.installments !== "6") throw new Error("structured agreement creation failed");

  const movement = await request(`/api/cases/${caseId}/entries/movements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Movimiento de prueba", date: new Date().toLocaleDateString("es-AR") }),
  });
  if (movement.response.status !== 201) throw new Error("movement creation failed");
  const movementFeed = await request("/api/dashboards/movements");
  const feedItem = movementFeed.data.items?.find((item) => item.id === movement.data.id);
  if (!movementFeed.response.ok || !feedItem || feedItem.caseId !== caseId) throw new Error("consolidated movement feed failed");
  const movementReview = await request(`/api/cases/${caseId}/entries/movements/${movement.data.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "Revisado" }),
  });
  if (!movementReview.response.ok || movementReview.data.state !== "Revisado") throw new Error("movement review state update failed");
  const dashboard = await request("/api/dashboards/activity");
  const dashboardCase = dashboard.data.items?.find((item) => item.id === caseId);
  if (!dashboard.response.ok || !dashboardCase || dashboardCase.lastMovement !== "Movimiento de prueba" || dashboardCase.daysWithoutMovement !== 0) throw new Error("movement dashboard aggregation failed");
  const stock = await request("/api/dashboards/stock");
  if (!stock.response.ok || stock.data.totalCases < 1 || stock.data.months?.length !== 6) throw new Error("stock dashboard aggregation failed");

  const agendaModule = encodeURIComponent("client/agenda");
  const agendaRecord = await request(`/api/modules/${agendaModule}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [new Date().toLocaleDateString("es-AR"), "10:30", "Actividad smoke", create.data.fields.number, "Smoke", "Pendiente"], caseId, details: "Detalle temporal" }),
  });
  if (agendaRecord.response.status !== 201) throw new Error("agenda activity creation failed");
  agendaRecordId = agendaRecord.data.id;
  const homeSummary = await request("/api/summary");
  if (!homeSummary.response.ok || !homeSummary.data.upcomingAgenda?.some((item) => item.title === "Actividad smoke")) throw new Error("home agenda summary failed");
  const agendaUpdate = await request(`/api/modules/${agendaModule}/${agendaRecordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [...agendaRecord.data.values.slice(0, 5), "Completada"] }),
  });
  if (!agendaUpdate.response.ok || agendaUpdate.data.values[5] !== "Completada") throw new Error("agenda activity status update failed");

  const inboxModule = encodeURIComponent("client/inbox");
  const inboxRecord = await request(`/api/modules/${inboxModule}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [new Date().toLocaleDateString("es-AR"), "Mensaje smoke", "Remitente de prueba", create.data.fields.number, "Nuevo"], caseId, message: "Contenido temporal" }),
  });
  if (inboxRecord.response.status !== 201) throw new Error("inbox message creation failed");
  inboxRecordId = inboxRecord.data.id;
  const inboxUpdate = await request(`/api/modules/${inboxModule}/${inboxRecordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [...inboxRecord.data.values.slice(0, 4), "Leído"] }),
  });
  if (!inboxUpdate.response.ok || inboxUpdate.data.values[4] !== "Leído") throw new Error("inbox message status update failed");

  const intakeModule = encodeURIComponent("client/nuevos_juicios");
  const intakeRecord = await request(`/api/modules/${intakeModule}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [new Date().toLocaleDateString("es-AR"), `INTAKE-${randomUUID()}`, "Propuesta smoke", "Manual", "Pendiente"], candidateFields: { number: "INTAKE-SMOKE", title: "Propuesta smoke" } }),
  });
  if (intakeRecord.response.status !== 201) throw new Error("new case intake request creation failed");
  intakeRecordId = intakeRecord.data.id;
  const intakeUpdate = await request(`/api/modules/${intakeModule}/${intakeRecordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [...intakeRecord.data.values.slice(0, 4), "Descartado"] }),
  });
  if (!intakeUpdate.response.ok || intakeUpdate.data.values[4] !== "Descartado") throw new Error("new case intake status update failed");

  const file = await request(`/api/cases/${caseId}/entries/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Archivo smoke", fileName: "smoke.txt", fileBase64: Buffer.from("archivo local de prueba").toString("base64") }),
  });
  if (file.response.status !== 201) throw new Error("document upload failed");
  documentEntryId = file.data.id;
  const documentFeed = await request("/api/dashboards/documents");
  const documentFeedItem = documentFeed.data.items?.find((item) => item.id === documentEntryId);
  if (!documentFeed.response.ok || !documentFeedItem?.hasFile || documentFeedItem.caseId !== caseId) throw new Error("document status dashboard aggregation failed");
  const documentStatus = await request(`/api/cases/${caseId}/entries/documents/${documentEntryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "Presentado" }),
  });
  if (!documentStatus.response.ok || documentStatus.data.state !== "Presentado") throw new Error("document status update failed");
  const fileMetadataUpdate = await request(`/api/cases/${caseId}/entries/documents/${documentEntryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Archivo smoke editado" }),
  });
  if (!fileMetadataUpdate.response.ok || fileMetadataUpdate.data.title !== "Archivo smoke editado" || fileMetadataUpdate.data.storageId !== file.data.storageId) throw new Error("entry update should preserve its attachment");
  const download = await fetch(`${base}/api/cases/${caseId}/entries/documents/${documentEntryId}/file`, { headers: { Cookie: cookie } });
  if (!download.ok || await download.text() !== "archivo local de prueba") throw new Error("document download failed");
  const backup = await request("/api/backup");
  const backupFile = backup.data.entries?.find((item) => item.id === documentEntryId);
  if (!backup.response.ok || !backup.data.cases?.some((item) => item.id === caseId) || backupFile?.attachment?.base64 !== Buffer.from("archivo local de prueba").toString("base64") || "users" in backup.data || "sessions" in backup.data) throw new Error("local backup export failed");
  const backupRestore = await request("/api/backup/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(backup.data) });
  if (!backupRestore.response.ok || backupRestore.data.casesAdded !== 0 || backupRestore.data.entriesAdded !== 0 || backupRestore.data.modulesAdded !== 0) throw new Error("backup merge should skip existing records");
  const importPayload = JSON.parse(JSON.stringify(backup.data));
  restoredCaseId = `backup-${randomUUID()}`;
  restoredEntryId = randomUUID();
  restoredModuleKey = `backup-${randomUUID()}`;
  restoredModuleRecordId = randomUUID();
  const restoredNumber = `BACKUP-${randomUUID()}`;
  const attachmentText = "restored backup attachment";
  importPayload.cases.push({ id: restoredCaseId, data: { fields: { number: restoredNumber, title: "Caso restaurado de smoke", state: "En trámite" } }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  importPayload.entries.push({ id: restoredEntryId, caseId: restoredCaseId, section: "documents", data: { title: "Adjunto restaurado" }, createdAt: new Date().toISOString(), attachment: { name: "restore.txt", size: Buffer.byteLength(attachmentText), mimeType: "text/plain", base64: Buffer.from(attachmentText).toString("base64") } });
  importPayload.modules.push({ id: restoredModuleRecordId, module: restoredModuleKey, data: { values: ["Fila restaurada"] }, createdAt: new Date().toISOString() });
  const restored = await request("/api/backup/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(importPayload) });
  if (!restored.response.ok || restored.data.casesAdded !== 1 || restored.data.entriesAdded !== 1 || restored.data.modulesAdded !== 1 || restored.data.filesAdded !== 1) throw new Error("backup merge should restore new cases, modules, and attachments");
  const restoredFile = await fetch(`${base}/api/cases/${restoredCaseId}/entries/documents/${restoredEntryId}/file`, { headers: { Cookie: cookie } });
  if (!restoredFile.ok || await restoredFile.text() !== attachmentText) throw new Error("restored backup attachment download failed");

  moduleKey = `smoke-${randomUUID()}`;
  const initialized = await request(`/api/modules/${encodeURIComponent(moduleKey)}/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [] }),
  });
  if (!initialized.response.ok || !initialized.data.initialized) throw new Error("module initialization failed");
  const moduleRecord = await request(`/api/modules/${encodeURIComponent(moduleKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: ["Registro temporal"] }),
  });
  if (moduleRecord.response.status !== 201) throw new Error("module record creation failed");
  moduleRecordId = moduleRecord.data.id;
  const moduleUpdate = await request(`/api/modules/${encodeURIComponent(moduleKey)}/${moduleRecordId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: ["Registro actualizado"] }),
  });
  if (!moduleUpdate.response.ok || moduleUpdate.data.values[0] !== "Registro actualizado") throw new Error("module record update failed");
  const moduleList = await request(`/api/modules/${encodeURIComponent(moduleKey)}`);
  if (!moduleList.response.ok || moduleList.data.records.length !== 1 || moduleList.data.records[0].values[0] !== "Registro actualizado") throw new Error("module record list failed");
  const moduleAudit = await request("/api/audit");
  if (!moduleAudit.response.ok || !moduleAudit.data.items.some((item) => item.action === "module.updated" && item.detail.includes(moduleKey))) throw new Error("module audit history failed");

  const savedReportModule = encodeURIComponent("admin/mis_reportes");
  const savedReport = await request(`/api/modules/${savedReportModule}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: ["Reporte smoke", "30/10/2026", "CSV · 1 caso", "Disponible"], criteria: { state: "Pendiente", type: "Todos", portfolio: "General", jurisdiction: "Capital", from: "2026-10-01", to: "2026-10-30" }, snapshot: [{ number: "SMOKE-1", claimant: "Prueba", portfolio: "General", jurisdiction: "Capital", customFields: [{ key: "custom1", label: "Comodín 1", value: "Dato personalizado" }] }], totalCases: 1 }),
  });
  if (savedReport.response.status !== 201 || savedReport.data.snapshot?.[0]?.number !== "SMOKE-1" || savedReport.data.snapshot?.[0]?.customFields?.[0]?.value !== "Dato personalizado") throw new Error("saved report snapshot creation failed");
  savedReportId = savedReport.data.id;
  const savedReportList = await request(`/api/modules/${savedReportModule}`);
  if (!savedReportList.response.ok || !savedReportList.data.records.some((item) => item.id === savedReportId && item.snapshot?.length === 1)) throw new Error("saved report snapshot persistence failed");

  const rotatedPassword = `${randomBytes(18).toString("base64url")}Z9`;
  const passwordChange = await request("/api/auth/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: password, newPassword: rotatedPassword }),
  });
  if (!passwordChange.response.ok) throw new Error("local password change failed");
  cookie = passwordChange.response.headers.get("set-cookie")?.split(";")[0] || cookie;
  const authenticatedAfterPasswordChange = await request("/api/auth/me");
  if (!authenticatedAfterPasswordChange.data.user) throw new Error("password change should preserve the current session");
  const oldPasswordLogin = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (oldPasswordLogin.response.status !== 401) throw new Error("old password should stop working after change");

  console.log("SMOKE_OK: auth, cambio de contraseña, casos, importación, backup/merge, actualización masiva, agenda, inbox, novedades, contactos, extrajudicial, finanzas, dashboards, reportes guardados, notas, archivos y módulos CRUD");
} finally {
  if (documentEntryId && caseId && cookie) {
    await request(`/api/cases/${caseId}/entries/documents/${documentEntryId}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (moduleRecordId && moduleKey && cookie) {
    await request(`/api/modules/${encodeURIComponent(moduleKey)}/${moduleRecordId}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (savedReportId && cookie) {
    await request(`/api/modules/${encodeURIComponent("admin/mis_reportes")}/${savedReportId}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (agendaRecordId && cookie) {
    await request(`/api/modules/${encodeURIComponent("client/agenda")}/${agendaRecordId}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (inboxRecordId && cookie) {
    await request(`/api/modules/${encodeURIComponent("client/inbox")}/${inboxRecordId}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (restoredEntryId && restoredCaseId && cookie) {
    await request(`/api/cases/${restoredCaseId}/entries/documents/${restoredEntryId}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (restoredModuleRecordId && restoredModuleKey && cookie) {
    await request(`/api/modules/${encodeURIComponent(restoredModuleKey)}/${restoredModuleRecordId}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (intakeRecordId && cookie) {
    await request(`/api/modules/${encodeURIComponent("client/nuevos_juicios")}/${intakeRecordId}`, { method: "DELETE" }).catch(() => undefined);
  }
  const db = new DatabaseSync(resolve(process.env.LEGALRUN_DATA_DIR || "./data", "legalrun.sqlite"));
  if (caseId) db.prepare("DELETE FROM audit_log WHERE case_id = ?").run(caseId);
  if (importedCaseId) db.prepare("DELETE FROM audit_log WHERE case_id = ?").run(importedCaseId);
  if (restoredCaseId) db.prepare("DELETE FROM audit_log WHERE case_id = ?").run(restoredCaseId);
  db.prepare("DELETE FROM audit_log WHERE user_id = (SELECT id FROM users WHERE email = ?)").run(email);
  if (caseId) db.prepare("DELETE FROM cases WHERE id = ?").run(caseId);
  if (importedCaseId) db.prepare("DELETE FROM cases WHERE id = ?").run(importedCaseId);
  if (restoredCaseId) db.prepare("DELETE FROM cases WHERE id = ?").run(restoredCaseId);
  if (moduleKey) db.prepare("DELETE FROM module_seeds WHERE module = ?").run(moduleKey);
  db.prepare("DELETE FROM users WHERE email = ?").run(email);
  db.close();
}
