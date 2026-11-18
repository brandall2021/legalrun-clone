import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CredentialsPage } from "./CredentialsPage";

type CredentialRecord = {
  id: string;
  name: string;
  credentialType: string;
  ownerName: string;
  status: string;
  expiresOn: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it("renders empty-state CTA for credentials", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ credentials: [] }),
  })));

  render(<CredentialsPage onSaved={() => {}} />);

  expect(await screen.findByText("No hay credenciales cargadas todavía.")).toBeTruthy();
});

it("creates and edits a credential with the fixed admin statuses", async () => {
  const onSaved = vi.fn();
  const createCredential = vi.fn();
  const updateCredential = vi.fn();
  const createdAt = "2026-11-18T10:00:00.000Z";
  const credentials: CredentialRecord[] = [
    {
      id: "cred-afip",
      name: "AFIP producción",
      credentialType: "AFIP",
      ownerName: "Estudio central",
      status: "Activo",
      expiresOn: "2027-01-31",
      notes: "Uso interno",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/admin/credentials") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ credentials }) };
    }
    if (url.endsWith("/api/admin/credentials") && init?.method === "POST") {
      const payload = JSON.parse(String(init.body || "{}"));
      createCredential(payload);
      const nextCredential: CredentialRecord = {
        id: "cred-scba",
        name: payload.name,
        credentialType: payload.credentialType,
        ownerName: payload.ownerName,
        status: payload.status,
        expiresOn: payload.expiresOn,
        notes: payload.notes,
        createdAt,
        updatedAt: createdAt,
      };
      credentials.unshift(nextCredential);
      return { ok: true, json: async () => ({ credential: nextCredential }) };
    }
    if (url.endsWith("/api/admin/credentials/cred-scba") && init?.method === "PUT") {
      const payload = JSON.parse(String(init.body || "{}"));
      updateCredential(payload);
      const index = credentials.findIndex((credential) => credential.id === "cred-scba");
      credentials[index] = {
        ...credentials[index],
        ...payload,
        updatedAt: "2026-11-18T11:00:00.000Z",
      };
      return { ok: true, json: async () => ({ credential: credentials[index] }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<CredentialsPage onSaved={onSaved} />);

  expect(await screen.findByText("AFIP producción")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nueva credencial" }));

  const createDialog = await screen.findByRole("dialog", { name: "Nueva credencial" });
  const statuses = Array.from((within(createDialog).getByLabelText("Estado") as HTMLSelectElement).options).map((option) => option.text);
  expect(statuses).toEqual(["Activo", "Pendiente", "Vencido", "Inactivo"]);
  await user.type(within(createDialog).getByLabelText("Nombre"), "SCBA principal");
  await user.type(within(createDialog).getByLabelText("Tipo"), "SCBA");
  await user.type(within(createDialog).getByLabelText("Titular"), "Lucía Suárez");
  await user.selectOptions(within(createDialog).getByLabelText("Estado"), "Pendiente");
  await user.type(within(createDialog).getByLabelText("Vence"), "2026-12-31");
  await user.type(within(createDialog).getByLabelText("Notas"), "Carga manual local");
  await user.click(within(createDialog).getByRole("button", { name: "Guardar credencial" }));

  expect(createCredential).toHaveBeenCalledWith({
    name: "SCBA principal",
    credentialType: "SCBA",
    ownerName: "Lucía Suárez",
    status: "Pendiente",
    expiresOn: "2026-12-31",
    notes: "Carga manual local",
  });
  expect(await screen.findByText("SCBA principal")).toBeTruthy();
  expect(screen.getByText("Pendiente")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Editar credencial SCBA principal" }));

  const editDialog = await screen.findByRole("dialog", { name: "Editar credencial" });
  await user.selectOptions(within(editDialog).getByLabelText("Estado"), "Vencido");
  await user.clear(within(editDialog).getByLabelText("Notas"));
  await user.type(within(editDialog).getByLabelText("Notas"), "Pendiente de renovación");
  await user.click(within(editDialog).getByRole("button", { name: "Guardar credencial" }));

  expect(updateCredential).toHaveBeenCalledWith({
    name: "SCBA principal",
    credentialType: "SCBA",
    ownerName: "Lucía Suárez",
    status: "Vencido",
    expiresOn: "2026-12-31",
    notes: "Pendiente de renovación",
  });
  expect(await screen.findByText("Vencido")).toBeTruthy();
  expect(onSaved).toHaveBeenNthCalledWith(1, "Credencial creada en la base local");
  expect(onSaved).toHaveBeenNthCalledWith(2, "Credencial actualizada en la base local");
});

it("shows a no-results message when the filter matches nothing", async () => {
  const createdAt = "2026-11-18T10:00:00.000Z";
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      credentials: [
        {
          id: "cred-1",
          name: "SCBA principal",
          credentialType: "SCBA",
          ownerName: "Lucía Suárez",
          status: "Activo",
          expiresOn: "",
          notes: "",
          createdAt,
          updatedAt: createdAt,
        },
      ],
    }),
  })));

  render(<CredentialsPage onSaved={() => {}} />);

  expect(await screen.findByText("SCBA principal")).toBeTruthy();

  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("Buscar por nombre, tipo, titular o estado..."), "zzz");

  expect(screen.getByText("No hay resultados para el filtro aplicado.")).toBeTruthy();
  expect(screen.queryByText("No hay credenciales cargadas todavía.")).toBeNull();
});
