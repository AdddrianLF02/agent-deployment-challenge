import { useEffect, useRef, useState } from "react";
import { LoginForm } from "./components/auth/LoginForm.jsx";
import { ModelStatus } from "./components/chat/ModelStatus.jsx";
import { EmptyState } from "./components/chat/EmptyState.jsx";
import { Message } from "./components/chat/Message.jsx";
import { Composer } from "./components/chat/Composer.jsx";

const EMPTY_HEALTH = { state: "checking", modelName: null };
const STORAGE_KEY = "agent-challenge:conversation:v1";
function loadStoredMessages() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];

    return value
      .filter(
        (message) =>
          (message?.role === "user" || message?.role === "assistant") &&
          typeof message?.content === "string" &&
          message.content.trim(),
      )
      .slice(-30)
      .map((message) => ({
        id: typeof message.id === "string" ? message.id : crypto.randomUUID(),
        role: message.role,
        content: message.content,
      }));
  } catch {
    return [];
  }
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo completar la solicitud");
  }
  return payload;
}

function submitOnEnter(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [health, setHealth] = useState(EMPTY_HEALTH);
  const [messages, setMessages] = useState(loadStoredMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        const payload = await readJson(response);
        setHealth({
          state: payload.model?.configured ? "ready" : "unconfigured",
          modelName: payload.model?.name || null,
        });
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setHealth({ state: "offline", modelName: null });
        }
      }
    }

    void checkHealth();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // The conversation still works when storage is unavailable.
    }
  }, [messages]);

  async function sendMessage(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sendingRef.current) return;

    sendingRef.current = true;
    const nextMessages = [
      ...messages.slice(-29),
      { id: crypto.randomUUID(), role: "user", content },
    ];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const payload = await readJson(response);
      setMessages((current) => [
        ...current,
        { ...payload.message, id: crypto.randomUUID() },
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function handleLogin({ username, password }) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error("Invalid credentials");
    setIsAuthenticated(true);
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">A</span>
          <div>
            <p>Deployment challenge</p>
            <h1>Agent Console</h1>
          </div>
        </div>
        <div className="topbar__actions">
          <button
            className="reset-button"
            type="button"
            onClick={() => setMessages([])}
            disabled={sending || messages.length === 0}
          >
            Nueva sesión
          </button>
          <ModelStatus health={health} />
        </div>
      </header>

      <div className="workspace">
        <aside className="context-panel">
          <span className="eyebrow">Entorno / 01</span>
          <h2>Una superficie mínima para una decisión completa.</h2>
          <p>
            Infraestructura, modelo y operación quedan en tus manos. Este panel
            solo confirma que todas las piezas se encuentran.
          </p>
          <dl>
            <div>
              <dt>Interfaz</dt>
              <dd>Activa</dd>
            </div>
            <div>
              <dt>API</dt>
              <dd>{health.state === "offline" ? "No disponible" : "Detectada"}</dd>
            </div>
            <div>
              <dt>Sesión</dt>
              <dd>Local</dd>
            </div>
          </dl>
        </aside>

        <section className="chat-panel" aria-label="Conversación con el agente">
          <div className="chat-log" aria-live="polite">
            {messages.length === 0 ? <EmptyState /> : null}
            {messages.map((message, index) => (
              <Message key={message.id} message={message} index={index} />
            ))}
            {sending ? (
              <div className="thinking" role="status">
                <span />
                <span />
                <span />
                El agente está procesando
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <Composer draft={draft} setDraft={setDraft} sending={sending} submitOnEnter={submitOnEnter} sendMessage={sendMessage} error={error} />
        </section>
      </div>
    </main>
  );
}

