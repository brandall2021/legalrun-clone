import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { FaqChatPage } from "./FaqChatPage";

afterEach(() => {
  cleanup();
});

it("sends a message and renders the reply", async () => {
  const sendFaqMessage = vi.fn().mockResolvedValue({ reply: "La inscripción cierra el viernes." });

  render(<FaqChatPage sendFaqMessage={sendFaqMessage} />);

  await userEvent.type(screen.getByLabelText("Tu pregunta"), "¿Cuándo cierra la inscripción?");
  await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

  expect(sendFaqMessage).toHaveBeenCalledWith({ message: "¿Cuándo cierra la inscripción?" });
  expect(await screen.findByText("La inscripción cierra el viernes.")).toBeTruthy();
});

it("keeps the form usable after an error and allows retry", async () => {
  const sendFaqMessage = vi.fn()
    .mockRejectedValueOnce(new Error("No se pudo consultar el chatbot"))
    .mockResolvedValueOnce({ reply: "Podés volver a intentar ahora." });

  render(<FaqChatPage sendFaqMessage={sendFaqMessage} />);

  await userEvent.type(screen.getByLabelText("Tu pregunta"), "Primera consulta");
  await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

  expect(await screen.findByText("No se pudo consultar el chatbot")).toBeTruthy();

  await userEvent.type(screen.getByLabelText("Tu pregunta"), "Segunda consulta");
  await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

  await waitFor(() => expect(screen.queryByText("No se pudo consultar el chatbot")).toBeNull());
  expect(await screen.findByText("Podés volver a intentar ahora.")).toBeTruthy();
});

it("disables submit while a request is pending", async () => {
  let resolveReply: ((value: { reply: string }) => void) | undefined;
  const sendFaqMessage = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveReply = resolve; }));

  render(<FaqChatPage sendFaqMessage={sendFaqMessage} />);

  await userEvent.type(screen.getByLabelText("Tu pregunta"), "Consulta pendiente");
  await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

  expect(screen.getByRole("button", { name: "Enviando..." }).hasAttribute("disabled")).toBe(true);

  resolveReply?.({ reply: "Respuesta final" });
  expect(await screen.findByText("Respuesta final")).toBeTruthy();
});
