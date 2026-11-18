import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "./App";

const TEMPLATE_MODULE = "/api/modules/client%2Fconfiguracion%2Ftemplate%40v2";

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.location.hash = "";
});

it("renders the dedicated templates page from #/client/configuracion/template", async () => {
  window.location.hash = "#/client/configuracion/template";
  vi.stubGlobal("fetch", vi.fn(async (input) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return { ok: true, json: async () => ({ user: { id: "u1", email: "demo@test.com" } }) };
    if (url.includes("/api/cases")) return { ok: true, json: async () => ({ cases: [] }) };
    if (url.includes(TEMPLATE_MODULE)) {
      return {
        ok: true,
        json: async () => ({
          initialized: true,
          records: [
            {
              id: "template-1",
              values: ["12/03/2025", "Escrito", "Presentación simple", "—"],
              body: "Hola {{claimant}}",
            },
          ],
        }),
      };
    }
    if (url.includes("/api/modules/")) return { ok: true, json: async () => ({ initialized: true, records: [] }) };
    if (url.includes("/api/summary")) return { ok: true, json: async () => ({ recent: [], upcomingAgenda: [], portfolioBreakdown: [] }) };
    return { ok: true, json: async () => ({}) };
  }));

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Plantillas de escritos" })).toBeTruthy();
  expect(screen.getByText("Presentación simple")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Nuevo template" })).toBeTruthy();
});
