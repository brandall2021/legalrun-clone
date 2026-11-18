import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

const movements = [
  {
    id: "m1",
    caseId: "c1",
    caseNumber: "1842/2025",
    caseTitle: "Caso Demo",
    court: "Juzgado Civil",
    date: "18/11/2026",
    title: "Sentencia dictada",
    description: "",
    user: "Cuenta local",
    status: "Nuevo",
    createdAt: "2026-11-18T10:00:00.000Z",
    tags: ["Sentencia"],
  },
  {
    id: "m2",
    caseId: "c1",
    caseNumber: "1842/2025",
    caseTitle: "Caso Demo",
    court: "Juzgado Civil",
    date: "17/11/2026",
    title: "Se corrió traslado de la demanda",
    description: "",
    user: "Cuenta local",
    status: "Nuevo",
    createdAt: "2026-11-17T10:00:00.000Z",
    tags: [],
  },
];

const cases = [{ id: "c1", fields: { number: "1842/2025", title: "Caso Demo", portfolio: "General" } }];

function stubApi(handlers: { onPatch?: (payload: unknown) => void; onCreate?: (payload: unknown) => void } = {}) {
  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return { ok: true, json: async () => ({ user: { id: "u1", email: "demo@test.com" } }) };
    if (url.includes("/api/dashboards/movements")) return { ok: true, json: async () => ({ items: movements }) };
    if (url.endsWith("/api/cases/c1/entries/movements/m2") && init?.method === "PATCH") {
      const payload = JSON.parse(String(init.body || "{}"));
      handlers.onPatch?.(payload);
      return { ok: true, json: async () => ({ id: "m2", ...payload }) };
    }
    if (url.endsWith("/api/cases/c1/entries/movements") && init?.method === "POST") {
      const payload = JSON.parse(String(init.body || "{}"));
      handlers.onCreate?.(payload);
      return { ok: true, json: async () => ({ id: "m3", ...payload }) };
    }
    if (url.includes("/api/cases")) return { ok: true, json: async () => ({ cases }) };
    if (url.includes("/api/modules/")) return { ok: true, json: async () => ({ initialized: true, records: [] }) };
    if (url.includes("/api/summary")) return { ok: true, json: async () => ({ recent: [], upcomingAgenda: [], portfolioBreakdown: [] }) };
    return { ok: true, json: async () => ({}) };
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.location.hash = "";
});

it("shows stored tags and saves a local suggestion for an untagged movement", async () => {
  const onPatch = vi.fn();
  stubApi({ onPatch });
  window.location.hash = "#/client/novedades_juicio";

  render(<App />);

  expect(await screen.findByText("Sentencia dictada")).toBeTruthy();
  expect(screen.getByText("Sentencia")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Sugerir etiqueta" }));

  expect(onPatch).toHaveBeenCalledWith({ tags: ["Traslado"] });
  expect(await screen.findByText("Traslado")).toBeTruthy();
});

it("detects tags and suggests a template/state while registering a movement", async () => {
  const onCreate = vi.fn();
  stubApi({ onCreate });
  window.location.hash = "#/client/novedades_juicio";

  render(<App />);

  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "＋ Registrar movimiento" }));
  await user.selectOptions(screen.getByLabelText("Expediente"), "c1");
  await user.type(screen.getByLabelText("Movimiento"), "Se corrió traslado de la demanda");

  expect(await screen.findByText("Etiquetas detectadas: Traslado")).toBeTruthy();
  expect(screen.getByText("Sugerencia local: estado «En trámite» · template «Presentación simple»")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Guardar movimiento" }));

  expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: ["Traslado"] }));
});
