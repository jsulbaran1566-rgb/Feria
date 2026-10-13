import React, { useCallback, useMemo, useRef, useState } from "react";
import Modal from "../components/common/Modal";
import { DialogosContext } from "./dialogosContexto";

// Reemplaza window.confirm / window.alert por modales de la propia aplicación.
export function DialogosProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const resolverRef = useRef(null);

  const cerrar = useCallback((valor) => {
    if (resolverRef.current) {
      resolverRef.current(valor);
      resolverRef.current = null;
    }
    setDialogo(null);
  }, []);

  const confirmar = useCallback(
    (mensaje, opciones = {}) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialogo({
          tipo: "confirmar",
          mensaje,
          titulo: opciones.titulo || "Confirmar acción",
          textoConfirmar: opciones.textoConfirmar || "Aceptar",
          textoCancelar: opciones.textoCancelar || "Cancelar",
        });
      }),
    []
  );

  const avisar = useCallback(
    (mensaje, titulo = "Aviso") =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialogo({ tipo: "aviso", mensaje, titulo, textoConfirmar: "Entendido" });
      }),
    []
  );

  const valor = useMemo(() => ({ confirmar, avisar }), [confirmar, avisar]);

  return (
    <DialogosContext.Provider value={valor}>
      {children}
      <Modal
        isOpen={Boolean(dialogo)}
        onClose={() => cerrar(false)}
        title={dialogo?.titulo || ""}
        maxWidth="440px"
      >
        <p style={{ margin: "0 0 20px", lineHeight: 1.5 }}>{dialogo?.mensaje}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          {dialogo?.tipo === "confirmar" && (
            <button type="button" className="btn-secundario" onClick={() => cerrar(false)}>
              {dialogo.textoCancelar}
            </button>
          )}
          <button type="button" className="btn-verde" onClick={() => cerrar(true)}>
            {dialogo?.textoConfirmar}
          </button>
        </div>
      </Modal>
    </DialogosContext.Provider>
  );
}
