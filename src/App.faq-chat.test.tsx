import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.location.hash = "";
});

function mockFetchWithSession(user: { id: string; email: string } | null = null) {
  vi.stubGlobal("fetch", vi.fn(async (input) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return { ok: true, json: async () => ({ user }) };
    if (url.includes("/api/cases")) return { ok: true, json: async () => ({ cases: [] }) };
    return { ok: true, json: async () => ({}) };
  }));
}

it("shows the public FAQ chat page when the hash route is #/faq", async () => {
  window.location.hash = "#/faq";
  mockFetchWithSession(null);

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Chat de preguntas frecuentes" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ingresar" })).toBeTruthy();
});

it("shows the FAQ chat inside the authenticated shell when the hash route is #/client/faq-chat", async () => {
  window.location.hash = "#/client/faq-chat";
  mockFetchWithSession({ id: "user-1", email: "demo@test.com" });

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Chat de preguntas frecuentes" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Ayuda/i })).toBeTruthy();
});
