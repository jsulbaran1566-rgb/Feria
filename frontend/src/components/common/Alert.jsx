import React from "react";

export default function Alert({ type = "ok", message, onClose }) {
  if (!message) return null;

  return (
    <div className={`alerta alerta-${type} visible`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", marginLeft: "10px", lineHeight: "1" }}
        >
          &times;
        </button>
      )}
    </div>
  );
}
