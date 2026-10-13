// ============================================================
// api.ts — Conector React Native / TypeScript con FastAPI
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './config';

export const TOKEN_KEY = '@agrodirecto_token';
export const USER_KEY = '@agrodirecto_user';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: 'Administrador' | 'Productor' | 'Comprador' | string;
  telefono?: string;
  ciudad?: string;
  estado?: string;
  nombre_finca?: string;
  cultivos_principales?: string;
  descripcion?: string;
  latitud?: number;
  longitud?: number;
  tipo_documento_id?: number;
  numero_documento?: string;
}

export interface PeticionOpciones extends RequestInit {
  headers?: Record<string, string>;
}

// ============================================================
// FUNCIÓN BASE
// ============================================================

export async function peticion<T = any>(ruta: string, opciones: PeticionOpciones = {}): Promise<T> {
  const encabezados: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opciones.headers || {}),
  };

  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    // Ignorar
  }

  if (token) {
    encabezados['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiUrl();
  let respuesta: Response;

  try {
    respuesta = await fetch(`${baseUrl}${ruta}`, {
      ...opciones,
      headers: encabezados,
    });
  } catch (error: any) {
    throw new Error(
      `No se pudo conectar con el servidor en ${baseUrl}. ` +
      `Verifica que FastAPI esté ejecutándose y que tu dispositivo y PC compartan la misma red WiFi.`
    );
  }

  let cuerpo: any;
  try {
    cuerpo = await respuesta.json();
  } catch {
    throw new Error(
      `El backend respondió con un formato inválido (HTTP ${respuesta.status}).`
    );
  }

  // PAGO RECHAZADO (HTTP 402)
  if (respuesta.status === 402 && cuerpo && cuerpo.error === 'PagoRechazado') {
    const errorPago: any = new Error(cuerpo.message || 'El pago fue rechazado.');
    errorPago.status = 402;
    errorPago.codigo = 'PagoRechazado';
    errorPago.data = cuerpo.data || null;
    throw errorPago;
  }

  // ERRORES GENERALES
  if (!respuesta.ok || !cuerpo.success) {
    const error: any = new Error(
      cuerpo.message ||
      cuerpo.error ||
      cuerpo.detail ||
      `Error HTTP ${respuesta.status}`
    );
    error.status = respuesta.status;
    error.codigo = cuerpo.error || null;
    error.data = cuerpo.data || null;
    throw error;
  }

  return cuerpo.data;
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

export async function iniciarSesion(correo: string, clave: string): Promise<Usuario> {
  const datos = await peticion<{ token: string; usuario: Usuario }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, clave }),
  });

  await AsyncStorage.setItem(TOKEN_KEY, datos.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(datos.usuario));

  return datos.usuario;
}

export async function solicitarRecuperacionClave(correo: string): Promise<any> {
  return peticion('/auth/recuperar-clave', {
    method: 'POST',
    body: JSON.stringify({ correo }),
  });
}

export async function restablecerClave(token: string, claveNueva: string): Promise<any> {
  return peticion('/auth/restablecer-clave', {
    method: 'POST',
    body: JSON.stringify({
      token,
      clave_nueva: claveNueva,
    }),
  });
}

