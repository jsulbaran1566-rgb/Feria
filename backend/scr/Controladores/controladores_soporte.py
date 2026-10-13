from fastapi import Depends, Query
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Esquemas.Esquemas import SoporteCrear, SoporteActualizar
from Excepciones.excepciones_soporte import ErrorSoporteNoEncontrado
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Dependencias.dependencias import requiere_rol


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serializar_soporte(s: models.Soporte) -> dict:
    return {
        "id":             s.id,
        "usuario_id":     s.usuario_id,
        "nombre":         s.nombre,
        "correo":         s.correo,
        "mensaje":        s.mensaje,
        "estado":         s.estado,
        "fecha_creacion": s.fecha_creacion.isoformat() if s.fecha_creacion else None,
    }


# ── POST /soporte ─────────────────────────────────────────────────────────────
# Guarda un mensaje de soporte enviado desde cualquier panel (admin, productor
# o comprador). Queda registrado con estado "Pendiente" para que el
# administrador lo revise.

def crear_soporte(
    datos: SoporteCrear,
    db: Session = Depends(get_db),
):
    nuevo = models.Soporte(
        usuario_id=datos.usuario_id,
        nombre=datos.nombre,
        correo=datos.correo,
        mensaje=datos.mensaje,
        estado="Pendiente",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return respuesta_ok(
        message="Mensaje de soporte enviado correctamente",
        data=_serializar_soporte(nuevo),
        status_code=201,
    )


# ── GET /soporte ──────────────────────────────────────────────────────────────
# Lista todos los mensajes de soporte. Uso administrativo: permite filtrar
# opcionalmente por estado.

def obtener_soporte(
    estado: str = Query(default=None, description="Filtrar por estado: Pendiente, En proceso o Resuelto"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    consulta = db.query(models.Soporte)
    if estado:
        consulta = consulta.filter(models.Soporte.estado == estado)

    tickets = consulta.order_by(models.Soporte.fecha_creacion.desc()).all()

    return respuesta_ok(
        message="Tickets de soporte obtenidos",
        data=[_serializar_soporte(t) for t in tickets],
    )


# ── PUT /soporte/{soporte_id}/estado ──────────────────────────────────────────
# Permite al administrador cambiar el estado de un ticket (por ejemplo, al
# marcarlo como resuelto).

def actualizar_estado_soporte(
    soporte_id: int,
    datos: SoporteActualizar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    ticket = db.query(models.Soporte).filter(models.Soporte.id == soporte_id).first()
    if not ticket:
        raise ErrorSoporteNoEncontrado(soporte_id)

    ticket.estado = datos.estado
    db.commit()
    db.refresh(ticket)

    return respuesta_ok(
        message="Estado del ticket actualizado correctamente",
        data=_serializar_soporte(ticket),
    )


# ── DELETE /soporte/{soporte_id} ──────────────────────────────────────────────
# Elimina un ticket de soporte. Requiere confirmación explícita.

def eliminar_soporte(
    soporte_id: int,
    confirmar: bool = Query(default=False, description="Debe ser true para confirmar la eliminación"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    if not confirmar:
        return respuesta_error(
            "Debe confirmar la eliminación con ?confirmar=true",
            status_code=400,
        )

    ticket = db.query(models.Soporte).filter(models.Soporte.id == soporte_id).first()
    if not ticket:
        raise ErrorSoporteNoEncontrado(soporte_id)

    db.delete(ticket)
    db.commit()

    return respuesta_ok(
        message="Ticket de soporte eliminado correctamente",
        data={"id": soporte_id},
    )
