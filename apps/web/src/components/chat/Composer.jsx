export function Composer({ draft, setDraft, sending, submitOnEnter, sendMessage, error }) {
  return (
    <form className="composer" onSubmit={sendMessage}>
      {error ? <p className="composer__error">{error}</p> : null}
      <label htmlFor="message">Mensaje</label>
      <div className="composer__row">
        <textarea
          id="message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={submitOnEnter}
          placeholder="Escribe para probar el agente…"
          rows="2"
          maxLength="8000"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !draft.trim()}>
          <span>Enviar</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <small>Enter para enviar · Shift + Enter para una nueva línea</small>
    </form>
  );
}