export async function cerrarSesion(): Promise<void> {
  try {
    await peticion('/auth/logout', { method: 'POST' });
  } catch {
    // Ignorar si el backend ya cerró
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

// ============================================================
// USUARIOS
// ============================================================

export async function obtenerUsuarios(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/usuarios${params ? '?' + params : ''}`);
}

export async function registrarUsuario(usuario: any): Promise<any> {
  return peticion('/usuarios', {
    method: 'POST',
    body: JSON.stringify(usuario),
  });
}

export async function editarUsuarioApi(id: number, cambios: any): Promise<any> {
  return peticion(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
}

export async function eliminarUsuarioApi(id: number): Promise<any> {
  return peticion(`/usuarios/${id}?confirmar=true`, {
    method: 'DELETE',
  });
}

// ============================================================
// LOTES
// ============================================================

export async function obtenerLotes(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/lotes${params ? '?' + params : ''}`);
}

export async function registrarLote(lote: any): Promise<any> {
  return peticion('/lotes', {
    method: 'POST',
    body: JSON.stringify(lote),
  });
}

export async function editarLoteApi(id: number, cambios: any): Promise<any> {
  return peticion(`/lotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
}

export async function actualizarEstadoCultivo(id: number, estadoCultivo: string): Promise<any> {
  return peticion(`/lotes/${id}/estado-cultivo`, {
    method: 'PUT',
    body: JSON.stringify({ estado_cultivo: estadoCultivo }),
  });
}

export async function obtenerHistorialLote(id: number): Promise<any[]> {
  return peticion(`/lotes/${id}/historial`);
}

export async function eliminarLoteApi(id: number): Promise<any> {
  return peticion(`/lotes/${id}?confirmar=true`, {
    method: 'DELETE',
  });
}

// ============================================================
// ROLES
// ============================================================

export async function obtenerRoles(): Promise<any[]> {
  return peticion('/roles');
}

export async function registrarRol(rol: any): Promise<any> {
  return peticion('/roles', {
    method: 'POST',
    body: JSON.stringify(rol),
  });
}

export async function editarRolApi(id: number, cambios: any): Promise<any> {
  return peticion(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
}

export async function eliminarRolApi(id: number): Promise<any> {
  return peticion(`/roles/${id}?confirmar=true`, {
    method: 'DELETE',
  });
}

// ============================================================
// RESERVAS
// ============================================================

export async function obtenerReservas(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/reservas${params ? '?' + params : ''}`);
}

export async function crearReserva(reserva: any): Promise<any> {
  return peticion('/reservas', {
    method: 'POST',
    body: JSON.stringify(reserva),
  });
}

export async function editarEstadoReserva(id: number, cambios: any): Promise<any> {
  return peticion(`/reservas/${id}/estado`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
}

export async function eliminarReservaApi(id: number): Promise<any> {
  return peticion(`/reservas/${id}?confirmar=true`, {
    method: 'DELETE',
  });
}

// ============================================================
// CATEGORÍAS
// ============================================================

export async function obtenerCategorias(): Promise<any[]> {
  return peticion('/categorias');
}

export async function obtenerLotesPorCategoria(nombre: string, filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(
    `/categorias/${encodeURIComponent(nombre)}/lotes${params ? '?' + params : ''}`
  );
}

export async function registrarCategoria(categoria: any): Promise<any> {
  return peticion('/categorias', {
    method: 'POST',
    body: JSON.stringify(categoria),
  });
}

export async function editarCategoriaApi(nombre: string, cambios: any): Promise<any> {
  return peticion(`/categorias/${encodeURIComponent(nombre)}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
}

export async function eliminarCategoriaApi(nombre: string): Promise<any> {
  return peticion(`/categorias/${encodeURIComponent(nombre)}`, {
    method: 'DELETE',
  });
}

// ============================================================
// TIPOS DE DOCUMENTO
// ============================================================

export async function obtenerTiposDocumento(): Promise<any[]> {
  return peticion('/tipos_documento');
}

// ============================================================
// HISTORIALES
// ============================================================

export async function obtenerHistorialSeguimiento(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/historial_seguimiento${params ? '?' + params : ''}`);
}

export async function obtenerHistorialReservas(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/historial_reservas${params ? '?' + params : ''}`);
}

// ============================================================
// COMPRAS Y VENTAS
// ============================================================

export async function obtenerCompras(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/compras${params ? '?' + params : ''}`);
}

export async function obtenerVentas(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/ventas${params ? '?' + params : ''}`);
}

// ============================================================
// PROVEEDORES
// ============================================================

export async function obtenerProveedores(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/proveedores${params ? '?' + params : ''}`);
}

export async function obtenerProveedorPorId(id: number): Promise<any> {
  return peticion(`/proveedores/${id}`);
}

export async function registrarProveedor(proveedor: any): Promise<any> {
  return peticion('/proveedores', {
    method: 'POST',
    body: JSON.stringify(proveedor),
  });
}

export async function editarProveedorApi(id: number, cambios: any): Promise<any> {
  return peticion(`/proveedores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
}

export async function eliminarProveedorApi(id: number): Promise<any> {
  return peticion(`/proveedores/${id}?confirmar=true`, {
    method: 'DELETE',
  });
}

// ============================================================
// FAVORITOS
// ============================================================

export async function obtenerFavoritos(compradorId: number): Promise<any[]> {
  return peticion(`/favoritos?comprador_id=${encodeURIComponent(compradorId)}`);
}

export async function agregarFavorito(compradorId: number, productorId: number): Promise<any> {
  return peticion('/favoritos', {
    method: 'POST',
    body: JSON.stringify({
      comprador_id: compradorId,
      productor_id: productorId,
    }),
  });
}

export async function eliminarFavoritoApi(compradorId: number, productorId: number): Promise<any> {
  return peticion(`/favoritos/${compradorId}/${productorId}?confirmar=true`, {
    method: 'DELETE',
  });
}

// ============================================================
// SOPORTE
// ============================================================

export async function enviarSoporte(datos: any): Promise<any> {
  return peticion('/soporte', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function obtenerTicketsSoporte(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/soporte${params ? '?' + params : ''}`);
}

export async function actualizarEstadoSoporte(id: number, estado: string): Promise<any> {
  return peticion(`/soporte/${id}/estado`, {
    method: 'PUT',
    body: JSON.stringify({ estado }),
  });
}

export async function eliminarTicketSoporte(id: number): Promise<any> {
  return peticion(`/soporte/${id}?confirmar=true`, {
    method: 'DELETE',
  });
}

// ============================================================
// PAGOS
// ============================================================

