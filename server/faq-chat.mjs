export class FaqChatError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "FaqChatError";
    this.status = status;
  }
}

function firstReadableString(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : "";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstReadableString(item);
      if (found) return found;
    }
    return "";
  }
  if (!value || typeof value !== "object") return "";
  for (const key of ["reply", "answer", "text", "output", "response", "content", "message"]) {
    const found = firstReadableString(value[key]);
    if (found) return found;
  }
  return "";
}

async function readPayload(response) {
  const contentType = String(response.headers?.get?.("content-type") || "");
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  if (!text.trim()) return "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createFaqChatClient(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const configuredWebhookUrl = options.webhookUrl;
  const configuredTimeoutMs = options.requestTimeoutMs;

  return {
    async sendMessage(message) {
      const normalizedMessage = String(message || "").trim();
      if (!normalizedMessage) throw new FaqChatError("Ingresá una consulta", 400);

      const webhookUrl = String(configuredWebhookUrl ?? process.env.N8N_FAQ_WEBHOOK_URL ?? "").trim();
      if (!webhookUrl) throw new FaqChatError("Configuración de n8n incompleta", 500);
      const timeoutMs = Math.max(1, Number(configuredTimeoutMs ?? process.env.N8N_FAQ_TIMEOUT_MS ?? 15000) || 15000);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetchImpl(webhookUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json, text/plain;q=0.9, */*;q=0.8",
          },
          body: JSON.stringify({ message: normalizedMessage }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new FaqChatError("El chatbot tardó demasiado en responder", 504);
        }
        throw new FaqChatError("No se pudo consultar el chatbot", 502);
      } finally {
        clearTimeout(timeoutId);
      }

      const payload = await readPayload(response);
      if (!response.ok) throw new FaqChatError("No se pudo consultar el chatbot", 502);

      const reply = firstReadableString(payload);
      if (!reply) throw new FaqChatError("n8n no devolvió una respuesta legible", 502);

      return { reply };
    },
  };
}
