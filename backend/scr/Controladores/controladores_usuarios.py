from fastapi import Query, Depends
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_usuarios import (
    ErrorUsuarioNoExiste,
    ErrorUsuarioYaExiste,
    ErrorRolInvalido,
)
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Utilidades.seguridad import hashear_clave
from Esquemas.Esquemas import UsuarioCrear, UsuarioEditar, ESTADOS_VALIDOS
from Dependencias.dependencias import requiere_rol, obtener_usuario_actual


# ── Helper ────────────────────────────────────────────────────────────────────

def _serializar_usuario(u: models.Usuario) -> dict:
    return {
        "id": u.id,
        "tipo_documento": u.tipo_documento,
        "numero_documento": u.numero_documento,   # ← AGREGAR ESTA LÍNEA
        "nombre": u.nombre,
        "correo": u.correo,
        "telefono": u.telefono,
        "direccion": u.direccion,
        "ciudad": u.ciudad,
        "empresa": u.empresa,
        "rol_id": u.rol_id,
        "rol": u.rol_rel.nombre if u.rol_rel else None,
        "estado": u.estado,
        "fecha_registro": str(u.fecha_registro),
        "foto_url": u.foto_url,
        "descripcion": u.descripcion,
        "nombre_finca": u.nombre_finca,
        "cultivos_principales": u.cultivos_principales,
        "latitud": float(u.latitud) if u.latitud is not None else None,
        "longitud": float(u.longitud) if u.longitud is not None else None,
    }


def _serializar_productor_publico(u: models.Usuario) -> dict:
    """Solo datos no sensibles: sin correo, teléfono, documento ni dirección."""
    return {
        "id": u.id,
        "nombre": u.nombre,
        "rol": u.rol_rel.nombre if u.rol_rel else None,
        "estado": u.estado,
        "ciudad": u.ciudad,
        "empresa": u.empresa,
        "foto_url": u.foto_url,
        "descripcion": u.descripcion,
        "nombre_finca": u.nombre_finca,
        "cultivos_principales": u.cultivos_principales,
        "latitud": float(u.latitud) if u.latitud is not None else None,
        "longitud": float(u.longitud) if u.longitud is not None else None,
    }


# ── GET /usuarios ─────────────────────────────────────────────────────────────
# Lista todos los usuarios con todos sus datos. Solo Administrador.
# Permite filtrar por rol y/o estado.

