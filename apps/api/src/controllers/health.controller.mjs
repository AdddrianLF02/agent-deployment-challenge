/**
 * Controlador de la ruta health.
 * 
 * @param {Object} config - Configuración de la aplicación.
 * @returns {Function} Express route handler.
 */
export function getHealth(config) {
  return (request, response) => {
    response.status(200).json({
      status: "ok",
      model: {
        configured: config.modelConfigured,
        name: config.modelConfigured ? config.model.name : null,
      },
    });
  };
}
