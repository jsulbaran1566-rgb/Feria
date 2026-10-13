from fastapi import Query, Depends
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Esquemas.Esquemas import RolCrear, RolEditar
from Dependencias.dependencias import requiere_rol


# ── Helper ────────────────────────────────────────────────────────────────────

def _serializar_rol(r: models.Rol) -> dict:
    return {
        "id":          r.id,
        "nombre":      r.nombre,
        "descripcion": r.descripcion,
        "permisos":    r.permisos,
    }


# ── GET /roles ────────────────────────────────────────────────────────────────
# Lista todos los roles registrados en el sistema.

def obtener_roles(
    db: Session = Depends(get_db),
):
    roles = db.query(models.Rol).all()
    return respuesta_ok(
        message="Roles obtenidos",
        data=[_serializar_rol(r) for r in roles],
    )


# ── GET /roles/{id} ───────────────────────────────────────────────────────────
# Obtiene un rol por su id.

def obtener_rol_por_id(
    id: int,
    db: Session = Depends(get_db),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    rol = db.query(models.Rol).filter(models.Rol.id == id).first()
    if not rol:
        return respuesta_error(f"No existe un rol con id {id}", status_code=404)

    return respuesta_ok(
        message="Rol obtenido",
        data=_serializar_rol(rol),
    )


# ── POST /roles ───────────────────────────────────────────────────────────────
# Registra un nuevo rol en el sistema.

def agregar_rol(
    datos: RolCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if db.query(models.Rol).filter(models.Rol.id == datos.id).first():
        return respuesta_error(f"Ya existe un rol con id {datos.id}", status_code=400)

    if db.query(models.Rol).filter(models.Rol.nombre == datos.nombre).first():
        return respuesta_error(f"Ya existe un rol con el nombre '{datos.nombre}'", status_code=400)

    nuevo = models.Rol(
        id=datos.id,
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        permisos=datos.permisos,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return respuesta_ok(
        message="Rol registrado",
        data=_serializar_rol(nuevo),
        status_code=201,
    )


# ── PUT /roles/{id} ───────────────────────────────────────────────────────────
# Actualiza nombre, descripción y/o permisos de un rol.

def editar_rol(
    id: int,
    datos: RolEditar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    rol = db.query(models.Rol).filter(models.Rol.id == id).first()
    if not rol:
        return respuesta_error(f"No existe un rol con id {id}", status_code=404)

    if datos.nombre is not None:
        duplicado = db.query(models.Rol).filter(
            models.Rol.nombre == datos.nombre,
            models.Rol.id != id,
        ).first()
        if duplicado:
            return respuesta_error(f"Ya existe un rol con el nombre '{datos.nombre}'", status_code=400)
        rol.nombre = datos.nombre

    if datos.descripcion is not None:
        rol.descripcion = datos.descripcion
    if datos.permisos is not None:
        rol.permisos = datos.permisos

    db.commit()
    db.refresh(rol)

    return respuesta_ok(
        message="Rol actualizado",
        data=_serializar_rol(rol),
    )


# ── DELETE /roles/{id} ────────────────────────────────────────────────────────
# Elimina un rol. Falla si hay usuarios asignados a él.

def eliminar_rol(
    id: int,
    confirmar: bool = Query(default=False, description="Debe ser true para confirmar la eliminación"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    if not confirmar:
        return respuesta_error("Debe confirmar la eliminación con ?confirmar=true", status_code=400)

    rol = db.query(models.Rol).filter(models.Rol.id == id).first()
    if not rol:
        return respuesta_error(f"No existe un rol con id {id}", status_code=404)

    usuarios_con_rol = db.query(models.Usuario).filter(models.Usuario.rol_id == id).count()
    if usuarios_con_rol > 0:
        return respuesta_error(
            f"El rol '{rol.nombre}' tiene {usuarios_con_rol} usuario(s) asignado(s). Reasígnelos primero.",
            status_code=409,
        )

    nombre = rol.nombre
    db.delete(rol)
    db.commit()

    return respuesta_ok(
        message="Rol eliminado",
        data={"id": id, "nombre": nombre},
    )