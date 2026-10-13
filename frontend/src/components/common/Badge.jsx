import React from "react";

export default function Badge({ children, variant = "default" }) {
  const map = {
    Activo: "badge-verde",
    Completada: "badge-verde",
    Pagada: "badge-verde",
    Confirmada: "badge-verde",
    Resuelto: "badge-verde",
    Disponible: "badge-verde",
    Aprobado: "badge-verde",
    Entregada: "badge-verde",
    Calificada: "badge-verde",
    Inactivo: "badge-rojo",
    Cancelada: "badge-rojo",
    Rechazado: "badge-rojo",
    Pendiente: "badge-amarillo",
    "En proceso": "badge-amarillo",
    "En camino": "badge-azul",
    "En tránsito": "badge-azul",
  };

  const badgeClass = map[children] || (variant !== "default" ? `badge-${variant}` : "");

  return <span className={`badge ${badgeClass}`.trim()}>{children}</span>;
}
