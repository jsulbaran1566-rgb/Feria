// ============================================================
// Tipos del dominio — reflejan lo que devuelve el backend (FastAPI)
// ============================================================

export type NombreRol = "Administrador" | "Productor" | "Comprador";
export type EstadoUsuario = "Activo" | "Inactivo";

// ---- Autenticación ------------------------------------------------------

export interface SesionUsuario {
  id: number;
  nombre: string;
  correo: string;
  rol: NombreRol;
}

// Usuario guardado en la sesión del navegador (rol vacío si no hay sesión)
export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  rol: NombreRol | "";
}

export type TipoAlerta = "ok" | "error" | "info" | "warning";

export interface EstadoAlerta {
  type: TipoAlerta;
  message: string;
}

export interface RespuestaLogin {
  token: string;
  usuario: SesionUsuario;
}

export interface RespuestaRecuperacion {
  mensaje?: string;
  token_simulado: string | null;
}

// ---- Usuarios y catálogos -----------------------------------------------

export interface Usuario {
  id: number;
  tipo_documento: string | null;
  numero_documento: string | null;
  nombre: string;
  correo: string;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  empresa: string | null;
  rol_id: number;
  rol: NombreRol | null;
  estado: EstadoUsuario;
  fecha_registro: string | null;
  foto_url: string | null;
  descripcion: string | null;
  nombre_finca: string | null;
  cultivos_principales: string | null;
  latitud: number | null;
  longitud: number | null;
}

// Datos para crear / editar un usuario (la clave solo se envía, nunca se recibe)
export interface DatosUsuarioNuevo {
  id: number;
  tipo_documento: string;
  numero_documento: string;
  nombre: string;
  correo: string;
  telefono: string;
  clave: string;
  direccion?: string | null;
  ciudad?: string | null;
  empresa?: string | null;
  rol_id: number;
  estado?: EstadoUsuario;
}

