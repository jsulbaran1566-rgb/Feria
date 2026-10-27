// ============================================================
// api.ts — Conector entre el frontend y el backend (FastAPI)
// ============================================================

import type {
    Calificacion, Categoria, Comision, DatosCalificacion, DatosDisputaActualizar, DatosDisputaNueva, DatosEntregaEditar, DatosEntregaNueva,
    DatosIncidencia, DatosLoteEditar, DatosLoteNuevo, DatosPago, DatosProveedorEditar, DatosProveedorNuevo, DatosReservaEditar, DatosReservaNueva, DatosRolEditar, DatosRolNuevo,
    DatosSoporte, DatosUsuarioEditar, DatosUsuarioNuevo, Disputa, Entrega, ErrorApi, Favorito, Filtros,
    HistorialReserva, HistorialSeguimiento, Incidencia, Lote,
    PerfilPublico, ProductorPublico, Proveedor, ReporteAdmin, ReporteProductor,
    Reserva, ResultadoPago, ResumenPagosReserva, ResumenPublico,
    NombreRol, UsuarioSesion, RespuestaCalificaciones, RespuestaLogin, RespuestaNotificaciones, RespuestaRecuperacion, Rol, SesionUsuario, TicketSoporte, TipoDocumento, Usuario,
} from "../types";

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Evento que se dispara cuando el backend responde 401 con una sesión guardada
// (token vencido o inválido). AuthContext lo escucha para cerrar la sesión en React.
export const EVENTO_SESION_EXPIRADA = "auth:sesion-expirada";

// ============================================================
// FUNCIÓN BASE
// ============================================================

// Convierte filtros en query string, omitiendo los vacíos (undefined, null o "")
function construirQuery(filtros: Filtros = {}): string {
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== null && valor !== "") {
            params.append(clave, String(valor));
        }
    }
    return params.toString();
}


export async function peticion<T = unknown>(ruta: string, opciones: RequestInit = {}): Promise<T> {

    const encabezados: Record<string, string> = {
        "Content-Type": "application/json",
        ...((opciones.headers as Record<string, string> | undefined) || {})
    };

    const token = sessionStorage.getItem("token");

    if (token) {
        encabezados["Authorization"] = `Bearer ${token}`;
    }

    let respuesta: Response;

    try {

        respuesta = await fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers: encabezados
        });

    } catch {

        throw new Error(
            "No se pudo conectar con el backend. " +
            `Verifica que FastAPI esté ejecutándose en ${API_URL}.`
        );
    }

    // El cuerpo viene del backend con forma variable (success/data/error/detail)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cuerpo: any;

    try {

        cuerpo = await respuesta.json();

    } catch {

        throw new Error(
            `El backend respondió con un formato inválido ` +
            `(HTTP ${respuesta.status}).`
        );
    }

    // ========================================================
    // PAGO RECHAZADO
    // ========================================================
    //
    // El backend utiliza HTTP 402 y error="PagoRechazado".
    //
    // Guardamos los datos adicionales en el Error para que
    // la pantalla de pagos pueda mostrar correctamente el detalle.
    //

    if (
        respuesta.status === 402 &&
        cuerpo &&
        cuerpo.error === "PagoRechazado"
    ) {

        const errorPago: ErrorApi = new Error(
            cuerpo.message ||
            "El pago fue rechazado."
        );

        errorPago.status = 402;
        errorPago.codigo = "PagoRechazado";
        errorPago.data = cuerpo.data || null;

        throw errorPago;
    }

    // ========================================================
    // ERRORES NORMALES
    // ========================================================

    if (!respuesta.ok || !cuerpo.success) {

        // Sesión vencida o token inválido: limpiar y avisar a React.
        // (Se excluye /auth/login, donde un 401 significa credenciales incorrectas.)
        if (
            respuesta.status === 401 &&
            ruta !== "/auth/login" &&
            sessionStorage.getItem("token")
        ) {
            sessionStorage.clear();
            window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
        }

        // FastAPI devuelve `detail` como lista en errores 422 de validación
        let detalle = cuerpo.detail;
        if (Array.isArray(detalle)) {
            detalle = detalle
                .map((d: { msg?: string }) => d?.msg || JSON.stringify(d))
                .join(". ");
        }

        const error: ErrorApi = new Error(
            cuerpo.message ||
            cuerpo.error ||
            detalle ||
            `Error HTTP ${respuesta.status}`
        );

        error.status = respuesta.status;
        error.codigo = cuerpo.error || null;
        error.data = cuerpo.data || null;

        throw error;
    }

    return cuerpo.data as T;
}


