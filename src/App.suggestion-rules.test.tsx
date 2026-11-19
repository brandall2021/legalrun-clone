import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { SUGGESTION_MODULE_KEY } from "./assistant/suggestionRules";

const SUGGESTION_URL = `/api/modules/${encodeURIComponent(SUGGESTION_MODULE_KEY)}`;

function stubApi(overrides: { suggestionRecords?: Array<{ id: string; values: string[] }> } = {}) {
  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return { ok: true, json: async () => ({ user: { id: "u1", email: "demo@test.com" } }) };
    if (url.includes("/api/dashboards/movements")) return { ok: true, json: async () => ({ items: [] }) };
    if (url.endsWith(SUGGESTION_URL) && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ initialized: true, records: overrides.suggestionRecords || [] }) };
    }
    if (url.includes("/api/modules/")) return { ok: true, json: async () => ({ initialized: true, records: [] }) };
    if (url.includes("/api/cases")) return { ok: true, json: async () => ({ cases: [] }) };
    if (url.includes("/api/summary")) return { ok: true, json: async () => ({ recent: [], upcomingAgenda: [], portfolioBreakdown: [] }) };
    return { ok: true, json: async () => ({}) };
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.location.hash = "";
});

it("renders the dedicated suggestion rules page from #/client/configuracion/suggested_movements", async () => {
  window.location.hash = "#/client/configuracion/suggested_movements";
  stubApi({
    suggestionRecords: [
      {
        id: "rule-1",
        values: ["Sugerencia para Sentencia", "Cuenta local", "18/11/2026", "Todos", "Todos", "Sentencia", "Sugerir", "No", "Escrito", "Presentación simple", "No", "Sentencia", ""],
      },
    ],
  });

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Sugerencias por etiqueta" })).toBeTruthy();
  expect(screen.getAllByText("Sentencia").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Nueva regla" })).toBeTruthy();
});

it("uses the stored suggestion rules while registering a movement", async () => {
  window.location.hash = "#/client/novedades_juicio";
  const cases = [{ id: "c1", fields: { number: "1842/2025", title: "Caso Demo", portfolio: "General" } }];
  const createMovement = vi.fn();

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return { ok: true, json: async () => ({ user: { id: "u1", email: "demo@test.com" } }) };
    if (url.includes("/api/dashboards/movements")) return { ok: true, json: async () => ({ items: [] }) };
    if (url.endsWith(SUGGESTION_URL) && (!init?.method || init.method === "GET")) {
      return {
        ok: true,
        json: async () => ({
          initialized: true,
          records: [
            {
              id: "rule-sentencia",
              values: ["Sugerencia para Sentencia", "Cuenta local", "18/11/2026", "Todos", "Todos", "Sentencia", "Sugerir", "No", "Oficio", "Oficio", "No", "Prueba", "A despacho"],
            },
          ],
        }),
      };
    }
    if (url.endsWith("/api/cases/c1/entries/movements") && init?.method === "POST") {
      createMovement(JSON.parse(String(init.body || "{}")));
      return { ok: true, json: async () => ({ id: "m1" }) };
    }
    if (url.includes("/api/modules/")) return { ok: true, json: async () => ({ initialized: true, records: [] }) };
    if (url.includes("/api/cases")) return { ok: true, json: async () => ({ cases }) };
    if (url.includes("/api/summary")) return { ok: true, json: async () => ({ recent: [], upcomingAgenda: [], portfolioBreakdown: [] }) };
    return { ok: true, json: async () => ({}) };
  }));

  render(<App />);

  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "＋ Registrar movimiento" }));
  await user.selectOptions(screen.getByLabelText("Expediente"), "c1");
  await user.type(screen.getByLabelText("Movimiento"), "Sentencia dictada");

  expect(await screen.findByText("Sugerencia local: estado «Prueba» · subestado «A despacho» · template «Oficio»")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Guardar movimiento" }));
  expect(createMovement).toHaveBeenCalledWith(expect.objectContaining({ tags: ["Sentencia"] }));
});
