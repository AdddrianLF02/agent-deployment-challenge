const STATUS_LABELS = {
  checking: "Comprobando",
  offline: "Sin conexión",
  ready: "Modelo conectado",
  unconfigured: "Modelo pendiente",
};

export function ModelStatus({ health }) {
  return (
    <div className={`status status--${health.state}`} role="status">
      <span className="status__dot" aria-hidden="true" />
      <span>{STATUS_LABELS[health.state]}</span>
      {health.modelName ? <strong>{health.modelName}</strong> : null}
    </div>
  );
}