def obtener_usuarios(
    rol_id: int = Query(default=None, description="Filtrar por id de rol"),
    estado: str = Query(default=None, description="Filtrar por estado: Activo | Inactivo"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    query = db.query(models.Usuario)

    if rol_id:
        query = query.filter(models.Usuario.rol_id == rol_id)
    if estado:
        query = query.filter(models.Usuario.estado == estado)

    usuarios = query.all()
    return respuesta_ok(
        message="Usuarios obtenidos",
        data=[_serializar_usuario(u) for u in usuarios],
    )


# ── GET /usuarios/me ──────────────────────────────────────────────────────────
# Datos completos del usuario con sesión (para su página de perfil).

def obtener_mi_perfil(
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    return respuesta_ok(
        message="Perfil obtenido",
        data=_serializar_usuario(usuario_actual),
    )


# ── GET /usuarios/resumen-publico ─────────────────────────────────────────────
# Solo conteos (sin datos personales) para las estadísticas de la página de inicio.

def obtener_resumen_publico(db: Session = Depends(get_db)):
    def contar(nombre_rol: str) -> int:
        return (
            db.query(models.Usuario)
            .join(models.Rol, models.Usuario.rol_id == models.Rol.id)
            .filter(models.Rol.nombre == nombre_rol, models.Usuario.estado == "Activo")
            .count()
        )

    return respuesta_ok(
        message="Resumen obtenido",
        data={
            "compradores": contar("Comprador"),
            "productores": contar("Productor"),
        },
    )


# ── GET /usuarios/compradores ─────────────────────────────────────────────────
# Lista todos los usuarios con rol Comprador.

def obtener_compradores(
    estado: str = Query(default=None, description="Filtrar por estado: Activo | Inactivo"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    query = (
        db.query(models.Usuario)
        .join(models.Rol, models.Usuario.rol_id == models.Rol.id)
        .filter(models.Rol.nombre == "Comprador")
    )
    if estado:
        query = query.filter(models.Usuario.estado == estado)

    compradores = query.all()
    return respuesta_ok(
        message="Compradores obtenidos",
        data=[_serializar_usuario(u) for u in compradores],
    )


# ── GET /usuarios/{nombre} ───────────────────────────────────────────────────
# Obtiene usuario(s) cuyo nombre coincida (búsqueda parcial, insensible a mayúsculas).

def obtener_usuario_por_nombre(
    nombre: str,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if not nombre.strip():
        return respuesta_error("El nombre no puede estar vacío", status_code=400)

    usuarios = (
        db.query(models.Usuario)
        .filter(models.Usuario.nombre.ilike(f"%{nombre.strip()}%"))
        .all()
    )
    if not usuarios:
        return respuesta_error(f"No se encontró ningún usuario con nombre '{nombre}'", status_code=404)

    return respuesta_ok(
        message="Usuario(s) obtenido(s)",
        data=[_serializar_usuario(u) for u in usuarios],
    )


# ── GET /usuarios/productores ─────────────────────────────────────────────────
# Lista los productores con datos públicos (sin correo, teléfono ni documento).

def obtener_productores(
    estado: str = Query(default=None, description="Filtrar por estado: Activo | Inactivo"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Usuario)
        .join(models.Rol, models.Usuario.rol_id == models.Rol.id)
        .filter(models.Rol.nombre == "Productor")
    )
    if estado:
        query = query.filter(models.Usuario.estado == estado)

    productores = query.all()
    return respuesta_ok(
        message="Productores obtenidos",
        data=[_serializar_productor_publico(u) for u in productores],
    )


# ── POST /usuarios ────────────────────────────────────────────────────────────
# Registra un nuevo usuario en el sistema.

def agregar_usuario(
    datos: UsuarioCrear,
    db: Session = Depends(get_db),
):
    if db.query(models.Usuario).filter(models.Usuario.id == datos.id).first():
        raise ErrorUsuarioYaExiste(datos.id)

    if db.query(models.Usuario).filter(models.Usuario.correo == datos.correo).first():
        return respuesta_error(
            f"Ya existe un usuario con el correo '{datos.correo}'",
            status_code=400,
        )

    if db.query(models.Usuario).filter(models.Usuario.telefono == datos.telefono).first():
        return respuesta_error(
            f"Ya existe un usuario con el teléfono '{datos.telefono}'",
            status_code=400,
        )

    tipo_doc = db.query(models.TipoDocumento).filter(models.TipoDocumento.codigo == datos.tipo_documento).first()
    if not tipo_doc:
        return respuesta_error(f"No existe un tipo de documento con código '{datos.tipo_documento}'", status_code=400)

    rol = db.query(models.Rol).filter(models.Rol.id == datos.rol_id).first()
    if not rol:
        return respuesta_error(f"No existe un rol con id {datos.rol_id}", status_code=400)

    nuevo = models.Usuario(
        id=datos.id,
        tipo_documento=datos.tipo_documento,
        numero_documento=datos.numero_documento,   # ← FALTABA
        nombre=datos.nombre,
        correo=datos.correo,
        telefono=datos.telefono,
        clave=hashear_clave(datos.clave),
        direccion=datos.direccion,
        ciudad=datos.ciudad,
        empresa=datos.empresa,
        rol_id=datos.rol_id,
        estado=datos.estado,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return respuesta_ok(
        message="Usuario registrado",
        data=_serializar_usuario(nuevo),
        status_code=201,
    )


# ── PUT /usuarios/{id} ───────────────────────────────────────────────────────
# Actualiza nombre, teléfono, dirección, ciudad, rol y/o estado de un usuario.
# Un usuario puede editar su propio perfil (RF-05), pero solo un Administrador
# puede editar a otros usuarios o cambiar rol_id/estado (evita auto-ascenso).

# Aplica nombre_finca/cultivos/GPS SOLO si el usuario destino es Productor
# (RF-06). Separado para que editar_usuario no mezcle esta regla de negocio
# con el resto de los campos, que no la necesitan.
def _aplicar_datos_finca(db: Session, usuario: models.Usuario, datos: "UsuarioEditar"):
    campos_finca = (
        datos.nombre_finca is not None
        or datos.cultivos_principales is not None
        or datos.latitud is not None
        or datos.longitud is not None
    )
    if not campos_finca:
        return None

    rol_destino = db.query(models.Rol).filter(models.Rol.id == (datos.rol_id or usuario.rol_id)).first()
    if not rol_destino or rol_destino.nombre != "Productor":
        return "Los datos de finca/GPS (RF-06) solo aplican a usuarios con rol Productor"

    if datos.nombre_finca is not None:
        usuario.nombre_finca = datos.nombre_finca
    if datos.cultivos_principales is not None:
        usuario.cultivos_principales = datos.cultivos_principales
    if datos.latitud is not None:
        usuario.latitud = datos.latitud
    if datos.longitud is not None:
        usuario.longitud = datos.longitud
    return None


# RF-44: al suspender a un Productor, sus lotes dejan de ser visibles en el
# marketplace de inmediato — no tendría sentido que un comprador pueda
# seguir reservándole a una cuenta suspendida.
def _ocultar_lotes_si_se_suspende(db: Session, usuario: models.Usuario, estado_nuevo: str):
    if estado_nuevo == "Inactivo" and usuario.rol_rel and usuario.rol_rel.nombre == "Productor":
        db.query(models.Lote).filter(
            models.Lote.productor_id == usuario.id,
            models.Lote.estado == "Activo",
        ).update({"estado": "Inactivo"})


def editar_usuario(
    id: int,
    datos: UsuarioEditar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"

    if not es_admin:
        if usuario_actual.id != id:
            raise ErrorNoAutorizado(["Administrador"])
        if datos.rol_id is not None or datos.estado is not None:
            raise ErrorNoAutorizado(["Administrador"])

    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    usuario = db.query(models.Usuario).filter(models.Usuario.id == id).first()
    if not usuario:
        raise ErrorUsuarioNoExiste(id)

    if datos.tipo_documento is not None:
        tipo_doc = db.query(models.TipoDocumento).filter(models.TipoDocumento.codigo == datos.tipo_documento).first()
        if not tipo_doc:
            return respuesta_error(f"No existe un tipo de documento con código '{datos.tipo_documento}'", status_code=400)
        usuario.tipo_documento = datos.tipo_documento
    if datos.nombre is not None:
        usuario.nombre = datos.nombre
    if datos.correo is not None:
        duplicado = db.query(models.Usuario).filter(
            models.Usuario.correo == datos.correo,
            models.Usuario.id != id,
        ).first()
        if duplicado:
            return respuesta_error(
                f"Ya existe un usuario con el correo '{datos.correo}'",
                status_code=400,
            )
        usuario.correo = datos.correo
    if datos.clave is not None:
        usuario.clave = hashear_clave(datos.clave)
    if datos.telefono is not None:
        duplicado = db.query(models.Usuario).filter(
            models.Usuario.telefono == datos.telefono,
            models.Usuario.id != id,
        ).first()
        if duplicado:
            return respuesta_error(
                f"Ya existe un usuario con el teléfono '{datos.telefono}'",
                status_code=400,
            )
        usuario.telefono = datos.telefono
    if datos.direccion is not None:
        usuario.direccion = datos.direccion
    if datos.ciudad is not None:
        usuario.ciudad = datos.ciudad
    if datos.foto_url is not None:
        usuario.foto_url = datos.foto_url
    if datos.descripcion is not None:
        usuario.descripcion = datos.descripcion

    error_finca = _aplicar_datos_finca(db, usuario, datos)
    if error_finca:
        return respuesta_error(error_finca, status_code=400)

    if datos.rol_id is not None:
        rol = db.query(models.Rol).filter(models.Rol.id == datos.rol_id).first()
        if not rol:
            return respuesta_error(f"No existe un rol con id {datos.rol_id}", status_code=400)
        usuario.rol_id = datos.rol_id
    if datos.estado is not None:
        usuario.estado = datos.estado
        _ocultar_lotes_si_se_suspende(db, usuario, datos.estado)

    db.commit()
    db.refresh(usuario)

    return respuesta_ok(
        message="Usuario actualizado",
        data=_serializar_usuario(usuario),
    )


# ── DELETE /usuarios/{id} ─────────────────────────────────────────────────────
# Elimina un usuario del sistema.

def eliminar_usuario(
    id: int,
    confirmar: bool = Query(default=False, description="Debe ser true para confirmar la eliminación"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    if not confirmar:
        return respuesta_error("Debe confirmar la eliminación con ?confirmar=true", status_code=400)

    usuario = db.query(models.Usuario).filter(models.Usuario.id == id).first()
    if not usuario:
        raise ErrorUsuarioNoExiste(id)

    # Verificar que no sea productor con lotes activos
    lotes_activos = db.query(models.Lote).filter(
        models.Lote.productor_id == id,
        models.Lote.estado == "Activo",
    ).count()

    if lotes_activos > 0:
        return respuesta_error(
            f"El usuario {id} tiene {lotes_activos} lote(s) activo(s). Desactívelos primero.",
            status_code=409,
        )

    nombre = usuario.nombre
    db.delete(usuario)
    db.commit()

    return respuesta_ok(
        message="Usuario eliminado",
        data={"id": id, "nombre": nombre},
    )


# ── GET /usuarios/{id}/perfil-publico ─────────────────────────────────────────
# RF-48: página pública del productor (nombre de finca, cultivos, GPS,
# calificación y puntaje). Público, no requiere sesión — cualquiera puede
# ver el perfil de un productor antes de comprarle.

def obtener_perfil_publico(
    id: int,
    db: Session = Depends(get_db),
):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == id).first()
    if not usuario or not usuario.rol_rel or usuario.rol_rel.nombre != "Productor":
        raise ErrorUsuarioNoExiste(id)

    # Reutilizamos el mismo cálculo de calificaciones/puntaje que ya existe
    # en el módulo de Calificaciones, para no duplicar la lógica.
    from Controladores.controladores_calificaciones import _resumen_calificaciones
    resumen_calificacion = _resumen_calificaciones(db, id)

    lotes_activos = (
        db.query(models.Lote)
        .filter(models.Lote.productor_id == id, models.Lote.estado == "Activo")
        .count()
    )

    return respuesta_ok(
        message="Perfil público obtenido correctamente",
        data={
            "id": usuario.id,
            "nombre": usuario.nombre,
            "foto_url": usuario.foto_url,
            "descripcion": usuario.descripcion,
            "nombre_finca": usuario.nombre_finca,
            "cultivos_principales": usuario.cultivos_principales,
            "latitud": float(usuario.latitud) if usuario.latitud is not None else None,
            "longitud": float(usuario.longitud) if usuario.longitud is not None else None,
            "ciudad": usuario.ciudad,
            "miembro_desde": str(usuario.fecha_registro),
            "lotes_activos": lotes_activos,
            "promedio_calificacion": resumen_calificacion["promedio"],
            "total_calificaciones": resumen_calificacion["total"],
            "tasa_cumplimiento": resumen_calificacion["tasa_cumplimiento"],
            "puntaje": resumen_calificacion["puntaje"],
        },
    )