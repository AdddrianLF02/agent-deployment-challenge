export function EmptyState() {
  return (
    <section className="empty-state">
      <span className="empty-state__index">01 / READY</span>
      <h2>El canal está abierto.</h2>
      <p>
        Escribe un mensaje para comprobar la conexión entre esta interfaz y el
        modelo configurado.
      </p>
      <div className="signal" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
