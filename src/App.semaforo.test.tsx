import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.location.hash = "";
});

it("renders the dedicated Semáforo page from #/client/semaforo", async () => {
  window.location.hash = "#/client/semaforo";
  vi.stubGlobal("fetch", vi.fn(async (input) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return { ok: true, json: async () => ({ user: { id: "u1", email: "demo@test.com" } }) };
    if (url.includes("/api/cases")) return { ok: true, json: async () => ({ cases: [] }) };
    if (url.includes("/api/dashboards/activity")) return { ok: true, json: async () => ({ items: [{ id: "c1", number: "1842/2025", title: "Caso demo", state: "En trámite", jurisdiction: "Capital", amount: "$ 150.000,00", lastMovement: "Escrito", lastMovementDate: "2026-11-01", daysWithoutMovement: 75, priority: "Alta" }] }) };
    return { ok: true, json: async () => ({}) };
  }));

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Semáforo" })).toBeTruthy();
  expect(screen.getAllByText("Alta").length).toBeGreaterThan(0);
  expect(screen.getByText("1842/2025")).toBeTruthy();
});

it("navigates to Semáforo from the dashboard menu", async () => {
  window.location.hash = "#/client/home_estudio_juridico";
  vi.stubGlobal("fetch", vi.fn(async (input) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return { ok: true, json: async () => ({ user: { id: "u1", email: "demo@test.com" } }) };
    if (url.includes("/api/cases")) return { ok: true, json: async () => ({ cases: [] }) };
    if (url.includes("/api/dashboards/activity")) return { ok: true, json: async () => ({ items: [{ id: "c1", number: "1842/2025", title: "Caso demo", state: "En trámite", jurisdiction: "Capital", amount: "$ 150.000,00", lastMovement: "Escrito", lastMovementDate: "2026-11-01", daysWithoutMovement: 75, priority: "Alta" }] }) };
    if (url.includes("/api/summary")) return { ok: true, json: async () => ({ recent: [], upcomingAgenda: [], portfolioBreakdown: [] }) };
    return { ok: true, json: async () => ({}) };
  }));

  render(<App />);

  fireEvent.click(await screen.findByText("Semáforo"));

  expect(await screen.findByRole("heading", { name: "Semáforo" })).toBeTruthy();
  expect(window.location.hash).toBe("#/client/semaforo");
});
