from fastapi import Query, Depends
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Esquemas.Esquemas import TipoDocumentoCrear, TipoDocumentoEditar
from Dependencias.dependencias import requiere_rol


# ── Helper ────────────────────────────────────────────────────────────────────

def _serializar_tipo(t: models.TipoDocumento) -> dict:
    return {
        "codigo": t.codigo,
        "nombre": t.nombre,
    }


# ── GET /tipos_documento ──────────────────────────────────────────────────────
# Lista todos los tipos de documento registrados.

def obtener_tipos_documento(
    db: Session = Depends(get_db),
):
    tipos = db.query(models.TipoDocumento).all()
    return respuesta_ok(
        message="Tipos de documento obtenidos",
        data=[_serializar_tipo(t) for t in tipos],
    )


# ── GET /tipos_documento/{codigo} ─────────────────────────────────────────────
# Obtiene un tipo de documento por su código.

def obtener_tipo_documento_por_codigo(
    codigo: str,
    db: Session = Depends(get_db),
):
    if not codigo.strip():
        return respuesta_error("El código no puede estar vacío", status_code=400)

    tipo = db.query(models.TipoDocumento).filter(
        models.TipoDocumento.codigo == codigo.upper().strip()
    ).first()

    if not tipo:
        return respuesta_error(f"No existe un tipo de documento con código '{codigo}'", status_code=404)

    return respuesta_ok(
        message="Tipo de documento obtenido",
        data=_serializar_tipo(tipo),
    )


# ── POST /tipos_documento ─────────────────────────────────────────────────────
# Registra un nuevo tipo de documento.

def agregar_tipo_documento(
    datos: TipoDocumentoCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    codigo = datos.codigo.upper().strip()

    if db.query(models.TipoDocumento).filter(models.TipoDocumento.codigo == codigo).first():
        return respuesta_error(f"Ya existe un tipo de documento con código '{codigo}'", status_code=400)

    if db.query(models.TipoDocumento).filter(models.TipoDocumento.nombre == datos.nombre).first():
        return respuesta_error(f"Ya existe un tipo de documento con el nombre '{datos.nombre}'", status_code=400)

    nuevo = models.TipoDocumento(codigo=codigo, nombre=datos.nombre)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return respuesta_ok(
        message="Tipo de documento registrado",
        data=_serializar_tipo(nuevo),
        status_code=201,
    )


# ── PUT /tipos_documento/{codigo} ─────────────────────────────────────────────
# Actualiza el nombre de un tipo de documento.

def editar_tipo_documento(
    codigo: str,
    datos: TipoDocumentoEditar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    codigo = codigo.upper().strip()

    tipo = db.query(models.TipoDocumento).filter(models.TipoDocumento.codigo == codigo).first()
    if not tipo:
        return respuesta_error(f"No existe un tipo de documento con código '{codigo}'", status_code=404)

    if datos.nombre is not None:
        duplicado = db.query(models.TipoDocumento).filter(
            models.TipoDocumento.nombre == datos.nombre,
            models.TipoDocumento.codigo != codigo,
        ).first()
        if duplicado:
            return respuesta_error(f"Ya existe un tipo de documento con el nombre '{datos.nombre}'", status_code=400)
        tipo.nombre = datos.nombre

    db.commit()
    db.refresh(tipo)

    return respuesta_ok(
        message="Tipo de documento actualizado",
        data=_serializar_tipo(tipo),
    )


# ── DELETE /tipos_documento/{codigo} ──────────────────────────────────────────
# Elimina un tipo de documento. Falla si hay usuarios que lo usan.

def eliminar_tipo_documento(
    codigo: str,
    confirmar: bool = Query(default=False, description="Debe ser true para confirmar la eliminación"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    codigo = codigo.upper().strip()

    if not confirmar:
        return respuesta_error("Debe confirmar la eliminación con ?confirmar=true", status_code=400)

    tipo = db.query(models.TipoDocumento).filter(models.TipoDocumento.codigo == codigo).first()
    if not tipo:
        return respuesta_error(f"No existe un tipo de documento con código '{codigo}'", status_code=404)

    usuarios_con_tipo = db.query(models.Usuario).filter(models.Usuario.tipo_documento == codigo).count()
    if usuarios_con_tipo > 0:
        return respuesta_error(
            f"El tipo de documento '{codigo}' está en uso por {usuarios_con_tipo} usuario(s). Reasígnelos primero.",
            status_code=409,
        )

    nombre = tipo.nombre
    db.delete(tipo)
    db.commit()

    return respuesta_ok(
        message="Tipo de documento eliminado",
        data={"codigo": codigo, "nombre": nombre},
    )