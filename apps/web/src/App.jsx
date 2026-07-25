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
  const { messages, draft, setDraft, sending, error, sendMessage, clearMessages } = useChat();
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
        <h1>Agent Console {user?.sub ? `[${user.sub}]` : ""}</h1>
        <div className="topbar__actions">
          <ModelStatus health={health} />
          <button
            type="button"
            className="btn-new-session"
            onClick={clearMessages}
            disabled={messages.length === 0 || sending}
          >
            Nueva sesión
          </button>
          <button
            type="button"
            className="btn-new-session"
            onClick={logout}
            style={{ marginLeft: "8px", borderColor: "var(--alert)", color: "var(--alert)" }}
          >
            Desconectar
          </button>
        </div>
      </header>

      <div className="workspace">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="chat-history" aria-label="Historial de mensajes">
            <div className="chat-history__list" ref={listRef}>
              {messages.map((message, index) => (
                <Message key={index} message={message} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Composer 
        draft={draft} 
        setDraft={setDraft} 
        sending={sending} 
        submitOnEnter={submitOnEnter} 
        sendMessage={sendMessage} 
        error={error} 
      />
    </main>
  );
}
