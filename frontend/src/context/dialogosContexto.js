import { createContext, useContext } from "react";

export const DialogosContext = createContext(null);

// confirmar(mensaje, { titulo, textoConfirmar, textoCancelar }) -> Promise<boolean>
// avisar(mensaje, titulo?)                                      -> Promise<void>
export function useDialogos() {
  const contexto = useContext(DialogosContext);
  if (!contexto) {
    throw new Error("useDialogos debe utilizarse dentro de un DialogosProvider");
  }
  return contexto;
}
