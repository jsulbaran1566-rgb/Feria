import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  iniciarSesion as apiLogin,
  cerrarSesion as apiLogout,
  obtenerUsuarioActual,
  EVENTO_SESION_EXPIRADA,
} from "../services/api";
import { AuthContext } from "./authContexto";
import type { AuthContextValue } from "./authContexto";
import type { NombreRol, UsuarioSesion } from "../types";


export function AuthProvider({ children }: { children: ReactNode }) {
  // Sin token no hay sesión: user debe ser null (obtenerUsuarioActual() siempre devuelve un objeto)
  const [user, setUser] = useState<UsuarioSesion | null>(() =>
    sessionStorage.getItem("token") ? obtenerUsuarioActual() : null
  );
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("token"));
  const [loading, setLoading] = useState(false);
  // true cuando el usuario cierra sesión a propósito (no cuando la sesión vence)
  const [cerroSesion, setCerroSesion] = useState(false);

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

  const login = async (correo: string, clave: string) => {
    setLoading(true);
    try {
      const usuarioLogueado = await apiLogin(correo, clave);
      setCerroSesion(false);
      setUser(usuarioLogueado);
      setToken(sessionStorage.getItem("token"));
      return usuarioLogueado;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setCerroSesion(true);
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

  const hasRole = (roles: NombreRol | NombreRol[]): boolean => {
    if (!user || !user.rol) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.rol);
    }
    return user.rol === roles;
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    cerroSesion,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    hasRole,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
