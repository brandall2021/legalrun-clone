import { describe, expect, it, vi } from "vitest";
import { createFaqChatClient } from "./faq-chat.mjs";

describe("createFaqChatClient", () => {
  it("rejects empty messages before calling n8n", async () => {
    const fetchImpl = vi.fn();
    const client = createFaqChatClient({ webhookUrl: "https://example.test/webhook", fetchImpl });

    await expect(client.sendMessage("   ")).rejects.toThrow("Ingresá una consulta");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps an n8n JSON answer to reply", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reply: "Horario de 8 a 18" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createFaqChatClient({ webhookUrl: "https://example.test/webhook", fetchImpl });

    await expect(client.sendMessage("¿Cuál es el horario?")).resolves.toEqual({ reply: "Horario de 8 a 18" });
  });

  it("accepts alternative payload shapes", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ answer: "Atención de lunes a viernes" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createFaqChatClient({ webhookUrl: "https://example.test/webhook", fetchImpl });

    await expect(client.sendMessage("¿Cuándo atienden?")).resolves.toEqual({ reply: "Atención de lunes a viernes" });
  });

  it("fails clearly when n8n returns unreadable content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createFaqChatClient({ webhookUrl: "https://example.test/webhook", fetchImpl });

    await expect(client.sendMessage("hola")).rejects.toThrow("n8n no devolvió una respuesta legible");
  });

  it("times out stalled upstream requests", async () => {
    const fetchImpl = vi.fn((_, init) => new Promise((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    const client = createFaqChatClient({ webhookUrl: "https://example.test/webhook", fetchImpl, requestTimeoutMs: 5 });

    await expect(client.sendMessage("hola")).rejects.toThrow("El chatbot tardó demasiado en responder");
  });

  it("fails clearly when the webhook URL is missing", async () => {
    const client = createFaqChatClient({ fetchImpl: vi.fn() });

    await expect(client.sendMessage("hola")).rejects.toThrow("Configuración de n8n incompleta");
  });
});