// ============================================================
// AUTENTICACIÓN
// ============================================================

export async function iniciarSesion(correo: string, clave: string): Promise<SesionUsuario> {

    const datos = await peticion<RespuestaLogin>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            correo,
            clave
        })
    });

    sessionStorage.setItem("token", datos.token);
    sessionStorage.setItem("usuario_id", String(datos.usuario.id));
    sessionStorage.setItem("usuario_nombre", datos.usuario.nombre);
    sessionStorage.setItem("usuario_correo", datos.usuario.correo);
    sessionStorage.setItem("usuario_rol", datos.usuario.rol);

    return datos.usuario;
}


// ------------------------------------------------------------
// RECUPERACIÓN DE CONTRASEÑA (SIMULADA)
// El backend NO envía correos: genera un token de recuperación real y lo
// devuelve en la respuesta (token_recuperacion). La pantalla lo presenta como
// un "correo simulado" y luego ese mismo token se usa para restablecer la
// clave, que sí se actualiza en la base de datos.
// ------------------------------------------------------------

export async function solicitarRecuperacionClave(correo: string): Promise<RespuestaRecuperacion> {

    const datos = await peticion<{ mensaje?: string; token_recuperacion?: string }>("/auth/recuperar-clave", {
        method: "POST",
        body: JSON.stringify({
            correo
        })
    });

    return {
        mensaje: datos?.mensaje,
        token_simulado: datos?.token_recuperacion || null
    };
}


export async function restablecerClave(token: string, claveNueva: string): Promise<{ mensaje?: string }> {

    return peticion<{ mensaje?: string }>("/auth/restablecer-clave", {
        method: "POST",
        body: JSON.stringify({
            token,
            clave_nueva: claveNueva
        })
    });
}


export async function cerrarSesion() {

    try {

        await peticion("/auth/logout", {
            method: "POST"
        });

    } catch (error) {

        console.warn(
            "No se pudo notificar el logout al servidor:",
            error
        );
    }

    sessionStorage.clear();
}


// ============================================================
// USUARIOS
// ============================================================

export async function obtenerUsuarios(filtros: Filtros = {}): Promise<Usuario[]> {

    const params =
        construirQuery(filtros);

    return peticion<Usuario[]>(
        `/usuarios${params ? "?" + params : ""}`
    );

}


// Perfil del usuario con sesión (datos completos, solo el propio)
export async function obtenerMiPerfil(): Promise<Usuario> {
    return peticion<Usuario>("/usuarios/me");
}

// Productores con datos públicos (sin correo, teléfono ni documento)
export async function obtenerProductoresPublicos(): Promise<ProductorPublico[]> {
    return peticion<ProductorPublico[]>("/usuarios/productores");
}

// Solo conteos para las estadísticas de la página de inicio
export async function obtenerResumenPublico(): Promise<ResumenPublico> {
    return peticion<ResumenPublico>("/usuarios/resumen-publico");
}

// Cambia la clave propia; el backend verifica la clave actual
export async function cambiarClave(claveActual: string, claveNueva: string): Promise<unknown> {
    return peticion<unknown>("/auth/cambiar-clave", {
        method: "POST",
        body: JSON.stringify({
            clave_actual: claveActual,
            clave_nueva: claveNueva
        })
    });
}


