import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionRulesPage } from "./SuggestionRulesPage";
import { SUGGESTION_MODULE_KEY } from "./suggestionRules";

const MODULE_URL = `/api/modules/${encodeURIComponent(SUGGESTION_MODULE_KEY)}`;
const TEMPLATE_URL = `/api/modules/${encodeURIComponent("client/configuracion/template@v2")}`;

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it("seeds the default rules when the module is not initialized", async () => {
  const initialize = vi.fn();

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith(MODULE_URL) && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ initialized: false, records: [] }) };
    }
    if (url.endsWith(`${MODULE_URL}/initialize`) && init?.method === "POST") {
      const payload = JSON.parse(String(init.body || "{}"));
      initialize(payload);
      return {
        ok: true,
        json: async () => ({
          initialized: true,
          records: payload.rows.map((row: { values: string[] }, index: number) => ({ id: `seed-${index}`, values: row.values })),
        }),
      };
    }
    if (url.endsWith(TEMPLATE_URL)) {
      return { ok: true, json: async () => ({ records: [{ id: "t1", values: ["12/03/2025", "Escrito", "Presentación simple", "—"] }] }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<SuggestionRulesPage states={["En trámite", "Sentencia"]} onSaved={() => {}} />);

  expect(await screen.findByText("Traslado")).toBeTruthy();
  expect(screen.getAllByText("Sentencia").length).toBeGreaterThan(0);
  expect(initialize).toHaveBeenCalledWith({
    rows: expect.arrayContaining([
      expect.objectContaining({ values: expect.arrayContaining(["Traslado", "Presentación simple", "En trámite"]) }),
    ]),
  });
});

it("creates a rule with the selected state, substate and template", async () => {
  const onSaved = vi.fn();
  const createRule = vi.fn();
  const records: { id: string; values: string[] }[] = [];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith(MODULE_URL) && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ initialized: true, records }) };
    }
    if (url.endsWith(MODULE_URL) && init?.method === "POST") {
      const payload = JSON.parse(String(init.body || "{}"));
      createRule(payload);
      const created = { id: "rule-new", values: payload.values };
      records.push(created);
      return { ok: true, json: async () => created };
    }
    if (url.endsWith(TEMPLATE_URL)) {
      return {
        ok: true,
        json: async () => ({
          records: [
            { id: "t1", values: ["12/03/2025", "Escrito", "Presentación simple", "—"] },
            { id: "t2", values: ["12/03/2025", "Oficio", "Oficio", "—"] },
          ],
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<SuggestionRulesPage states={["En trámite", "Prueba"]} onSaved={onSaved} />);

  expect(await screen.findByText("No hay reglas de sugerencia cargadas todavía.")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nueva regla" }));

  const dialog = await screen.findByRole("dialog", { name: "Nueva regla de sugerencia" });
  await user.type(within(dialog).getByLabelText("Etiqueta"), "Notificación");
  await user.selectOptions(within(dialog).getByLabelText("Estado judicial"), "Prueba");
  await user.type(within(dialog).getByLabelText("Subestado judicial"), "A despacho");
  await user.selectOptions(within(dialog).getByLabelText("Template"), "Oficio");
  await user.click(within(dialog).getByLabelText("Marcar la sugerencia como automática"));
  await user.click(within(dialog).getByRole("button", { name: "Guardar regla" }));

  expect(createRule).toHaveBeenCalledWith(expect.objectContaining({
    values: expect.arrayContaining(["Notificación", "Sí", "Oficio", "Prueba", "A despacho"]),
  }));
  expect(await screen.findByText("Notificación")).toBeTruthy();
  expect(screen.getByText("Sí")).toBeTruthy();
  expect(onSaved).toHaveBeenCalledWith("Regla de sugerencia guardada en la base local");
});

it("shows a no-results message when the filter matches nothing", async () => {
  const records = [
    {
      id: "rule-1",
      values: ["Sugerencia para Sentencia", "Cuenta local", "18/11/2026", "Todos", "Todos", "Sentencia", "Sugerir", "No", "Escrito", "Presentación simple", "No", "Sentencia", ""],
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith(MODULE_URL) && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ initialized: true, records }) };
    }
    if (url.endsWith(TEMPLATE_URL)) return { ok: true, json: async () => ({ records: [] }) };
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<SuggestionRulesPage states={["En trámite"]} onSaved={() => {}} />);

  expect((await screen.findAllByText("Sentencia")).length).toBeGreaterThan(0);

  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("Buscar por etiqueta, estado o template..."), "zzz");

  expect(screen.getByText("No hay resultados para el filtro aplicado.")).toBeTruthy();
  expect(screen.queryByText("No hay reglas de sugerencia cargadas todavía.")).toBeNull();
});
