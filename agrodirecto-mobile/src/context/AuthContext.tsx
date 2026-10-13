import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TOKEN_KEY,
  USER_KEY,
  Usuario,
  iniciarSesion as apiIniciarSesion,
  cerrarSesion as apiCerrarSesion,
} from '../services/api';
import { initApiUrl } from '../services/config';

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (correo: string, clave: string) => Promise<Usuario>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Usuario) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const cargarSesion = async () => {
      try {
        await initApiUrl();
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.warn('Error al restaurar sesión móvil:', e);
      } finally {
        setLoading(false);
      }
    };

    cargarSesion();
  }, []);

  const login = async (correo: string, clave: string): Promise<Usuario> => {
    const usuario = await apiIniciarSesion(correo, clave);
    const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
    setToken(savedToken);
    setUser(usuario);
    return usuario;
  };

  const logout = async (): Promise<void> => {
    await apiCerrarSesion();
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updatedUser: Usuario): Promise<void> => {
    setUser(updatedUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
