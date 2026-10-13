from datetime import date
from fastapi import Depends, Query
from Utilidades.ids import siguiente_id
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_disputas import ErrorDisputaNoEncontrada, ErrorDisputaYaExiste
from Excepciones.excepciones_reservas import ErrorReservaNoEncontrada
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok
from Controladores.controladores_notificaciones import crear_notificacion
from Esquemas.Esquemas import DisputaCrear, DisputaActualizar
from Dependencias.dependencias import requiere_rol, obtener_usuario_actual



def _serializar_disputa(d: models.Disputa) -> dict:
    return {
        "id":               d.id,
        "reserva_id":       d.reserva_id,
        "comprador_id":     d.comprador_id,
        "estado":           d.estado,
        "descripcion":      d.descripcion,
        "resolucion":       d.resolucion,
        "fecha_apertura":   d.fecha_apertura.isoformat() if d.fecha_apertura else None,
        "fecha_resolucion": d.fecha_resolucion.isoformat() if d.fecha_resolucion else None,
    }


# ── POST /disputas ────────────────────────────────────────────────────────────
# El Comprador abre una disputa sobre su propia reserva. Máximo una por reserva.

def crear_disputa(
    datos: DisputaCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Comprador")),
):
    reserva = db.query(models.Reserva).filter(models.Reserva.id == datos.reserva_id).first()
    if not reserva:
        raise ErrorReservaNoEncontrada(datos.reserva_id)

    if reserva.comprador_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    if db.query(models.Disputa).filter(models.Disputa.reserva_id == datos.reserva_id).first():
        raise ErrorDisputaYaExiste(datos.reserva_id)

    nueva = models.Disputa(
        id=siguiente_id(db, models.Disputa),
        reserva_id=reserva.id,
        comprador_id=usuario_actual.id,
        estado="Abierta",
        descripcion=datos.descripcion,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return respuesta_ok(
        message="Disputa registrada. Un administrador la revisará.",
        data=_serializar_disputa(nueva),
        status_code=201,
    )


# ── GET /disputas ─────────────────────────────────────────────────────────────
# Administrador: ve todas. Comprador: solo las suyas (filtro forzado).

def obtener_disputas(
    estado: str = Query(default=None, description="Filtrar por estado"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    rol = usuario_actual.rol_rel.nombre if usuario_actual.rol_rel else None
    if rol not in ("Administrador", "Comprador"):
        raise ErrorNoAutorizado(["Administrador", "Comprador"])

    consulta = db.query(models.Disputa)
    if rol == "Comprador":
        consulta = consulta.filter(models.Disputa.comprador_id == usuario_actual.id)
    if estado:
        consulta = consulta.filter(models.Disputa.estado == estado)

    disputas = consulta.order_by(models.Disputa.fecha_apertura.desc()).all()

    return respuesta_ok(
        message="Disputas obtenidas correctamente",
        data=[_serializar_disputa(d) for d in disputas],
    )


# ── PUT /disputas/{id} ────────────────────────────────────────────────────────
# Solo el Administrador puede cambiar el estado o registrar una resolución.

def actualizar_disputa(
    id: int,
    datos: DisputaActualizar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    disputa = db.query(models.Disputa).filter(models.Disputa.id == id).first()
    if not disputa:
        raise ErrorDisputaNoEncontrada(id)

    disputa.estado = datos.estado
    if datos.resolucion is not None:
        disputa.resolucion = datos.resolucion
    if datos.estado in ("Resuelta", "Cerrada"):
        disputa.fecha_resolucion = date.today()

    # RF-25/38: si el admin marca reembolsar=true, se marca el pago de la
    # reserva como "Reembolsado" (no hay pasarela real, así que no se
    # procesa un reembolso monetario de verdad — ver nota en Pagos) y se
    # notifica al comprador.
    if datos.reembolsar:
        pago = db.query(models.Pago).filter(models.Pago.reserva_id == disputa.reserva_id).first()
        if pago and pago.estado != "Reembolsado":
            pago.estado = "Reembolsado"

            # La venta quedó revertida — la reserva ya no debe contarse como
            # entregada/pagada/lo que sea que estuviera, para que reportes
            # (RF-39/40) y el historial no muestren un ingreso que en
            # realidad se devolvió.
            reserva = disputa.reserva
            if reserva.estado != "Cancelada":
                reserva.estado = "Cancelada"
                db.add(models.HistorialReserva(reserva_id=reserva.id, estado="Cancelada"))

            crear_notificacion(
                db, disputa.comprador_id, "ReembolsoProcesado",
                f"Se procesó el reembolso de ${float(pago.monto):,.2f} de tu reserva #{disputa.reserva_id}.",
                entidad_tipo="pago", entidad_id=pago.id,
            )

    db.commit()
    db.refresh(disputa)

    return respuesta_ok(
        message="Disputa actualizada correctamente",
        data=_serializar_disputa(disputa),
    )
