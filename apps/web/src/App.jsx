import { useEffect, useRef } from "react";
import { LoginForm } from "./components/auth/LoginForm.jsx";
import { ModelStatus } from "./components/chat/ModelStatus.jsx";
import { EmptyState } from "./components/chat/EmptyState.jsx";
import { Message } from "./components/chat/Message.jsx";
import { Composer } from "./components/chat/Composer.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useChat } from "./hooks/useChat.js";

export default function App() {
  const { isAuthenticated, user, isAuthLoading, health, login, logout } = useAuth();
  const { messages, draft, setDraft, sending, error, isLoadingHistory, sendMessage, clearMessages } = useChat(isAuthenticated);
  const listRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.lastElementChild?.scrollIntoView();
    }
  }, [messages]);

  function submitOnEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(event);
    }
  }

  if (isAuthLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: "center", color: "var(--signal)" }}>
          <span className="auth-label">Estableciendo conexión...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">A</span>
          <div>
            <p>Deployment challenge</p>
            <h1>Agent Console {user?.username ? `[${user.username}]` : (user?.sub ? `[${user.sub}]` : "")}</h1>
          </div>
        </div>
        <div className="topbar__actions">
          <ModelStatus health={health} />
          <button
            type="button"
            className="reset-button"
            onClick={clearMessages}
            disabled={messages.length === 0 || sending}
          >
            Nueva sesión
          </button>
          <button
            type="button"
            className="reset-button reset-button--danger"
            onClick={logout}
            style={{ borderColor: "var(--alert)", color: "var(--alert)" }}
          >
            Desconectar
          </button>
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
              <dt>Usuario</dt>
              <dd>{user?.username || user?.sub || "Anon"}</dd>
            </div>
          </dl>
        </aside>

        <section className="chat-panel" aria-label="Conversación con el agente">
          <div className="chat-log" aria-live="polite">
            {isLoadingHistory ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando historial...</div>
            ) : messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="chat-history__list" ref={listRef}>
                {messages.map((message, index) => (
                  <Message key={index} message={message} index={index} />
                ))}
              </div>
            )}
            {sending ? (
              <div className="thinking" role="status">
                <span />
                <span />
                <span />
                El agente está procesando
              </div>
            ) : null}
          </div>

          <Composer 
            draft={draft} 
            setDraft={setDraft} 
            sending={sending} 
            submitOnEnter={submitOnEnter} 
            sendMessage={sendMessage} 
            error={error} 
          />
        </section>
      </div>
    </main>
  );
}
