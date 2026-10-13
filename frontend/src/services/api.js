// ============================================================
// api.js — Conector entre el frontend y el backend (FastAPI)
// ============================================================

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Evento que se dispara cuando el backend responde 401 con una sesión guardada
// (token vencido o inválido). AuthContext lo escucha para cerrar la sesión en React.
export const EVENTO_SESION_EXPIRADA = "auth:sesion-expirada";

// ============================================================
// FUNCIÓN BASE
// ============================================================

export async function peticion(ruta, opciones = {}) {

    const encabezados = {
        "Content-Type": "application/json",
        ...(opciones.headers || {})
    };

    const token = sessionStorage.getItem("token");

    if (token) {
        encabezados["Authorization"] = `Bearer ${token}`;
    }

    let respuesta;

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

    let cuerpo;

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

        const errorPago = new Error(
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
                .map((d) => d?.msg || JSON.stringify(d))
                .join(". ");
        }

        const error = new Error(
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

    return cuerpo.data;
}


// ============================================================
// AUTENTICACIÓN
// ============================================================

export async function iniciarSesion(correo, clave) {

    const datos = await peticion("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            correo,
            clave
        })
    });

    sessionStorage.setItem("token", datos.token);
    sessionStorage.setItem("usuario_id", datos.usuario.id);
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