export async function registrarUsuario(usuario: DatosUsuarioNuevo): Promise<Usuario> {

    return peticion<Usuario>("/usuarios", {
        method: "POST",
        body: JSON.stringify(usuario)
    });

}


export async function editarUsuarioApi(id: number, cambios: DatosUsuarioEditar): Promise<Usuario> {

    return peticion<Usuario>(`/usuarios/${id}`, {
        method: "PUT",
        body: JSON.stringify(cambios)
    });

}


export async function eliminarUsuarioApi(id: number): Promise<unknown> {

    return peticion<unknown>(
        `/usuarios/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// LOTES
// ============================================================

export async function obtenerLotes(filtros: Filtros = {}): Promise<Lote[]> {

    const params =
        construirQuery(filtros);

    return peticion<Lote[]>(
        `/lotes${params ? "?" + params : ""}`
    );

}


export async function registrarLote(lote: DatosLoteNuevo): Promise<Lote> {

    return peticion<Lote>("/lotes", {
        method: "POST",
        body: JSON.stringify(lote)
    });

}


export async function editarLoteApi(id: number, cambios: DatosLoteEditar): Promise<Lote> {

    return peticion<Lote>(`/lotes/${id}`, {
        method: "PUT",
        body: JSON.stringify(cambios)
    });

}


export async function actualizarEstadoCultivo(id: number, estadoCultivo: string): Promise<Lote> {

    return peticion<Lote>(
        `/lotes/${id}/estado-cultivo`,
        {
            method: "PUT",
            body: JSON.stringify({
                estado_cultivo: estadoCultivo
            })
        }
    );

}


export async function eliminarLoteApi(id: number): Promise<unknown> {

    return peticion<unknown>(
        `/lotes/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// ROLES
// ============================================================

export async function obtenerRoles(): Promise<Rol[]> {

    return peticion<Rol[]>("/roles");

}


export async function registrarRol(rol: DatosRolNuevo): Promise<Rol> {

    return peticion<Rol>("/roles", {
        method: "POST",
        body: JSON.stringify(rol)
    });

}


export async function editarRolApi(id: number, cambios: DatosRolEditar): Promise<Rol> {

    return peticion<Rol>(`/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(cambios)
    });

}


export async function eliminarRolApi(id: number): Promise<unknown> {

    return peticion<unknown>(
        `/roles/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// RESERVAS
// ============================================================

export async function obtenerReservas(filtros: Filtros = {}): Promise<Reserva[]> {

    const params =
        construirQuery(filtros);

    return peticion<Reserva[]>(
        `/reservas${params ? "?" + params : ""}`
    );

}


export async function crearReserva(reserva: DatosReservaNueva): Promise<Reserva> {

    return peticion<Reserva>("/reservas", {
        method: "POST",
        body: JSON.stringify(reserva)
    });

}


export async function editarEstadoReserva(id: number, cambios: DatosReservaEditar): Promise<Reserva> {

    return peticion<Reserva>(
        `/reservas/${id}/estado`,
        {
            method: "PUT",
            body: JSON.stringify(cambios)
        }
    );

}


// ============================================================
// CATEGORÍAS
// ============================================================

export async function obtenerCategorias(): Promise<Categoria[]> {

    return peticion<Categoria[]>("/categorias");

}


export async function obtenerLotesPorCategoria(nombre: string, filtros: Filtros = {}): Promise<Lote[]> {

    const params =
        construirQuery(filtros);

    return peticion<Lote[]>(
        `/categorias/${encodeURIComponent(nombre)}/lotes${params ? "?" + params : ""}`
    );

}


export async function registrarCategoria(categoria: Categoria): Promise<Categoria> {

    return peticion<Categoria>("/categorias", {
        method: "POST",
        body: JSON.stringify(categoria)
    });

}


// El backend solo permite renombrar la categoría (nombre_nuevo)
export async function editarCategoriaApi(nombre: string, nombreNuevo: string): Promise<Categoria> {

    return peticion<Categoria>(
        `/categorias/${encodeURIComponent(nombre)}`,
        {
            method: "PUT",
            body: JSON.stringify({ nombre_nuevo: nombreNuevo })
        }
    );

}


export async function eliminarCategoriaApi(nombre: string): Promise<unknown> {

    return peticion<unknown>(
        `/categorias/${encodeURIComponent(nombre)}`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// TIPOS DE DOCUMENTO
// ============================================================

export async function obtenerTiposDocumento(): Promise<TipoDocumento[]> {

    return peticion<TipoDocumento[]>("/tipos_documento");

}


// ============================================================
// HISTORIALES
// ============================================================

export async function obtenerHistorialSeguimiento(filtros: Filtros = {}): Promise<HistorialSeguimiento[]> {

    const params =
        construirQuery(filtros);

    return peticion<HistorialSeguimiento[]>(
        `/historial_seguimiento${params ? "?" + params : ""}`
    );

}


export async function obtenerHistorialReservas(filtros: Filtros = {}): Promise<HistorialReserva[]> {

    const params =
        construirQuery(filtros);

    return peticion<HistorialReserva[]>(
        `/historial_reservas${params ? "?" + params : ""}`
    );

}


// ============================================================
// PROVEEDORES
// ============================================================

export async function obtenerProveedores(filtros: Filtros = {}): Promise<Proveedor[]> {

    const params =
        construirQuery(filtros);

    return peticion<Proveedor[]>(
        `/proveedores${params ? "?" + params : ""}`
    );

}


export async function registrarProveedor(proveedor: DatosProveedorNuevo): Promise<Proveedor> {

    return peticion<Proveedor>("/proveedores", {
        method: "POST",
        body: JSON.stringify(proveedor)
    });

}


export async function editarProveedorApi(id: number, cambios: DatosProveedorEditar): Promise<Proveedor> {

    return peticion<Proveedor>(`/proveedores/${id}`, {
        method: "PUT",
        body: JSON.stringify(cambios)
    });

}


export async function eliminarProveedorApi(id: number): Promise<unknown> {

    return peticion<unknown>(
        `/proveedores/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// FAVORITOS
// ============================================================

export async function obtenerFavoritos(compradorId: number): Promise<Favorito[]> {

    return peticion<Favorito[]>(
        `/favoritos?comprador_id=${encodeURIComponent(compradorId)}`
    );

}


export async function agregarFavorito(compradorId: number, productorId: number): Promise<Favorito> {

    return peticion<Favorito>("/favoritos", {
        method: "POST",
        body: JSON.stringify({
            comprador_id: compradorId,
            productor_id: productorId
        })
    });

}


export async function eliminarFavoritoApi(compradorId: number, productorId: number): Promise<unknown> {

    return peticion<unknown>(
        `/favoritos/${compradorId}/${productorId}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// SOPORTE
// ============================================================

export async function enviarSoporte(datos: DatosSoporte): Promise<TicketSoporte> {

    return peticion<TicketSoporte>("/soporte", {
        method: "POST",
        body: JSON.stringify(datos)
    });

}


export async function obtenerTicketsSoporte(filtros: Filtros = {}): Promise<TicketSoporte[]> {

    const params =
        construirQuery(filtros);

    return peticion<TicketSoporte[]>(
        `/soporte${params ? "?" + params : ""}`
    );

}


export async function actualizarEstadoSoporte(id: number, estado: string): Promise<TicketSoporte> {

    return peticion<TicketSoporte>(`/soporte/${id}/estado`, {
        method: "PUT",
        body: JSON.stringify({
            estado
        })
    });

}


export async function eliminarTicketSoporte(id: number): Promise<unknown> {

    return peticion<unknown>(
        `/soporte/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// PAGOS
// ============================================================
//
// Compatible con:
// RF-26 — Historial de transacciones
// RF-27 — Anticipos/pagos parciales
// RF-24 — Reintento después de pago rechazado
//
// Estados que puede devolver el backend:
//
// Aprobado
// Rechazado
//
// ============================================================

export async function crearPago(datos: DatosPago): Promise<ResultadoPago> {

    if (!datos || !datos.reserva_id) {

        throw new Error(
            "El reserva_id es obligatorio para crear el pago."
        );

    }

    const payload: {
        reserva_id: number;
        metodo: string;
        monto?: number;
        resultado_simulado?: string;
    } = {

        reserva_id: Number(datos.reserva_id),

        metodo:
            datos.metodo ||
            "Simulado - Tarjeta"

    };

    if (
        datos.monto !== undefined &&
        datos.monto !== null
    ) {

        payload.monto =
            Number(datos.monto);

    }

    if (
        datos.resultado_simulado !== undefined &&
        datos.resultado_simulado !== null
    ) {

        payload.resultado_simulado =
            datos.resultado_simulado;

    }

    return peticion<ResultadoPago>("/pagos", {

        method: "POST",

        body: JSON.stringify(payload)

    });

}


// ============================================================
// OBTENER PAGOS DE UNA RESERVA
// ============================================================

export async function obtenerPagos(reservaId: number | string): Promise<ResumenPagosReserva> {

    if (!reservaId) {

        throw new Error(
            "El reserva_id es obligatorio."
        );

    }

    return peticion<ResumenPagosReserva>(
        `/pagos?reserva_id=${encodeURIComponent(reservaId)}`
    );

}


// ============================================================
// REINTENTAR PAGO
// ============================================================
//
// El reintento es simplemente un nuevo POST /pagos.
//
// No se reutiliza el pago rechazado.
//
// El backend crea un nuevo registro.
// ============================================================

// ============================================================
// ENTREGAS
// ============================================================

export async function crearEntrega(datos: DatosEntregaNueva): Promise<Entrega> {

    return peticion<Entrega>("/entregas", {
        method: "POST",
        body: JSON.stringify(datos)
    });

}


export async function actualizarUbicacionEntrega(entregaId: number, latitud: number, longitud: number): Promise<Entrega> {

    return peticion<Entrega>(
        `/entregas/${entregaId}/ubicacion`,
        {
            method: "PUT",
            body: JSON.stringify({
                latitud,
                longitud
            })
        }
    );

}


export async function actualizarEntrega(id: number, cambios: DatosEntregaEditar): Promise<Entrega> {

    return peticion<Entrega>(
        `/entregas/${id}`,
        {
            method: "PUT",
            body: JSON.stringify(cambios)
        }
    );

}


export async function obtenerEntregas(reservaId: number | string): Promise<Entrega[]> {

    return peticion<Entrega[]>(
        `/entregas?reserva_id=${reservaId}`
    );

}


// ============================================================
// CALIFICACIONES
// ============================================================

export async function crearCalificacion(datos: DatosCalificacion): Promise<Calificacion> {

    return peticion<Calificacion>("/calificaciones", {
        method: "POST",
        body: JSON.stringify(datos)
    });

}


export async function obtenerCalificaciones(productorId: number): Promise<RespuestaCalificaciones> {

    return peticion<RespuestaCalificaciones>(
        `/calificaciones?productor_id=${productorId}`
    );

}


// ============================================================
// DISPUTAS
// ============================================================

export async function crearDisputa(datos: DatosDisputaNueva): Promise<Disputa> {

    return peticion<Disputa>("/disputas", {
        method: "POST",
        body: JSON.stringify(datos)
    });

}


export async function obtenerDisputas(filtros: Filtros = {}): Promise<Disputa[]> {

    const params =
        construirQuery(filtros);

    return peticion<Disputa[]>(
        `/disputas${params ? "?" + params : ""}`
    );

}


export async function actualizarDisputa(id: number, cambios: DatosDisputaActualizar): Promise<Disputa> {

    return peticion<Disputa>(
        `/disputas/${id}`,
        {
            method: "PUT",
            body: JSON.stringify(cambios)
        }
    );

}


// ============================================================
// UTILIDADES
// ============================================================

export function obtenerUsuarioActual(): UsuarioSesion {

    return {

        id:
            parseInt(
                sessionStorage.getItem("usuario_id") || "0"
            ) || 0,

        nombre:
            sessionStorage.getItem("usuario_nombre") ||
            "",

        correo:
            sessionStorage.getItem("usuario_correo") ||
            "",

        rol:
            (sessionStorage.getItem("usuario_rol") as NombreRol | null) ||
            ""

    };

}


// ============================================================
// REPORTES
// ============================================================

export async function obtenerReporteProductor(productorId: number | null = null): Promise<ReporteProductor> {

    const params =
        productorId
            ? `?productor_id=${productorId}`
            : "";

    return peticion<ReporteProductor>(
        `/reportes/productor${params}`
    );

}


export async function obtenerReporteAdmin(filtros: Filtros = {}): Promise<ReporteAdmin> {

    const params =
        construirQuery(filtros);

    return peticion<ReporteAdmin>(
        `/reportes/admin${params ? "?" + params : ""}`
    );

}


// ============================================================
// PERFIL PÚBLICO PRODUCTOR
// ============================================================

export async function obtenerPerfilPublico(usuarioId: number | string): Promise<PerfilPublico> {

    return peticion<PerfilPublico>(
        `/usuarios/${usuarioId}/perfil-publico`
    );

}


// ============================================================
// CONFIGURACIÓN
// ============================================================

export async function obtenerComision(): Promise<Comision> {

    return peticion<Comision>(
        "/configuracion/comision"
    );

}


export async function actualizarComision(comisionPct: number): Promise<Comision> {

    return peticion<Comision>(
        "/configuracion/comision",
        {
            method: "PUT",
            body: JSON.stringify({
                comision_pct:
                    comisionPct
            })
        }
    );

}


// ============================================================
// EXPORTAR CSV
// ============================================================

export function exportarCSV(
    nombreArchivo: string,
    filas: Array<Record<string, unknown>>
): boolean {

    if (
        !filas ||
        !filas.length
    ) {

        return false;
    }

    const columnas =
        Object.keys(filas[0]);

    const escapar = (valor: unknown): string => {

        const texto =
            valor == null
                ? ""
                : String(valor);

        return /[",\n]/.test(texto)
            ? `"${texto.replace(/"/g, '""')}"`
            : texto;

    };

    const lineas = [

        columnas.join(","),

        ...filas.map(
            fila =>
                columnas
                    .map(
                        columna =>
                            escapar(
                                fila[columna]
                            )
                    )
                    .join(",")
        )

    ];

    const blob =
        new Blob(
            [
                "\uFEFF" +
                lineas.join("\n")
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const enlace =
        document.createElement("a");

    enlace.href =
        url;

    enlace.download =
        nombreArchivo.endsWith(".csv")
            ? nombreArchivo
            : nombreArchivo + ".csv";

    document.body.appendChild(enlace);

    enlace.click();

    document.body.removeChild(enlace);

    URL.revokeObjectURL(url);


    return true;
}


// ============================================================
// NOTIFICACIONES
// ============================================================

export async function obtenerNotificaciones(): Promise<RespuestaNotificaciones> {

    return peticion<RespuestaNotificaciones>(
        "/notificaciones"
    );

}


export async function marcarNotificacionLeida(id: number): Promise<unknown> {

    return peticion<unknown>(
        `/notificaciones/${id}/leer`,
        {
            method: "PUT"
        }
    );

}


export async function marcarTodasNotificacionesLeidas(): Promise<unknown> {

    return peticion<unknown>(
        "/notificaciones/leer-todas",
        {
            method: "PUT"
        }
    );

}


// ============================================================
// INCIDENCIAS
// ============================================================

export async function crearIncidencia(datos: DatosIncidencia): Promise<Incidencia> {

    return peticion<Incidencia>(
        "/incidencias",
        {
            method: "POST",
            body: JSON.stringify(datos)
        }
    );

}


