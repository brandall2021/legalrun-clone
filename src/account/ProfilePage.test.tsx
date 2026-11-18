import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LocalUser } from "./types";
import { ProfilePage } from "./ProfilePage";

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.location.hash = "";
});

function buildSession(): LocalUser {
  return {
    id: "user-1",
    email: "maria@test.com",
    firstName: "María",
    lastName: "Pérez",
    roleName: "Operador",
    isAdmin: false,
  };
}

it("loads and updates the current user's profile", async () => {
  const session = buildSession();
  const onSessionUpdated = vi.fn();
  const onSaved = vi.fn();
  const saveProfile = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/account/profile") && (!init?.method || init.method === "GET")) {
      return {
        ok: true,
        json: async () => ({
          profile: {
            ...session,
            phoneMobile: "+54 9 11 5555 1111",
            phoneWork: "0341 555 1000",
            jobTitle: "Abogada senior",
          },
        }),
      };
    }
    if (url.includes("/api/account/profile") && init?.method === "PUT") {
      const payload = JSON.parse(String(init.body || "{}"));
      saveProfile(payload);
      return {
        ok: true,
        json: async () => ({
          profile: {
            ...session,
            ...payload,
            roleName: "Operador",
            isAdmin: false,
          },
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<ProfilePage session={session} onSessionUpdated={onSessionUpdated} onSaved={onSaved} />);

  expect(await screen.findByDisplayValue("María")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Cambiar contraseña" }).getAttribute("href")).toBe("#/client/configuracion/security");

  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Nombre"));
  await user.type(screen.getByLabelText("Nombre"), "Ana");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

  expect(saveProfile).toHaveBeenCalledWith({
    firstName: "Ana",
    lastName: "Pérez",
    phoneMobile: "+54 9 11 5555 1111",
    phoneWork: "0341 555 1000",
    jobTitle: "Abogada senior",
  });
  expect(onSessionUpdated).toHaveBeenCalledWith({
    id: "user-1",
    email: "maria@test.com",
    firstName: "Ana",
    lastName: "Pérez",
    roleName: "Operador",
    isAdmin: false,
  });
  expect(onSaved).toHaveBeenCalledWith("Perfil actualizado en la base local");
});

it("keeps the success state after save without reloading the profile on session update", async () => {
  const saveProfile = vi.fn();
  const getProfile = vi.fn();

  function Harness() {
    const [session, setSession] = useState(buildSession());
    return <ProfilePage session={session} onSessionUpdated={setSession} onSaved={() => {}} />;
  }

  vi.stubGlobal("fetch", vi.fn(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/account/profile") && (!init?.method || init.method === "GET")) {
      getProfile();
      return {
        ok: true,
        json: async () => ({
          profile: {
            ...buildSession(),
            phoneMobile: "+54 9 11 5555 1111",
            phoneWork: "0341 555 1000",
            jobTitle: "Abogada senior",
          },
        }),
      };
    }
    if (url.includes("/api/account/profile") && init?.method === "PUT") {
      const payload = JSON.parse(String(init.body || "{}"));
      saveProfile(payload);
      return {
        ok: true,
        json: async () => ({
          profile: {
            ...buildSession(),
            ...payload,
            roleName: "Operador",
            isAdmin: false,
          },
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<Harness />);

  expect(await screen.findByDisplayValue("María")).toBeTruthy();

  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Nombre"));
  await user.type(screen.getByLabelText("Nombre"), "Ana");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

  expect(saveProfile).toHaveBeenCalledWith({
    firstName: "Ana",
    lastName: "Pérez",
    phoneMobile: "+54 9 11 5555 1111",
    phoneWork: "0341 555 1000",
    jobTitle: "Abogada senior",
  });

  const status = await screen.findByRole("status");
  expect(status.textContent).toBe("Perfil actualizado correctamente.");
  await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
  expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana");
});
