import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersAdminPage } from "./UsersAdminPage";

type RoleRecord = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string | null;
  roleName: string;
  jobTitle: string;
  phoneMobile: string;
  phoneWork: string;
  isAdmin: boolean;
  isActive: boolean;
  isResponsible: boolean;
  createdAt: string;
  updatedAt: string;
};

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it("creates a studio user with temporary password and assigned role", async () => {
  const onSaved = vi.fn();
  const createUser = vi.fn();
  const createdAt = "2026-11-18T10:00:00.000Z";
  const roles: RoleRecord[] = [
    { id: "role-admin", name: "Administrador", description: "Rol administrador local", isActive: true, createdAt, updatedAt: createdAt },
    { id: "role-analista", name: "Analista", description: "Analiza expedientes", isActive: true, createdAt, updatedAt: createdAt },
  ];
  const users: UserRecord[] = [];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/admin/roles") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ roles }) };
    }
    if (url.endsWith("/api/admin/users") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ users }) };
    }
    if (url.endsWith("/api/admin/users") && init?.method === "POST") {
      const payload = JSON.parse(String(init.body || "{}"));
      createUser(payload);
      const role = roles.find((item) => item.id === payload.roleId);
      const nextUser: UserRecord = {
        id: "user-new",
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        roleId: payload.roleId,
        roleName: role?.name || "",
        jobTitle: payload.jobTitle,
        phoneMobile: "",
        phoneWork: "",
        isAdmin: role?.name === "Administrador",
        isActive: payload.isActive,
        isResponsible: payload.isResponsible,
        createdAt,
        updatedAt: createdAt,
      };
      users.unshift(nextUser);
      return { ok: true, json: async () => ({ user: nextUser }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<UsersAdminPage onSaved={onSaved} />);

  expect(await screen.findByText("Administrador")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nuevo usuario" }));

  const dialog = await screen.findByRole("dialog", { name: "Nuevo usuario" });
  expect((within(dialog).getByLabelText("Contraseña temporal") as HTMLInputElement).getAttribute("type")).toBe("password");
  await user.type(within(dialog).getByLabelText("Email"), "nuevo@estudio.local");
  await user.type(within(dialog).getByLabelText("Contraseña temporal"), "Temporal123456");
  await user.type(within(dialog).getByLabelText("Nombre"), "Lucía");
  await user.type(within(dialog).getByLabelText("Apellido"), "Suárez");
  await user.type(within(dialog).getByLabelText("Cargo"), "Analista");
  await user.selectOptions(within(dialog).getByLabelText("Rol"), "role-analista");
  await user.click(within(dialog).getByLabelText("Responsable"));
  await user.click(within(dialog).getByRole("button", { name: "Guardar usuario" }));

  expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
    email: "nuevo@estudio.local",
    temporaryPassword: "Temporal123456",
    roleId: "role-analista",
    isResponsible: true,
  }));
  const createdEmail = await screen.findByText("nuevo@estudio.local");
  expect(createdEmail).toBeTruthy();
  expect(within(createdEmail.closest("tr")!).getAllByText("Analista").length).toBeGreaterThan(0);
  expect(onSaved).toHaveBeenCalledWith("Usuario creado en la base local");
});

