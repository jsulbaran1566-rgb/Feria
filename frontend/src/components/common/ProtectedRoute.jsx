import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContexto";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    // Redirigir al panel correspondiente segun su rol real
    if (user?.rol === "Administrador") return <Navigate to="/admin" replace />;
    if (user?.rol === "Productor") return <Navigate to="/productor" replace />;
    if (user?.rol === "Comprador") return <Navigate to="/comprador" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
