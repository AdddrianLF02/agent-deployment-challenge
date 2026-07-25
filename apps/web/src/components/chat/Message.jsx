export function Message({ message, index }) {
  const actor = message.role === "user" ? "Tú" : "Agente";

  return (
    <article className={`message message--${message.role}`}>
      <header>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <strong>{actor}</strong>
      </header>
      <p>{message.content}</p>
    </article>
  );
}
