import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RolesPage } from "./RolesPage";

type RoleRecord = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it("creates and deactivates a role", async () => {
  const onSaved = vi.fn();
  const createRole = vi.fn();
  const updateRole = vi.fn();
  const createdAt = "2026-11-18T10:00:00.000Z";
  const roles: RoleRecord[] = [
    {
      id: "role-admin",
      name: "Administrador",
      description: "Rol administrador local",
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/admin/roles") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ roles }) };
    }
    if (url.endsWith("/api/admin/roles") && init?.method === "POST") {
      const payload = JSON.parse(String(init.body || "{}"));
      createRole(payload);
      const nextRole: RoleRecord = {
        id: "role-gestor",
        name: payload.name,
        description: payload.description,
        isActive: payload.isActive,
        createdAt,
        updatedAt: createdAt,
      };
      roles.unshift(nextRole);
      return { ok: true, json: async () => ({ role: nextRole }) };
    }
    if (url.endsWith("/api/admin/roles/role-gestor") && init?.method === "PUT") {
      const payload = JSON.parse(String(init.body || "{}"));
      updateRole(payload);
      const index = roles.findIndex((role) => role.id === "role-gestor");
      roles[index] = { ...roles[index], ...payload, updatedAt: "2026-11-18T11:00:00.000Z" };
      return { ok: true, json: async () => ({ role: roles[index] }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<RolesPage onSaved={onSaved} />);

  expect(await screen.findByText("Administrador")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nuevo rol" }));

  const createDialog = await screen.findByRole("dialog", { name: "Nuevo rol" });
  await user.type(within(createDialog).getByLabelText("Nombre"), "Gestor local");
  await user.type(within(createDialog).getByLabelText("Descripción"), "Gestiona cuentas del estudio");
  await user.click(within(createDialog).getByRole("button", { name: "Guardar rol" }));

  expect(createRole).toHaveBeenCalledWith({
    name: "Gestor local",
    description: "Gestiona cuentas del estudio",
    isActive: true,
  });
  expect(await screen.findByText("Gestor local")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Editar rol Gestor local" }));

  const editDialog = await screen.findByRole("dialog", { name: "Editar rol" });
  await user.click(within(editDialog).getByLabelText("Activo"));
  await user.click(within(editDialog).getByRole("button", { name: "Guardar rol" }));

  expect(updateRole).toHaveBeenCalledWith({
    name: "Gestor local",
    description: "Gestiona cuentas del estudio",
    isActive: false,
  });

  expect(await screen.findByText("Inactivo")).toBeTruthy();
  expect(onSaved).toHaveBeenNthCalledWith(1, "Rol creado en la base local");
  expect(onSaved).toHaveBeenNthCalledWith(2, "Rol actualizado en la base local");
});
