from fastapi import Depends
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Utilidades.respuesta import respuesta_ok
from Dependencias.dependencias import requiere_rol


def _es_admin(usuario: models.Usuario) -> bool:
    return bool(usuario.rol_rel and usuario.rol_rel.nombre == "Administrador")


# Administrador ve todo; el Productor solo lo de sus propios lotes.

def ver_historial_seguimiento(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    query = db.query(models.HistorialSeguimiento)
    if not _es_admin(usuario_actual):
        query = (
            query.join(models.Lote, models.HistorialSeguimiento.lote == models.Lote.id)
            .filter(models.Lote.productor_id == usuario_actual.id)
        )
    registros = query.all()
    return respuesta_ok(
        message="Historial de seguimiento obtenido",
        data=[
            {
                "id": r.id,
                "accion": r.accion,
                "lote_id": r.lote,
                "producto": r.producto,
                "fecha": r.fecha.isoformat() if r.fecha else None,
            }
            for r in registros
        ],
    )


# Compras y ventas contienen datos de terceros: solo Administrador.

def ver_compras(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    compras = db.query(models.Compra).all()
    return respuesta_ok(
        message="Compras obtenidas",
        data=[
            {
                "id": c.id,
                "comprador_id": c.comprador_id,
                "comprador": c.comprador.nombre,
                "lote_id": c.lote_id,
                "producto": c.lote.producto,
                "cantidad": c.cantidad,
                "fecha": c.fecha.isoformat() if c.fecha else None,
            }
            for c in compras
        ],
    )


def ver_ventas(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    ventas = db.query(models.Venta).all()
    return respuesta_ok(
        message="Ventas obtenidas",
        data=[
            {
                "id": v.id,
                "vendedor_id": v.vendedor_id,
                "vendedor": v.vendedor.nombre,
                "lote_id": v.lote_id,
                "producto": v.lote.producto,
                "cantidad": v.cantidad,
                "fecha": v.fecha.isoformat() if v.fecha else None,
            }
            for v in ventas
        ],
    )


def ver_historial_reservas(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    registros = db.query(models.HistorialReserva).all()
    if not _es_admin(usuario_actual):
        registros = [
            r for r in registros
            if r.reserva_rel and r.reserva_rel.lote
            and r.reserva_rel.lote.productor_id == usuario_actual.id
        ]
    return respuesta_ok(
        message="Historial de reservas obtenido",
        data=[
            {
                "id": r.id,
                "reserva_id": r.reserva_id,
                "comprador": r.reserva_rel.comprador.nombre,
                "producto": r.reserva_rel.lote.producto,
                "estado": r.estado,
                "fecha": r.fecha.isoformat() if r.fecha else None,
            }
            for r in registros
        ],
    )