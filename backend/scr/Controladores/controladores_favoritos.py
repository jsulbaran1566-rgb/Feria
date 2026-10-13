from fastapi import Query, Depends
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_favoritos import (
    ErrorFavoritoYaExiste,
    ErrorFavoritoNoEncontrado,
)
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Esquemas.Esquemas import FavoritoCrear
from Dependencias.dependencias import requiere_rol


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serializar_favorito(f: models.Favorito, productor: models.Usuario) -> dict:
    return {
        "comprador_id":   f.comprador_id,
        "productor_id":   f.productor_id,
        "productor":      productor.nombre,
        "ciudad":         productor.ciudad,
        "fecha_agregado": str(f.fecha_agregado),
    }


# ── GET /favoritos ────────────────────────────────────────────────────────────
# Lista los productores favoritos de un comprador.

def obtener_favoritos(
    comprador_id: int = Query(..., description="Id del comprador"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Comprador")),
):
    if comprador_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])
    favoritos = (
        db.query(models.Favorito)
        .filter(models.Favorito.comprador_id == comprador_id)
        .all()
    )

    resultado = []
    for f in favoritos:
        productor = db.query(models.Usuario).filter(models.Usuario.id == f.productor_id).first()
        if productor:
            resultado.append(_serializar_favorito(f, productor))

    return respuesta_ok(message="Favoritos obtenidos", data=resultado)


# ── POST /favoritos ───────────────────────────────────────────────────────────
# Agrega un productor a la lista de favoritos de un comprador.

def agregar_favorito(
    datos: FavoritoCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Comprador")),
):
    datos.comprador_id = usuario_actual.id

    # Verificar que el comprador exista y tenga rol Comprador
    comprador = (
        db.query(models.Usuario)
        .join(models.Rol, models.Usuario.rol_id == models.Rol.id)
        .filter(
            models.Usuario.id == datos.comprador_id,
            models.Rol.nombre == "Comprador",
        )
        .first()
    )
    if not comprador:
        return respuesta_error(
            f"No se encontró un comprador con id {datos.comprador_id}",
            status_code=404,
        )

    # Verificar que el productor exista y tenga rol Productor
    productor = (
        db.query(models.Usuario)
        .join(models.Rol, models.Usuario.rol_id == models.Rol.id)
        .filter(
            models.Usuario.id == datos.productor_id,
            models.Rol.nombre == "Productor",
        )
        .first()
    )
    if not productor:
        return respuesta_error(
            f"No se encontró un productor con id {datos.productor_id}",
            status_code=404,
        )

    # Verificar que no exista ya el favorito
    existente = (
        db.query(models.Favorito)
        .filter(
            models.Favorito.comprador_id == datos.comprador_id,
            models.Favorito.productor_id == datos.productor_id,
        )
        .first()
    )
    if existente:
        raise ErrorFavoritoYaExiste(datos.comprador_id, datos.productor_id)

    nuevo = models.Favorito(
        comprador_id=datos.comprador_id,
        productor_id=datos.productor_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return respuesta_ok(
        message="Productor agregado a favoritos",
        data=_serializar_favorito(nuevo, productor),
        status_code=201,
    )


# ── DELETE /favoritos/{comprador_id}/{productor_id} ──────────────────────────
# Quita un productor de la lista de favoritos de un comprador.

def eliminar_favorito(
    comprador_id: int,
    productor_id: int,
    confirmar: bool = Query(default=False, description="Debe ser true para confirmar la eliminación"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Comprador")),
):
    if comprador_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    if not confirmar:
        return respuesta_error(
            "Debe confirmar la eliminación con ?confirmar=true",
            status_code=400,
        )

    favorito = (
        db.query(models.Favorito)
        .filter(
            models.Favorito.comprador_id == comprador_id,
            models.Favorito.productor_id == productor_id,
        )
        .first()
    )
    if not favorito:
        raise ErrorFavoritoNoEncontrado(comprador_id, productor_id)

    db.delete(favorito)
    db.commit()

    return respuesta_ok(
        message="Favorito eliminado correctamente",
        data={"comprador_id": comprador_id, "productor_id": productor_id},
    )