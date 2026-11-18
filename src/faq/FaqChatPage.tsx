import { FormEvent, useState } from "react";
import { sendFaqMessage as sendFaqMessageRequest } from "./faqApi";

type Message = { id: string; role: "assistant" | "user"; text: string };

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hola. Soy tu asistente de preguntas frecuentes. Escribí tu consulta y te respondo según la información cargada.",
  },
];

export function FaqChatPage({ sendFaqMessage = sendFaqMessageRequest }: { sendFaqMessage?: typeof sendFaqMessageRequest }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || pending) return;

    setPending(true);
    setError("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: message }]);
    setDraft("");

    try {
      const result = await sendFaqMessage({ message });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: result.reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar el chatbot");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="faq-chat-page">
      <header className="faq-chat-header">
        <p className="eyebrow">ASISTENTE FAQ</p>
        <h1>Chat de preguntas frecuentes</h1>
        <p className="muted">Consultá horarios, trámites, documentación o información institucional desde un solo chat.</p>
      </header>

      <div className="faq-chat-thread" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`faq-chat-bubble faq-chat-bubble-${message.role}`}>
            <span className="faq-chat-role">{message.role === "assistant" ? "Asistente" : "Vos"}</span>
            <p>{message.text}</p>
          </article>
        ))}
        {pending ? <p className="faq-chat-status">Escribiendo…</p> : null}
      </div>

      <form className="faq-chat-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Tu pregunta</span>
          <textarea
            aria-label="Tu pregunta"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ej.: ¿Qué documentación necesito para inscribirme?"
            rows={3}
          />
        </label>
        {error ? <p className="inline-error">{error}</p> : null}
        <div className="faq-chat-actions">
          <button className="primary-button" type="submit" disabled={pending || !draft.trim()}>
            {pending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </form>
    </section>
  );
}