it("updates a user through PUT, including inactive flag and optional temporary password on edit", async () => {
  const onSaved = vi.fn();
  const updateUser = vi.fn();
  const createdAt = "2026-11-18T10:00:00.000Z";
  const roles: RoleRecord[] = [
    { id: "role-admin", name: "Administrador", description: "Rol administrador local", isActive: true, createdAt, updatedAt: createdAt },
    { id: "role-operador", name: "Operador", description: "Opera casos", isActive: true, createdAt, updatedAt: createdAt },
  ];
  const users: UserRecord[] = [
    {
      id: "user-lucia",
      email: "lucia@estudio.local",
      firstName: "Lucía",
      lastName: "Paz",
      roleId: "role-operador",
      roleName: "Operador",
      jobTitle: "Gestora",
      phoneMobile: "",
      phoneWork: "",
      isAdmin: false,
      isActive: true,
      isResponsible: true,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/admin/roles") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ roles }) };
    }
    if (url.endsWith("/api/admin/users") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ users }) };
    }
    if (url.endsWith("/api/admin/users/user-lucia") && init?.method === "PUT") {
      const payload = JSON.parse(String(init.body || "{}"));
      updateUser(payload);
      users[0] = {
        ...users[0],
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        roleId: payload.roleId,
        roleName: roles.find((role) => role.id === payload.roleId)?.name || "",
        jobTitle: payload.jobTitle,
        isActive: payload.isActive,
        isResponsible: payload.isResponsible,
        updatedAt: "2026-11-18T12:00:00.000Z",
      };
      return { ok: true, json: async () => ({ user: users[0] }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<UsersAdminPage onSaved={onSaved} />);

  expect(await screen.findByText("lucia@estudio.local")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Editar usuario lucia@estudio.local" }));

  const dialog = await screen.findByRole("dialog", { name: "Editar usuario" });
  const passwordInput = within(dialog).getByLabelText("Nueva contraseña temporal") as HTMLInputElement;
  expect(passwordInput.getAttribute("type")).toBe("password");
  await user.clear(within(dialog).getByLabelText("Cargo"));
  await user.type(within(dialog).getByLabelText("Cargo"), "Coordinadora");
  await user.click(within(dialog).getByLabelText("Activo"));
  await user.clear(passwordInput);
  await user.type(passwordInput, "ResetTemporal123");
  await user.click(within(dialog).getByRole("button", { name: "Guardar usuario" }));

  expect(updateUser).toHaveBeenCalledWith({
    email: "lucia@estudio.local",
    firstName: "Lucía",
    lastName: "Paz",
    roleId: "role-operador",
    jobTitle: "Coordinadora",
    isActive: false,
    isResponsible: true,
    temporaryPassword: "ResetTemporal123",
  });
  const updatedEmail = await screen.findByText("lucia@estudio.local");
  expect(within(updatedEmail.closest("tr")!).getByText("Coordinadora")).toBeTruthy();
  expect(within(updatedEmail.closest("tr")!).getByText("Inactivo")).toBeTruthy();
  expect(onSaved).toHaveBeenCalledWith("Usuario actualizado en la base local");
});

it("excludes inactive roles for new users but keeps the current inactive role on edit", async () => {
  const createdAt = "2026-11-18T10:00:00.000Z";
  const roles: RoleRecord[] = [
    { id: "role-admin", name: "Administrador", description: "Rol administrador local", isActive: true, createdAt, updatedAt: createdAt },
    { id: "role-operador", name: "Operador", description: "Opera casos", isActive: true, createdAt, updatedAt: createdAt },
    { id: "role-archivo", name: "Archivo", description: "Rol legado", isActive: false, createdAt, updatedAt: createdAt },
  ];
  const users: UserRecord[] = [
    {
      id: "user-archivo",
      email: "archivo@estudio.local",
      firstName: "Lara",
      lastName: "Archivo",
      roleId: "role-archivo",
      roleName: "Archivo",
      jobTitle: "Archivo",
      phoneMobile: "",
      phoneWork: "",
      isAdmin: false,
      isActive: true,
      isResponsible: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/admin/roles") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ roles }) };
    }
    if (url.endsWith("/api/admin/users") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ users }) };
    }
    if (url.endsWith("/api/admin/users/user-archivo") && init?.method === "PUT") {
      return { ok: true, json: async () => ({ user: users[0] }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<UsersAdminPage onSaved={() => {}} />);

  expect(await screen.findByText("archivo@estudio.local")).toBeTruthy();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nuevo usuario" }));

  const createDialog = await screen.findByRole("dialog", { name: "Nuevo usuario" });
  const createRoles = Array.from((within(createDialog).getByLabelText("Rol") as HTMLSelectElement).options).map((option) => option.text);
  expect(createRoles).toContain("Administrador");
  expect(createRoles).toContain("Operador");
  expect(createRoles).not.toContain("Archivo");

  await user.click(within(createDialog).getByRole("button", { name: "Cancelar" }));

  await user.click(screen.getByRole("button", { name: "Editar usuario archivo@estudio.local" }));

  const editDialog = await screen.findByRole("dialog", { name: "Editar usuario" });
  const editSelect = within(editDialog).getByLabelText("Rol") as HTMLSelectElement;
  const editRoles = Array.from(editSelect.options).map((option) => option.text);
  expect(editRoles).toContain("Archivo");
  expect(editSelect.value).toBe("role-archivo");
});
