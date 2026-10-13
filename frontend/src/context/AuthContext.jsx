import React, { useState, useEffect } from "react";
import {
  iniciarSesion as apiLogin,
  cerrarSesion as apiLogout,
  obtenerUsuarioActual,
  EVENTO_SESION_EXPIRADA,
} from "../services/api";
import { AuthContext } from "./authContexto";


export function AuthProvider({ children }) {
  // Sin token no hay sesión: user debe ser null (obtenerUsuarioActual() siempre devuelve un objeto)
  const [user, setUser] = useState(() =>
    sessionStorage.getItem("token") ? obtenerUsuarioActual() : null
  );
  const [token, setToken] = useState(() => sessionStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sincronizar si cambia sessionStorage
    const storedUser = obtenerUsuarioActual();
    const storedToken = sessionStorage.getItem("token");
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    // El backend respondió 401 con una sesión guardada: cerrar sesión en React
    const alExpirar = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, []);

  const login = async (correo, clave) => {
    setLoading(true);
    try {
      const usuarioLogueado = await apiLogin(correo, clave);
      setUser(usuarioLogueado);
      setToken(sessionStorage.getItem("token"));
      return usuarioLogueado;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignorar error al cerrar sesion en el backend
    } finally {
      sessionStorage.clear();
      setUser(null);
      setToken(null);
    }
  };

  const hasRole = (roles) => {
    if (!user || !user.rol) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.rol);
    }
    return user.rol === roles;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    hasRole,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
