import { createContext, useContext } from "react";

export interface OpcionesConfirmar {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
}

export interface DialogosContextValue {
  confirmar: (mensaje: string, opciones?: OpcionesConfirmar) => Promise<boolean>;
  avisar: (mensaje: string, titulo?: string) => Promise<void>;
}

export const DialogosContext = createContext<DialogosContextValue | null>(null);

// confirmar(mensaje, { titulo, textoConfirmar, textoCancelar }) -> Promise<boolean>
// avisar(mensaje, titulo?)                                      -> Promise<void>
export function useDialogos(): DialogosContextValue {
  const contexto = useContext(DialogosContext);
  if (!contexto) {
    throw new Error("useDialogos debe utilizarse dentro de un DialogosProvider");
  }
  return contexto;
}