export interface DatosUsuarioEditar {
  tipo_documento?: string;
  nombre?: string;
  correo?: string;
  telefono?: string;
  clave?: string;
  direccion?: string | null;
  ciudad?: string | null;
  rol_id?: number;
  estado?: EstadoUsuario;
  foto_url?: string | null;
  descripcion?: string | null;
  nombre_finca?: string | null;
  cultivos_principales?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

export interface ProductorPublico {
  id: number;
  nombre: string;
  rol: NombreRol | null;
  estado: EstadoUsuario;
  ciudad: string | null;
  empresa: string | null;
  foto_url: string | null;
  descripcion: string | null;
  nombre_finca: string | null;
  cultivos_principales: string | null;
  latitud: number | null;
  longitud: number | null;
}

export interface PerfilPublico {
  id: number;
  nombre: string;
  foto_url: string | null;
  descripcion: string | null;
  nombre_finca: string | null;
  cultivos_principales: string | null;
  latitud: number | null;
  longitud: number | null;
  ciudad: string | null;
  miembro_desde: string | null;
  lotes_activos: number;
  promedio_calificacion: number | null;
  total_calificaciones: number;
  tasa_cumplimiento: number | null;
  puntaje: number | null;
}

export interface ResumenPublico {
  compradores: number;
  productores: number;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  permisos: string | null;
}

export interface DatosRolNuevo {
  id: number;
  nombre: string;
  descripcion?: string | null;
  permisos?: string | null;
}

export type DatosRolEditar = Partial<Omit<DatosRolNuevo, "id">>;

export interface TipoDocumento {
  codigo: string;
  nombre: string;
}

export interface Categoria {
  nombre: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  tipo: string | null;
  ciudad: string | null;
  telefono: string | null;
  correo: string | null;
  estado: EstadoUsuario;
}

export interface DatosProveedorNuevo {
  id: number;
  nombre: string;
  tipo: string;
  ciudad?: string | null;
  telefono?: string | null;
  correo?: string | null;
  estado?: EstadoUsuario;
}

export type DatosProveedorEditar = Partial<Omit<DatosProveedorNuevo, "id">>;

// ---- Lotes, reservas, pagos, entregas -----------------------------------

export interface Lote {
  id: number;
  producto: string;
  cantidad: number;
  kg_reservados: number;
  precio_kg: number;
  imagen_url: string | null;
  estado: string;
  estado_cultivo: string | null;
  anticipo_pct: number | null;
  horas_limite_pago: number | null;
  fecha_siembra: string | null;
  fecha_cosecha: string | null;
  categoria: string | null;
  productor_id: number;
  productor: string | null;
  ingreso_proyectado_total: number | null;
  ingreso_proyectado_reservado: number | null;
  productor_nombre_finca: string | null;
  productor_cultivos_principales: string | null;
  productor_latitud: number | null;
  productor_longitud: number | null;
}

export interface DatosLoteNuevo {
  producto: string;
  cantidad: number;
  categoria: string;
  productor_id: number;
  estado?: string;
  fecha_siembra?: string | null;
  fecha_cosecha?: string | null;
  precio_kg?: number | null;
  imagen_url?: string | null;
  anticipo_pct?: number | null;
  horas_limite_pago?: number | null;
}

export type DatosLoteEditar = Partial<Omit<DatosLoteNuevo, "productor_id">>;

export interface Reserva {
  id: number;
  comprador_id: number;
  comprador: string | null;
  lote_id: number;
  producto: string | null;
  productor_id: number | null;
  productor: string | null;
  precio_kg: number;
  cantidad: number;
  fecha: string;
  estado: string;
  motivo_cancelacion: string | null;
  fecha_limite_pago: string | null;
  estado_cultivo: string | null;
  fecha_cosecha: string | null;
  anticipo_pct: number | null;
}

export interface DatosReservaNueva {
  comprador_id: number;
  lote_id: number;
  cantidad: number;
}

export interface DatosReservaEditar {
  comprador_id?: number;
  fecha?: string;
  estado?: string;
  motivo_cancelacion?: string | null;
}

export interface Pago {
  id: number;
  reserva_id: number;
  subtotal: number;
  costo_envio: number;
  monto: number;
  estado: string;
  tipo: string | null;
  referencia_ext: string | null;
  metodo: string | null;
  fecha: string;
  comision_pct: number | null;
  comision_monto: number | null;
  monto_neto: number | null;
}

export interface DatosPago {
  reserva_id: number | string;
  metodo?: string;
  monto?: number | string | null;
  resultado_simulado?: string | null;
}

// Respuesta de crear un pago: los datos del pago más los totales de la reserva
export interface ResultadoPago extends Pago {
  monto_total_reserva: number;
  monto_pendiente: number;
  reserva_completamente_pagada: boolean;
  reserva_estado?: string;
}

export interface ResumenPagosReserva {
  monto_total_reserva: number;
  monto_pagado: number;
  monto_pendiente: number;
  anticipo_pct: number | null;
  monto_anticipo: number;
  pagos: Pago[];
}

export interface Entrega {
  id: number;
  reserva_id: number;
  medio: string | null;
  estado: string;
  fecha_estimada: string | null;
  fecha_real: string | null;
  latitud_actual: number | null;
  longitud_actual: number | null;
  ubicacion_actualizada: string | null;
  // Solo viene al crear la entrega (se lo entrega el productor al comprador)
  codigo_confirmacion?: string | null;
}

export interface DatosEntregaNueva {
  reserva_id: number;
  medio: string;
  fecha_estimada?: string | null;
}

export interface DatosEntregaEditar {
  estado?: string;
  codigo_confirmacion?: string;
}

export interface Calificacion {
  id: number;
  reserva_id: number;
  comprador_id: number;
  comprador: string | null;
  productor_id: number;
  estrellas: number;
  comentario: string | null;
  fecha: string;
}

export interface DatosCalificacion {
  reserva_id: number;
  estrellas: number;
  comentario?: string | null;
}

export interface ResumenCalificaciones {
  promedio: number | null;
  total: number;
  tasa_cumplimiento: number | null;
  puntaje: number | null;
}

// GET /calificaciones: resumen del productor + lista de calificaciones
export interface RespuestaCalificaciones extends ResumenCalificaciones {
  calificaciones: Calificacion[];
}

export interface Disputa {
  id: number;
  reserva_id: number;
  comprador_id: number;
  estado: string;
  descripcion: string | null;
  resolucion: string | null;
  fecha_apertura: string;
  fecha_resolucion: string | null;
}

export interface DatosDisputaNueva {
  reserva_id: number;
  descripcion: string;
}

export interface DatosDisputaActualizar {
  estado: string;
  resolucion?: string | null;
  reembolsar?: boolean;
}

export interface Incidencia {
  id: number;
  lote_id: number;
  producto: string | null;
  tipo: string;
  descripcion: string | null;
  fecha: string;
}

export interface DatosIncidencia {
  lote_id: number;
  tipo: string;
  descripcion: string;
}

// ---- Favoritos, notificaciones, soporte ---------------------------------

export interface Favorito {
  comprador_id: number;
  productor_id: number;
  productor: string | null;
  ciudad: string | null;
  fecha_agregado: string;
}

export interface Notificacion {
  id: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  entidad_tipo: string | null;
  entidad_id: number | null;
  comprador_id: number | null;
  comprador_nombre: string | null;
}

// GET /notificaciones: lista + cantidad sin leer
export interface RespuestaNotificaciones {
  no_leidas: number;
  notificaciones: Notificacion[];
}

export interface TicketSoporte {
  id: number;
  usuario_id: number | null;
  nombre: string;
  correo: string;
  mensaje: string;
  estado: string;
  fecha_creacion: string;
}

export interface DatosSoporte {
  usuario_id?: number | null;
  nombre: string;
  correo: string;
  mensaje: string;
}

// ---- Historiales y reportes ---------------------------------------------

export interface HistorialSeguimiento {
  id: number;
  accion: string;
  lote_id: number | null;
  producto: string | null;
  fecha: string;
}

export interface HistorialReserva {
  id: number;
  reserva_id: number;
  comprador: string | null;
  producto: string | null;
  estado: string;
  fecha: string;
}

export interface ReporteProductor {
  productor_id: number;
  rango: { desde: string | null; hasta: string | null };
  total_kg_vendidos: number;
  ingresos_totales: number;
  comision_total: number;
  ingresos_netos: number;
  lotes_activos: number;
  reservas_entregadas: number;
  calificacion: ResumenCalificaciones;
}

export interface ReporteAdmin {
  rango: { desde: string | null; hasta: string | null };
  volumen_transacciones: number;
  monto_total_transacciones: number;
  comision_total_plataforma: number;
  disputas_por_estado: Record<string, number>;
  total_disputas: number;
  usuarios_activos_por_rol: Record<string, number>;
  total_usuarios_activos: number;
}

export interface Comision {
  comision_pct: number;
}

// ---- Utilidades de API --------------------------------------------------

export type ValorFiltro = string | number | boolean | null | undefined;
export type Filtros = Record<string, ValorFiltro>;

export interface ErrorApi extends Error {
  status?: number;
  codigo?: string | null;
  data?: unknown;
}
