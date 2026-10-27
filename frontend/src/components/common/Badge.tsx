import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: string;
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
  const map: Record<string, string> = {
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

  const badgeClass = (typeof children === "string" ? map[children] : undefined) || (variant !== "default" ? `badge-${variant}` : "");

  return <span className={`badge ${badgeClass}`.trim()}>{children}</span>;
}
