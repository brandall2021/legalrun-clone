import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { LocalUser } from "./account/types";
import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.location.hash = "";
});

function buildUser(isAdmin: boolean): LocalUser {
  return {
    id: isAdmin ? "admin-1" : "user-1",
    email: isAdmin ? "admin@test.com" : "usuario@test.com",
    firstName: isAdmin ? "Ada" : "Julia",
    lastName: isAdmin ? "Admin" : "Operadora",
    roleName: isAdmin ? "Administrador" : "Operador",
    isAdmin,
  };
}

function mockFetchWithSession(user: LocalUser) {
  vi.stubGlobal("fetch", vi.fn(async (input) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return { ok: true, json: async () => ({ user }) };
    if (url.includes("/api/cases")) return { ok: true, json: async () => ({ cases: [] }) };
    if (url.includes("/api/modules/")) return { ok: true, json: async () => ({ initialized: false, records: [] }) };
    return { ok: true, json: async () => ({}) };
  }));
}

function fetchCalls() {
  return vi.mocked(fetch).mock.calls.map(([input]) => String(input));
}

it("hides estudio admin navigation for non-admin users", async () => {
  window.location.hash = "#/client/home_estudio_juridico";
  mockFetchWithSession(buildUser(false));

  render(<App />);

  await screen.findByText("Cambiar contraseña");
  expect(screen.queryByText("Usuarios")).toBeNull();
  expect(screen.queryByText("Roles")).toBeNull();
  expect(screen.queryByText("Credenciales")).toBeNull();
  expect(screen.queryByText("Token SCBA")).toBeNull();
});

it("shows estudio admin navigation for admin users", async () => {
  window.location.hash = "#/client/home_estudio_juridico";
  mockFetchWithSession(buildUser(true));

  render(<App />);

  expect(await screen.findByText("Usuarios")).toBeTruthy();
  expect(screen.getByText("Roles")).toBeTruthy();
  expect(screen.getByText("Credenciales")).toBeTruthy();
  expect(screen.getByText("Token SCBA")).toBeTruthy();
});

it("redirects non-admin users away from studio admin hashes", async () => {
  window.location.hash = "#/client/configuracion/roles";
  mockFetchWithSession(buildUser(false));

  render(<App />);

  expect(screen.queryByRole("heading", { name: "Roles" })).toBeNull();
  expect(await screen.findByRole("heading", { name: "Perfil" })).toBeTruthy();
  expect(window.location.hash).toBe("#/client/configuracion/profile");
});

it("does not mount protected admin module pages for non-admin direct hashes", async () => {
  window.location.hash = "#/client/configuracion/usersAbogado";
  mockFetchWithSession(buildUser(false));

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Perfil" })).toBeTruthy();
  expect(fetchCalls().some((url) => url.includes("/api/modules/client%2Fconfiguracion%2FusersAbogado%40v2"))).toBe(false);
});

it("mounts the credentials admin page for the exact credentials hash", async () => {
  window.location.hash = "#/client/configuracion/credentials";
  mockFetchWithSession(buildUser(true));

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Credenciales" })).toBeTruthy();
  expect(screen.getByText("No hay credenciales cargadas todavía.")).toBeTruthy();
  expect(fetchCalls().some((url) => url.includes("/api/admin/credentials"))).toBe(true);
});

it("mounts the SCBA tokens admin page for the exact scba-tokens hash", async () => {
  window.location.hash = "#/client/configuracion/scba-tokens";
  mockFetchWithSession(buildUser(true));

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Tokens SCBA" })).toBeTruthy();
  expect(screen.getByText("No hay tokens SCBA cargados todavía.")).toBeTruthy();
  expect(fetchCalls().some((url) => url.includes("/api/admin/scba-tokens"))).toBe(true);
});
