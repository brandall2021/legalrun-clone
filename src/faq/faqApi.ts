export type FaqChatReply = { reply: string };

export async function sendFaqMessage(input: { message: string }): Promise<FaqChatReply> {
  const response = await fetch("/api/faq/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error || "No se pudo consultar el chatbot"));

  return { reply: String(payload?.reply || "") };
}