export async function crearPago(datos: {
  reserva_id: number;
  metodo?: string;
  monto?: number;
  resultado_simulado?: string;
}): Promise<any> {
  if (!datos || !datos.reserva_id) {
    throw new Error('El reserva_id es obligatorio para crear el pago.');
  }

  const payload: any = {
    reserva_id: Number(datos.reserva_id),
    metodo: datos.metodo || 'Simulado - Tarjeta',
  };

  if (datos.monto !== undefined && datos.monto !== null) {
    payload.monto = Number(datos.monto);
  }

  if (datos.resultado_simulado !== undefined && datos.resultado_simulado !== null) {
    payload.resultado_simulado = datos.resultado_simulado;
  }

  return peticion('/pagos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function obtenerPagos(reservaId: number): Promise<any> {
  if (!reservaId) {
    throw new Error('El reserva_id es obligatorio.');
  }
  return peticion(`/pagos?reserva_id=${encodeURIComponent(reservaId)}`);
}

export async function simularPagoAprobado(reservaId: number, monto: number | null = null, metodo = 'Simulado - Tarjeta') {
  const datos: any = {
    reserva_id: Number(reservaId),
    metodo,
    resultado_simulado: 'aprobado',
  };
  if (monto !== null && monto !== undefined) {
    datos.monto = Number(monto);
  }
  return crearPago(datos);
}

export async function simularPagoFallido(reservaId: number, monto: number | null = null, metodo = 'Simulado - Tarjeta') {
  const datos: any = {
    reserva_id: Number(reservaId),
    metodo,
    resultado_simulado: 'fallido',
  };
  if (monto !== null && monto !== undefined) {
    datos.monto = Number(monto);
  }
  return crearPago(datos);
}

// ============================================================
// ENTREGAS
// ============================================================

export async function crearEntrega(datos: any): Promise<any> {
  return peticion('/entregas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function actualizarUbicacionEntrega(entregaId: number, latitud: number, longitud: number): Promise<any> {
  return peticion(`/entregas/${entregaId}/ubicacion`, {
    method: 'PUT',
    body: JSON.stringify({ latitud, longitud }),
  });
}

export async function actualizarEntrega(id: number, cambios: any): Promise<any> {
  return peticion(`/entregas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
}

export async function obtenerEntregas(reservaId: number): Promise<any[]> {
  return peticion(`/entregas?reserva_id=${reservaId}`);
}

// ============================================================
// CALIFICACIONES
// ============================================================

export async function crearCalificacion(datos: any): Promise<any> {
  return peticion('/calificaciones', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function obtenerCalificaciones(productorId: number): Promise<any> {
  return peticion(`/calificaciones?productor_id=${productorId}`);
}

// ============================================================
// DISPUTAS
// ============================================================

export async function crearDisputa(datos: any): Promise<any> {
  return peticion('/disputas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function obtenerDisputas(filtros: Record<string, any> = {}): Promise<any[]> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/disputas${params ? '?' + params : ''}`);
}

export async function actualizarDisputa(id: number, cambios: any): Promise<any> {
  return peticion(`/disputas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
}

// ============================================================
// REPORTES
// ============================================================

export async function obtenerReporteProductor(productorId: number | null = null): Promise<any> {
  const params = productorId ? `?productor_id=${productorId}` : '';
  return peticion(`/reportes/productor${params}`);
}

export async function obtenerReporteComprador(compradorId: number | null = null): Promise<any> {
  const params = compradorId ? `?comprador_id=${compradorId}` : '';
  return peticion(`/reportes/comprador${params}`);
}

export async function obtenerReporteAdmin(filtros: Record<string, any> = {}): Promise<any> {
  const params = new URLSearchParams(filtros).toString();
  return peticion(`/reportes/admin${params ? '?' + params : ''}`);
}

// ============================================================
// PERFIL PÚBLICO PRODUCTOR
// ============================================================

export async function obtenerPerfilPublico(usuarioId: number): Promise<any> {
  return peticion(`/usuarios/${usuarioId}/perfil-publico`);
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

export async function obtenerComision(): Promise<{ comision_pct: number }> {
  return peticion('/configuracion/comision');
}

export async function actualizarComision(comisionPct: number): Promise<any> {
  return peticion('/configuracion/comision', {
    method: 'PUT',
    body: JSON.stringify({ comision_pct: comisionPct }),
  });
}

// ============================================================
// NOTIFICACIONES
// ============================================================

export async function obtenerNotificaciones(): Promise<any> {
  return peticion('/notificaciones');
}

export async function marcarNotificacionLeida(id: number): Promise<any> {
  return peticion(`/notificaciones/${id}/leer`, {
    method: 'PUT',
  });
}

export async function marcarTodasNotificacionesLeidas(): Promise<any> {
  return peticion('/notificaciones/leer-todas', {
    method: 'PUT',
  });
}

// ============================================================
// INCIDENCIAS
// ============================================================

export async function crearIncidencia(datos: any): Promise<any> {
  return peticion('/incidencias', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function obtenerIncidencias(loteId: number): Promise<any[]> {
  return peticion(`/incidencias?lote_id=${loteId}`);
}