export async function solicitarRecuperacionClave(correo) {

    const datos = await peticion("/auth/recuperar-clave", {
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


export async function restablecerClave(token, claveNueva) {

    return peticion("/auth/restablecer-clave", {
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

export async function obtenerUsuarios(filtros = {}) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/usuarios${params ? "?" + params : ""}`
    );

}


// Perfil del usuario con sesión (datos completos, solo el propio)
export async function obtenerMiPerfil() {
    return peticion("/usuarios/me");
}

// Productores con datos públicos (sin correo, teléfono ni documento)
export async function obtenerProductoresPublicos() {
    return peticion("/usuarios/productores");
}

// Solo conteos para las estadísticas de la página de inicio
export async function obtenerResumenPublico() {
    return peticion("/usuarios/resumen-publico");
}

// Cambia la clave propia; el backend verifica la clave actual
export async function cambiarClave(claveActual, claveNueva) {
    return peticion("/auth/cambiar-clave", {
        method: "POST",
        body: JSON.stringify({
            clave_actual: claveActual,
            clave_nueva: claveNueva
        })
    });
}


export async function registrarUsuario(usuario) {

    return peticion("/usuarios", {
        method: "POST",
        body: JSON.stringify(usuario)
    });

}


export async function editarUsuarioApi(id, cambios) {

    return peticion(`/usuarios/${id}`, {
        method: "PUT",
        body: JSON.stringify(cambios)
    });

}


export async function eliminarUsuarioApi(id) {

    return peticion(
        `/usuarios/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// LOTES
// ============================================================

export async function obtenerLotes(filtros = {}) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/lotes${params ? "?" + params : ""}`
    );

}


export async function registrarLote(lote) {

    return peticion("/lotes", {
        method: "POST",
        body: JSON.stringify(lote)
    });

}


export async function editarLoteApi(id, cambios) {

    return peticion(`/lotes/${id}`, {
        method: "PUT",
        body: JSON.stringify(cambios)
    });

}


export async function actualizarEstadoCultivo(
    id,
    estadoCultivo
) {

    return peticion(
        `/lotes/${id}/estado-cultivo`,
        {
            method: "PUT",
            body: JSON.stringify({
                estado_cultivo: estadoCultivo
            })
        }
    );

}


export async function eliminarLoteApi(id) {

    return peticion(
        `/lotes/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// ROLES
// ============================================================

export async function obtenerRoles() {

    return peticion("/roles");

}


export async function registrarRol(rol) {

    return peticion("/roles", {
        method: "POST",
        body: JSON.stringify(rol)
    });

}


export async function editarRolApi(id, cambios) {

    return peticion(`/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(cambios)
    });

}


export async function eliminarRolApi(id) {

    return peticion(
        `/roles/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// RESERVAS
// ============================================================

export async function obtenerReservas(filtros = {}) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/reservas${params ? "?" + params : ""}`
    );

}


export async function crearReserva(reserva) {

    return peticion("/reservas", {
        method: "POST",
        body: JSON.stringify(reserva)
    });

}


export async function editarEstadoReserva(id, cambios) {

    return peticion(
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

export async function obtenerCategorias() {

    return peticion("/categorias");

}


export async function obtenerLotesPorCategoria(
    nombre,
    filtros = {}
) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/categorias/${encodeURIComponent(nombre)}/lotes${params ? "?" + params : ""}`
    );

}


export async function registrarCategoria(categoria) {

    return peticion("/categorias", {
        method: "POST",
        body: JSON.stringify(categoria)
    });

}


export async function editarCategoriaApi(
    nombre,
    cambios
) {

    return peticion(
        `/categorias/${encodeURIComponent(nombre)}`,
        {
            method: "PUT",
            body: JSON.stringify(cambios)
        }
    );

}


export async function eliminarCategoriaApi(nombre) {

    return peticion(
        `/categorias/${encodeURIComponent(nombre)}`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// TIPOS DE DOCUMENTO
// ============================================================

export async function obtenerTiposDocumento() {

    return peticion("/tipos_documento");

}


// ============================================================
// HISTORIALES
// ============================================================

export async function obtenerHistorialSeguimiento(
    filtros = {}
) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/historial_seguimiento${params ? "?" + params : ""}`
    );

}


export async function obtenerHistorialReservas(
    filtros = {}
) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/historial_reservas${params ? "?" + params : ""}`
    );

}


// ============================================================
// PROVEEDORES
// ============================================================

export async function obtenerProveedores(filtros = {}) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/proveedores${params ? "?" + params : ""}`
    );

}


export async function registrarProveedor(proveedor) {

    return peticion("/proveedores", {
        method: "POST",
        body: JSON.stringify(proveedor)
    });

}


export async function editarProveedorApi(
    id,
    cambios
) {

    return peticion(`/proveedores/${id}`, {
        method: "PUT",
        body: JSON.stringify(cambios)
    });

}


export async function eliminarProveedorApi(id) {

    return peticion(
        `/proveedores/${id}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// FAVORITOS
// ============================================================

export async function obtenerFavoritos(compradorId) {

    return peticion(
        `/favoritos?comprador_id=${encodeURIComponent(compradorId)}`
    );

}


export async function agregarFavorito(
    compradorId,
    productorId
) {

    return peticion("/favoritos", {
        method: "POST",
        body: JSON.stringify({
            comprador_id: compradorId,
            productor_id: productorId
        })
    });

}


export async function eliminarFavoritoApi(
    compradorId,
    productorId
) {

    return peticion(
        `/favoritos/${compradorId}/${productorId}?confirmar=true`,
        {
            method: "DELETE"
        }
    );

}


// ============================================================
// SOPORTE
// ============================================================

export async function enviarSoporte(datos) {

    return peticion("/soporte", {
        method: "POST",
        body: JSON.stringify(datos)
    });

}


export async function obtenerTicketsSoporte(
    filtros = {}
) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/soporte${params ? "?" + params : ""}`
    );

}


export async function actualizarEstadoSoporte(
    id,
    estado
) {

    return peticion(`/soporte/${id}/estado`, {
        method: "PUT",
        body: JSON.stringify({
            estado
        })
    });

}


export async function eliminarTicketSoporte(id) {

    return peticion(
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

export async function crearPago(datos) {

    if (!datos || !datos.reserva_id) {

        throw new Error(
            "El reserva_id es obligatorio para crear el pago."
        );

    }

    const payload = {

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

    return peticion("/pagos", {

        method: "POST",

        body: JSON.stringify(payload)

    });

}


// ============================================================
// OBTENER PAGOS DE UNA RESERVA
// ============================================================

export async function obtenerPagos(reservaId) {

    if (!reservaId) {

        throw new Error(
            "El reserva_id es obligatorio."
        );

    }

    return peticion(
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

export async function crearEntrega(datos) {

    return peticion("/entregas", {
        method: "POST",
        body: JSON.stringify(datos)
    });

}


export async function actualizarUbicacionEntrega(
    entregaId,
    latitud,
    longitud
) {

    return peticion(
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


export async function actualizarEntrega(
    id,
    cambios
) {

    return peticion(
        `/entregas/${id}`,
        {
            method: "PUT",
            body: JSON.stringify(cambios)
        }
    );

}


export async function obtenerEntregas(reservaId) {

    return peticion(
        `/entregas?reserva_id=${reservaId}`
    );

}


// ============================================================
// CALIFICACIONES
// ============================================================

export async function crearCalificacion(datos) {

    return peticion("/calificaciones", {
        method: "POST",
        body: JSON.stringify(datos)
    });

}


export async function obtenerCalificaciones(productorId) {

    return peticion(
        `/calificaciones?productor_id=${productorId}`
    );

}


// ============================================================
// DISPUTAS
// ============================================================

export async function crearDisputa(datos) {

    return peticion("/disputas", {
        method: "POST",
        body: JSON.stringify(datos)
    });

}


export async function obtenerDisputas(filtros = {}) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/disputas${params ? "?" + params : ""}`
    );

}


export async function actualizarDisputa(
    id,
    cambios
) {

    return peticion(
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

export function obtenerUsuarioActual() {

    return {

        id:
            parseInt(
                sessionStorage.getItem("usuario_id")
            ) || 0,

        nombre:
            sessionStorage.getItem("usuario_nombre") ||
            "",

        correo:
            sessionStorage.getItem("usuario_correo") ||
            "",

        rol:
            sessionStorage.getItem("usuario_rol") ||
            ""

    };

}


// ============================================================
// REPORTES
// ============================================================

export async function obtenerReporteProductor(
    productorId = null
) {

    const params =
        productorId
            ? `?productor_id=${productorId}`
            : "";

    return peticion(
        `/reportes/productor${params}`
    );

}


export async function obtenerReporteAdmin(
    filtros = {}
) {

    const params =
        new URLSearchParams(filtros).toString();

    return peticion(
        `/reportes/admin${params ? "?" + params : ""}`
    );

}


// ============================================================
// PERFIL PÚBLICO PRODUCTOR
// ============================================================

export async function obtenerPerfilPublico(usuarioId) {

    return peticion(
        `/usuarios/${usuarioId}/perfil-publico`
    );

}


// ============================================================
// CONFIGURACIÓN
// ============================================================

export async function obtenerComision() {

    return peticion(
        "/configuracion/comision"
    );

}


export async function actualizarComision(
    comisionPct
) {

    return peticion(
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
    nombreArchivo,
    filas
) {

    if (
        !filas ||
        !filas.length
    ) {

        return false;
    }

    const columnas =
        Object.keys(filas[0]);

    const escapar = (valor) => {

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

export async function obtenerNotificaciones() {

    return peticion(
        "/notificaciones"
    );

}


export async function marcarNotificacionLeida(id) {

    return peticion(
        `/notificaciones/${id}/leer`,
        {
            method: "PUT"
        }
    );

}


export async function marcarTodasNotificacionesLeidas() {

    return peticion(
        "/notificaciones/leer-todas",
        {
            method: "PUT"
        }
    );

}


// ============================================================
// INCIDENCIAS
// ============================================================

export async function crearIncidencia(datos) {

    return peticion(
        "/incidencias",
        {
            method: "POST",
            body: JSON.stringify(datos)
        }
    );

}


