# FAQ Web Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a web FAQ chat page to the existing React/Vite app and connect it to n8n through a local backend proxy.

**Architecture:** Keep the current app as the only frontend shell, add a focused FAQ chat page, and route all chat requests through a new backend helper plus `POST /api/faq/chat`. The backend owns n8n configuration and response normalization so the UI only sends a message and renders the returned answer.

**Tech Stack:** React 19, TypeScript, Vite 6, Node HTTP server, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-11-16-faq-web-chatbot-design.md`

## Global Constraints

- Reuse the existing React/Vite app as the chatbot container.
- Do not expose the n8n webhook URL directly in browser code.
- Keep document upload and knowledge-base management out of the public web UI.
- Use environment configuration for the n8n endpoint.
- Keep naming, copy, and styling consistent with the existing Spanish-language UI.

## Review Focus

- Missing n8n configuration should show a controlled backend error instead of hanging or crashing the UI.
- Blank or whitespace-only messages should never trigger a backend request.
- Unexpected n8n payload shapes should still produce either a readable answer or a clear fallback error.
- Slow or failed backend responses should leave the chat usable for the next message.
- The added route and CTA should not break existing navigation or build output.

---

### Task 1: Add the backend FAQ proxy and its contract

**Files:**
- Create: `server/faq-chat.mjs`
- Create: `server/faq-chat.test.mjs`
- Modify: `server/index.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `fetch`, `process.env.N8N_FAQ_WEBHOOK_URL`
- Produces: `createFaqChatClient(options?: { webhookUrl?: string; fetchImpl?: typeof fetch }): { sendMessage(message: string): Promise<{ reply: string }> }`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it, vi } from "vitest";
import { createFaqChatClient } from "./faq-chat.mjs";

describe("createFaqChatClient", () => {
  it("rejects empty messages before calling n8n", async () => {
    const client = createFaqChatClient({ webhookUrl: "https://example.test/webhook", fetchImpl: vi.fn() });
    await expect(client.sendMessage("   ")).rejects.toThrow("Ingresá una consulta");
  });

  it("maps an n8n JSON answer to { reply }", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ reply: "Horario de 8 a 18" }), { status: 200 }));
    const client = createFaqChatClient({ webhookUrl: "https://example.test/webhook", fetchImpl });
    await expect(client.sendMessage("¿Cuál es el horario?")).resolves.toEqual({ reply: "Horario de 8 a 18" });
  });

  it("fails clearly when the webhook URL is missing", async () => {
    const client = createFaqChatClient({ fetchImpl: vi.fn() });
    await expect(client.sendMessage("hola")).rejects.toThrow("Configuración de n8n incompleta");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- server/faq-chat.test.mjs`  
Expected: FAIL because `server/faq-chat.mjs` and/or `test` script do not exist yet.

- [ ] **Step 3: Implement `createFaqChatClient(...)` in `server/faq-chat.mjs` and wire `POST /api/faq/chat` in `server/index.mjs`**

Use a small helper that:
- trims and validates the message,
- reads `N8N_FAQ_WEBHOOK_URL`,
- `POST`s `{ message }` as JSON to n8n,
- accepts reply fields in this order: `reply`, `answer`, `text`, first string item from an array,
- throws a user-safe error when n8n responds without readable content.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- server/faq-chat.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json server/index.mjs server/faq-chat.mjs server/faq-chat.test.mjs
git commit -m "feat: add faq chat backend proxy"
```

### Task 2: Build the FAQ chat page UI with TDD

**Files:**
- Create: `src/faq/FaqChatPage.tsx`
- Create: `src/faq/FaqChatPage.test.tsx`
- Create: `src/faq/faqApi.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `POST /api/faq/chat` returning `{ reply: string }`
- Produces: `FaqChatPage(): JSX.Element`
- Produces: `sendFaqMessage(input: { message: string }): Promise<{ reply: string }>`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { FaqChatPage } from "./FaqChatPage";

it("sends a message and renders the reply", async () => {
  const sendFaqMessage = vi.fn().mockResolvedValue({ reply: "La inscripción cierra el viernes." });
  render(<FaqChatPage sendFaqMessage={sendFaqMessage} />);

  await userEvent.type(screen.getByLabelText("Tu pregunta"), "¿Cuándo cierra la inscripción?");
  await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

  expect(sendFaqMessage).toHaveBeenCalledWith({ message: "¿Cuándo cierra la inscripción?" });
  expect(await screen.findByText("La inscripción cierra el viernes.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/faq/FaqChatPage.test.tsx`  
Expected: FAIL because the component and test tooling are not complete yet.

- [ ] **Step 3: Implement `FaqChatPage` and `sendFaqMessage`**

Implement a focused chat page with:
- fixed welcome copy in Spanish,
- local message history for the current tab,
- disabled submit while sending,
- visible error state when the backend rejects,
- dependency injection prop `sendFaqMessage?: typeof sendFaqMessage` so the component stays easy to test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/faq/FaqChatPage.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts src/faq/FaqChatPage.tsx src/faq/FaqChatPage.test.tsx src/faq/faqApi.ts
git commit -m "feat: add faq chat page"
```

### Task 3: Integrate the page into the app shell and styling

**Files:**
- Create: `src/App.faq-chat.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `FaqChatPage(): JSX.Element`
- Produces: new hash route `#/client/faq-chat`
- Produces: top-level CTA that navigates to `#/client/faq-chat`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

it("shows the FAQ chat page when the hash route is #/client/faq-chat", async () => {
  window.location.hash = "#/client/faq-chat";
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Chat de preguntas frecuentes" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.faq-chat.test.tsx`  
Expected: FAIL because the route is not registered yet.

- [ ] **Step 3: Implement the route and shell integration**

Add:
- one navigation entry or CTA that opens the FAQ chat page,
- a route branch in `src/App.tsx`,
- scoped styles in `src/styles.css` for the chat layout, message bubbles, composer, loading, and error states.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/App.faq-chat.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/styles.css src/App.faq-chat.test.tsx
git commit -m "feat: integrate faq chat into app shell"
```

### Task 4: Document configuration and verify the full flow

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `N8N_FAQ_WEBHOOK_URL`
- Produces: operator-facing setup notes for local use

- [ ] **Step 1: Write the failing verification target**

Add a checklist scenario to `README.md` that is only satisfied when:
- the env var is documented,
- tests run locally,
- build passes,
- the chat route can be opened and used with a real n8n webhook.

- [ ] **Step 2: Run verification before documentation is updated**

Run: `npm run build`  
Expected: PASS after Tasks 1-3 are complete and before the final delivery handoff.

- [ ] **Step 3: Document setup and usage**

Document:
- required env var `N8N_FAQ_WEBHOOK_URL`,
- where to set it for local runs,
- that n8n owns documents/knowledge,
- that the public web UI only sends questions and renders answers.

- [ ] **Step 4: Run the full verification suite**

Run: `npm run test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add faq chat setup"
```
