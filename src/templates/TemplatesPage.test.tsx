import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatesPage } from "./TemplatesPage";

const MODULE_KEY = "client/configuracion/template@v2";
const MODULE_URL = `/api/modules/${encodeURIComponent(MODULE_KEY)}`;

const cases = [
  {
    id: "case-1",
    fields: {
      number: "1842/2025",
      title: "Empresa Demo S.A. c/ Persona de prueba",
      claimant: "Empresa Demo S.A.",
      defendant: "Persona de prueba",
      court: "",
      type: "Cobro ejecutivo",
    },
  },
];

const customFields = [{ key: "custom_abc", label: "Comodín 1" }];

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it("creates a template with a body that keeps wildcards intact", async () => {
  const onSaved = vi.fn();
  const createTemplate = vi.fn();
  const records: { id: string; values: string[]; body?: string }[] = [];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith(MODULE_URL) && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ initialized: true, records }) };
    }
    if (url.endsWith(MODULE_URL) && init?.method === "POST") {
      const payload = JSON.parse(String(init.body || "{}"));
      createTemplate(payload);
      const created = { id: "template-new", ...payload };
      records.unshift(created);
      return { ok: true, json: async () => created };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<TemplatesPage cases={cases} customFields={customFields} onSaved={onSaved} />);

  expect(await screen.findByText("No hay plantillas cargadas todavía.")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nuevo template" }));

  const dialog = await screen.findByRole("dialog", { name: "Nuevo template" });
  await user.type(within(dialog).getByLabelText("Nombre"), "Contestación de demanda");
  const typeField = within(dialog).getByLabelText("Tipo de documento");
  await user.clear(typeField);
  await user.type(typeField, "Escrito");
  fireEvent.change(within(dialog).getByLabelText("Contenido"), {
    target: { value: "Hola {{claimant}} del expediente {{number}}." },
  });
  await user.click(within(dialog).getByRole("button", { name: "Guardar template" }));

  expect(createTemplate).toHaveBeenCalledWith(expect.objectContaining({
    body: "Hola {{claimant}} del expediente {{number}}.",
    values: expect.arrayContaining(["Escrito", "Contestación de demanda"]),
  }));
  expect(await screen.findByText("Contestación de demanda")).toBeTruthy();
  expect(onSaved).toHaveBeenCalledWith("Template guardado en la base local");
});

it("inserts a wildcard from the palette while editing", async () => {
  const records = [
    {
      id: "template-1",
      values: ["12/03/2025", "Escrito", "Presentación simple", "—"],
      body: "Hola ",
    },
  ];
  const updateTemplate = vi.fn();

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith(MODULE_URL) && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ initialized: true, records }) };
    }
    if (url.endsWith(`${MODULE_URL}/template-1`) && init?.method === "PUT") {
      const payload = JSON.parse(String(init.body || "{}"));
      updateTemplate(payload);
      return { ok: true, json: async () => ({ id: "template-1", ...payload }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<TemplatesPage cases={cases} customFields={customFields} onSaved={() => {}} />);

  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Editar template Presentación simple" }));

  const dialog = await screen.findByRole("dialog", { name: "Editar template" });
  const bodyField = within(dialog).getByLabelText("Contenido") as HTMLTextAreaElement;
  await user.click(within(dialog).getByRole("button", { name: "Demandante" }));

  expect(bodyField.value).toContain("{{claimant}}");
});

it("previews a template with case data and flags variables without data", async () => {
  const records = [
    {
      id: "template-1",
      values: ["12/03/2025", "Escrito", "Presentación simple", "—"],
      body: "Hola {{claimant}}, expediente {{number}}. Juzgado: {{court}}.",
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith(MODULE_URL) && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ initialized: true, records }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<TemplatesPage cases={cases} customFields={customFields} onSaved={() => {}} />);

  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Generar escrito Presentación simple" }));

  const preview = await screen.findByLabelText("Vista previa del escrito");
  expect(preview.textContent).toContain("Hola Empresa Demo S.A., expediente 1842/2025.");
  expect(screen.getByText("Variables sin dato: Juzgado")).toBeTruthy();
});

it("shows a no-results message when the filter matches nothing", async () => {
  const records = [
    {
      id: "template-1",
      values: ["12/03/2025", "Escrito", "Presentación simple", "—"],
      body: "Hola {{claimant}}",
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith(MODULE_URL) && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ initialized: true, records }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<TemplatesPage cases={cases} customFields={customFields} onSaved={() => {}} />);

  expect(await screen.findByText("Presentación simple")).toBeTruthy();

  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("Buscar por nombre, tipo o variables..."), "zzz");

  expect(screen.getByText("No hay resultados para el filtro aplicado.")).toBeTruthy();
  expect(screen.queryByText("No hay plantillas cargadas todavía.")).toBeNull();
});
