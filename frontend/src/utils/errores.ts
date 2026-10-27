// Obtiene un mensaje legible de cualquier valor capturado en un `catch`.
export function mensajeError(err: unknown, porDefecto = "Ocurrió un error inesperado."): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return porDefecto;
}
