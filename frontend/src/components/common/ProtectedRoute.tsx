import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContexto";
import type { NombreRol } from "../../types";

interface ProtectedRouteProps {
  allowedRoles?: NombreRol[];
  children: ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated, hasRole, cerroSesion } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Si el usuario cerró sesión a propósito no se recuerda la página:
    // quien entre después (quizá con otra cuenta) debe ir a su propio panel.
    return (
      <Navigate
        to="/login"
        state={cerroSesion ? undefined : { from: location }}
        replace
      />
    );
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    // Redirigir al panel correspondiente segun su rol real
    if (user?.rol === "Administrador") return <Navigate to="/admin" replace />;
    if (user?.rol === "Productor") return <Navigate to="/productor" replace />;
    if (user?.rol === "Comprador") return <Navigate to="/comprador" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
