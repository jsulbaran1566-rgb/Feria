from fastapi import Query, Depends
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Esquemas.Esquemas import ProveedorCrear, ProveedorEditar
from Dependencias.dependencias import requiere_rol


# ── Helper ────────────────────────────────────────────────────────────────────

def _serializar_proveedor(p: models.Proveedor) -> dict:
    return {
        "id":       p.id,
        "nombre":   p.nombre,
        "tipo":     p.tipo,
        "ciudad":   p.ciudad,
        "telefono": p.telefono,
        "correo":   p.correo,
        "estado":   p.estado,
    }


# ── GET /proveedores ──────────────────────────────────────────────────────────
# Lista todos los proveedores registrados en el sistema.

def obtener_proveedores(
    db: Session = Depends(get_db),
):
    proveedores = db.query(models.Proveedor).all()
    return respuesta_ok(
        message="Proveedores obtenidos",
        data=[_serializar_proveedor(p) for p in proveedores],
    )


# ── GET /proveedores/{id} ─────────────────────────────────────────────────────
# Obtiene un proveedor por su id.

def obtener_proveedor_por_id(
    id: int,
    db: Session = Depends(get_db),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    proveedor = db.query(models.Proveedor).filter(models.Proveedor.id == id).first()
    if not proveedor:
        return respuesta_error(f"No existe un proveedor con id {id}", status_code=404)

    return respuesta_ok(
        message="Proveedor obtenido",
        data=_serializar_proveedor(proveedor),
    )


# ── POST /proveedores ─────────────────────────────────────────────────────────
# Registra un nuevo proveedor en el sistema.

def agregar_proveedor(
    datos: ProveedorCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if db.query(models.Proveedor).filter(models.Proveedor.id == datos.id).first():
        return respuesta_error(f"Ya existe un proveedor con id {datos.id}", status_code=400)

    if db.query(models.Proveedor).filter(models.Proveedor.nombre == datos.nombre).first():
        return respuesta_error(f"Ya existe un proveedor con el nombre '{datos.nombre}'", status_code=400)

    nuevo = models.Proveedor(
        id=datos.id,
        nombre=datos.nombre,
        tipo=datos.tipo,
        ciudad=datos.ciudad,
        telefono=datos.telefono,
        correo=datos.correo,
        estado=datos.estado,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return respuesta_ok(
        message="Proveedor registrado",
        data=_serializar_proveedor(nuevo),
        status_code=201,
    )


# ── PUT /proveedores/{id} ─────────────────────────────────────────────────────
# Actualiza los datos de un proveedor.

def editar_proveedor(
    id: int,
    datos: ProveedorEditar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    proveedor = db.query(models.Proveedor).filter(models.Proveedor.id == id).first()
    if not proveedor:
        return respuesta_error(f"No existe un proveedor con id {id}", status_code=404)

    if datos.nombre is not None:
        duplicado = db.query(models.Proveedor).filter(
            models.Proveedor.nombre == datos.nombre,
            models.Proveedor.id != id,
        ).first()
        if duplicado:
            return respuesta_error(f"Ya existe un proveedor con el nombre '{datos.nombre}'", status_code=400)
        proveedor.nombre = datos.nombre

    if datos.tipo is not None:
        proveedor.tipo = datos.tipo
    if datos.ciudad is not None:
        proveedor.ciudad = datos.ciudad
    if datos.telefono is not None:
        proveedor.telefono = datos.telefono
    if datos.correo is not None:
        proveedor.correo = datos.correo
    if datos.estado is not None:
        proveedor.estado = datos.estado

    db.commit()
    db.refresh(proveedor)

    return respuesta_ok(
        message="Proveedor actualizado",
        data=_serializar_proveedor(proveedor),
    )


# ── DELETE /proveedores/{id} ──────────────────────────────────────────────────
# Elimina un proveedor. Requiere ?confirmar=true.

def eliminar_proveedor(
    id: int,
    confirmar: bool = Query(default=False, description="Debe ser true para confirmar la eliminación"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    if not confirmar:
        return respuesta_error("Debe confirmar la eliminación con ?confirmar=true", status_code=400)

    proveedor = db.query(models.Proveedor).filter(models.Proveedor.id == id).first()
    if not proveedor:
        return respuesta_error(f"No existe un proveedor con id {id}", status_code=404)

    nombre = proveedor.nombre
    db.delete(proveedor)
    db.commit()

    return respuesta_ok(
        message="Proveedor eliminado",
        data={"id": id, "nombre": nombre},
    )
