import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { NombreRol, SesionUsuario, UsuarioSesion } from "../types";

export interface AuthContextValue {
  user: UsuarioSesion | null;
  token: string | null;
  loading: boolean;
  // true si el usuario cerró sesión a propósito (no cuando la sesión vence)
  cerroSesion: boolean;
  isAuthenticated: boolean;
  login: (correo: string, clave: string) => Promise<SesionUsuario>;
  logout: () => Promise<void>;
  hasRole: (roles: NombreRol | NombreRol[]) => boolean;
  setUser: Dispatch<SetStateAction<UsuarioSesion | null>>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider");
  }
  return context;
}
