import { z } from "zod";

// Ejemplo: Esquema para herramienta de consulta de estado/información
export const toolSchemas = {
  get_system_status: z.object({
    service: z.string().min(1, "El nombre del servicio es requerido"),
  }),
};

/**
 * Valida en tiempo de ejecución los argumentos de una herramienta.
 * @param {string} toolName - Nombre de la herramienta solicitada.
 * @param {Object} rawArgs - Argumentos entregados por el LLM (JSON parsed).
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
export function validateToolArgs(toolName, rawArgs) {
  const schema = toolSchemas[toolName];
  if (!schema) {
    return { success: false, error: `Herramienta desconocida: ${toolName}` };
  }
  const result = schema.safeParse(rawArgs);
  if (!result.success) {
    return { 
      success: false, 
      error: `Error de validación de argumentos en '${toolName}': ${result.error.issues.map(i => i.message).join(", ")}` 
    };
  }
  return { success: true, data: result.data };
}
