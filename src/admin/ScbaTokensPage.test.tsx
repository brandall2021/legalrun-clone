import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScbaTokensPage } from "./ScbaTokensPage";

type ScbaTokenRecord = {
  id: string;
  alias: string;
  holderName: string;
  status: string;
  expiresOn: string;
  lastCheckedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it("renders empty-state CTA for SCBA tokens", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ scbaTokens: [] }),
  })));

  render(<ScbaTokensPage onSaved={() => {}} />);

  expect(await screen.findByText("No hay tokens SCBA cargados todavía.")).toBeTruthy();
});

it("creates and lists multiple SCBA tokens", async () => {
  const onSaved = vi.fn();
  const createToken = vi.fn();
  const createdAt = "2026-11-18T10:00:00.000Z";
  const scbaTokens: ScbaTokenRecord[] = [];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/admin/scba-tokens") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ scbaTokens }) };
    }
    if (url.endsWith("/api/admin/scba-tokens") && init?.method === "POST") {
      const payload = JSON.parse(String(init.body || "{}"));
      createToken(payload);
      const nextToken: ScbaTokenRecord = {
        id: payload.alias === "Token SCBA principal" ? "token-principal" : "token-suplente",
        alias: payload.alias,
        holderName: payload.holderName,
        status: payload.status,
        expiresOn: payload.expiresOn,
        lastCheckedAt: payload.lastCheckedAt,
        notes: payload.notes,
        createdAt,
        updatedAt: createdAt,
      };
      scbaTokens.unshift(nextToken);
      return { ok: true, json: async () => ({ scbaToken: nextToken }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<ScbaTokensPage onSaved={onSaved} />);

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nuevo token SCBA" }));

  const firstDialog = await screen.findByRole("dialog", { name: "Nuevo token SCBA" });
  await user.type(within(firstDialog).getByLabelText("Alias"), "Token SCBA principal");
  await user.type(within(firstDialog).getByLabelText("Titular"), "Lucía Suárez");
  await user.selectOptions(within(firstDialog).getByLabelText("Estado"), "Activo");
  await user.type(within(firstDialog).getByLabelText("Vence"), "2026-12-31");
  await user.type(within(firstDialog).getByLabelText("Último control"), "2026-11-17");
  await user.type(within(firstDialog).getByLabelText("Notas"), "Uso principal");
  await user.click(within(firstDialog).getByRole("button", { name: "Guardar token" }));

  await user.click(screen.getByRole("button", { name: "Nuevo token SCBA" }));

  const secondDialog = await screen.findByRole("dialog", { name: "Nuevo token SCBA" });
  await user.type(within(secondDialog).getByLabelText("Alias"), "Token suplente");
  await user.type(within(secondDialog).getByLabelText("Titular"), "Marcos Pérez");
  await user.selectOptions(within(secondDialog).getByLabelText("Estado"), "Pendiente");
  await user.type(within(secondDialog).getByLabelText("Vence"), "2027-03-01");
  await user.type(within(secondDialog).getByLabelText("Último control"), "2026-11-18");
  await user.type(within(secondDialog).getByLabelText("Notas"), "Carga manual secundaria");
  await user.click(within(secondDialog).getByRole("button", { name: "Guardar token" }));

  expect(createToken).toHaveBeenNthCalledWith(1, {
    alias: "Token SCBA principal",
    holderName: "Lucía Suárez",
    status: "Activo",
    expiresOn: "2026-12-31",
    lastCheckedAt: "2026-11-17",
    notes: "Uso principal",
  });
  expect(createToken).toHaveBeenNthCalledWith(2, {
    alias: "Token suplente",
    holderName: "Marcos Pérez",
    status: "Pendiente",
    expiresOn: "2027-03-01",
    lastCheckedAt: "2026-11-18",
    notes: "Carga manual secundaria",
  });
  expect(await screen.findByText("Token SCBA principal")).toBeTruthy();
  expect(screen.getByText("Token suplente")).toBeTruthy();
  expect(onSaved).toHaveBeenNthCalledWith(1, "Token SCBA creado en la base local");
  expect(onSaved).toHaveBeenNthCalledWith(2, "Token SCBA creado en la base local");
});

it("edits an existing SCBA token", async () => {
  const onSaved = vi.fn();
  const updateToken = vi.fn();
  const createdAt = "2026-11-18T10:00:00.000Z";
  const scbaTokens: ScbaTokenRecord[] = [
    {
      id: "token-principal",
      alias: "Token SCBA principal",
      holderName: "Lucía Suárez",
      status: "Activo",
      expiresOn: "2026-12-31",
      lastCheckedAt: "2026-11-17",
      notes: "Uso principal",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/admin/scba-tokens") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ scbaTokens }) };
    }
    if (url.endsWith("/api/admin/scba-tokens/token-principal") && init?.method === "PUT") {
      const payload = JSON.parse(String(init.body || "{}"));
      updateToken(payload);
      scbaTokens[0] = {
        ...scbaTokens[0],
        ...payload,
        updatedAt: "2026-11-18T11:00:00.000Z",
      };
      return { ok: true, json: async () => ({ scbaToken: scbaTokens[0] }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<ScbaTokensPage onSaved={onSaved} />);

  expect(await screen.findByText("Token SCBA principal")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Editar token Token SCBA principal" }));

  const dialog = await screen.findByRole("dialog", { name: "Editar token SCBA" });
  await user.selectOptions(within(dialog).getByLabelText("Estado"), "Vencido");
  await user.clear(within(dialog).getByLabelText("Notas"));
  await user.type(within(dialog).getByLabelText("Notas"), "Renovación manual pendiente");
  await user.click(within(dialog).getByRole("button", { name: "Guardar token" }));

  expect(updateToken).toHaveBeenCalledWith({
    alias: "Token SCBA principal",
    holderName: "Lucía Suárez",
    status: "Vencido",
    expiresOn: "2026-12-31",
    lastCheckedAt: "2026-11-17",
    notes: "Renovación manual pendiente",
  });
  expect(await screen.findByText("Vencido")).toBeTruthy();
  expect(onSaved).toHaveBeenCalledWith("Token SCBA actualizado en la base local");
});

it("normalizes an ISO lastCheckedAt value for the date field and preserves it on save", async () => {
  const onSaved = vi.fn();
  const updateToken = vi.fn();
  const createdAt = "2026-11-18T10:00:00.000Z";
  const scbaTokens: ScbaTokenRecord[] = [
    {
      id: "token-iso",
      alias: "Token ISO",
      holderName: "Lucía Suárez",
      status: "Activo",
      expiresOn: "2026-12-31",
      lastCheckedAt: "2026-11-18T12:00:00.000Z",
      notes: "Uso principal",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/admin/scba-tokens") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ scbaTokens }) };
    }
    if (url.endsWith("/api/admin/scba-tokens/token-iso") && init?.method === "PUT") {
      const payload = JSON.parse(String(init.body || "{}"));
      updateToken(payload);
      scbaTokens[0] = {
        ...scbaTokens[0],
        ...payload,
        updatedAt: "2026-11-18T11:00:00.000Z",
      };
      return { ok: true, json: async () => ({ scbaToken: scbaTokens[0] }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<ScbaTokensPage onSaved={onSaved} />);

  expect(await screen.findByText("Token ISO")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Editar token Token ISO" }));

  const dialog = await screen.findByRole("dialog", { name: "Editar token SCBA" });
  const lastCheckedAtInput = within(dialog).getByLabelText("Último control") as HTMLInputElement;
  expect(lastCheckedAtInput.value).toBe("2026-11-18");

  await user.click(within(dialog).getByRole("button", { name: "Guardar token" }));

  expect(updateToken).toHaveBeenCalledWith({
    alias: "Token ISO",
    holderName: "Lucía Suárez",
    status: "Activo",
    expiresOn: "2026-12-31",
    lastCheckedAt: "2026-11-18T12:00:00.000Z",
    notes: "Uso principal",
  });
  expect(onSaved).toHaveBeenCalledWith("Token SCBA actualizado en la base local");
});
