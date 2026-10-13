from fastapi import Query, Depends
from datetime import date, datetime, timedelta
from Utilidades.ids import siguiente_id
from Controladores.controladores_notificaciones import crear_notificacion
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_reservas import (
    ErrorReservaNoEncontrada,
    ErrorReservaYaExiste,
    ErrorReservaNoEliminable,
    ErrorStockInsuficiente,
    ErrorEstadoInvalido,
)
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Esquemas.Esquemas import ReservaCrear, ReservaEditar
from Dependencias.dependencias import requiere_rol, obtener_usuario_actual

ESTADOS_VALIDOS = ["Pendiente", "Confirmada", "Pagada", "En tránsito", "Entregada", "Calificada", "Cancelada"]



# ── Helpers ──────────────────────────────────────────────────────────────────

def _serializar_reserva(r: models.Reserva) -> dict:
    return {
        "id":           r.id,
        "comprador_id": r.comprador_id,
        "comprador":    r.comprador.nombre,
        "lote_id":      r.lote_id,
        "producto":     r.lote.producto,
        "productor_id": r.lote.productor_id,
        "productor":    r.lote.productor.nombre if r.lote.productor else None,
        "precio_kg":    float(r.lote.precio_kg) if r.lote.precio_kg else None,
        "cantidad":     r.cantidad,
        "fecha":        str(r.fecha),
        "estado":       r.estado,
        "motivo_cancelacion": r.motivo_cancelacion,
        "fecha_limite_pago":  r.fecha_limite_pago.isoformat() if r.fecha_limite_pago else None,
        # RF-16: para pintar la línea de tiempo visual del cultivo del lado
        # del comprador, sin que tenga que pedir /lotes aparte.
        "estado_cultivo": r.lote.estado_cultivo,
        "fecha_cosecha":  str(r.lote.fecha_cosecha) if r.lote.fecha_cosecha else None,
        "anticipo_pct":   r.lote.anticipo_pct,
    }


# RF: vencimiento automático del plazo de pago. No hay un scheduler/cron en
# este proyecto (mismo caso que el recordatorio de entrega, RF-36), así que
# esto se revisa "perezosamente" cada vez que alguien consulta sus reservas
# — no es en tiempo real al segundo exacto, pero en la práctica alcanza:
# el comprador o el productor ven la cancelación la próxima vez que entran.
def _vencer_reservas_por_plazo(db: Session) -> None:
    ahora = datetime.now()
    vencidas = (
        db.query(models.Reserva)
        .filter(
            models.Reserva.estado.in_(["Pendiente", "Confirmada"]),
            models.Reserva.fecha_limite_pago.isnot(None),
            models.Reserva.fecha_limite_pago < ahora,
        )
        .all()
    )
    for reserva in vencidas:
        # Si ya pagó algo (aunque sea solo el anticipo), ya demostró interés
        # real — el plazo cumplió su propósito, no se cancela.
        ya_pago = (
            db.query(models.Pago)
            .filter(models.Pago.reserva_id == reserva.id, models.Pago.estado == "Aprobado")
            .first()
        )
        if ya_pago:
            continue

        estado_anterior = reserva.estado
        motivo = "Venció el plazo para pagar el anticipo sin que se registrara el pago."
        _procesar_cambio_estado_reserva(db, reserva, "Cancelada", estado_anterior, motivo)
        reserva.estado = "Cancelada"
        db.add(models.HistorialReserva(reserva_id=reserva.id, estado="Cancelada"))

        crear_notificacion(
            db, reserva.comprador_id, "ReservaVencida",
            f"Tu reserva de '{reserva.lote.producto}' se canceló automáticamente: {motivo}",
            entidad_tipo="reserva", entidad_id=reserva.id,
        )
        crear_notificacion(
            db, reserva.lote.productor_id, "ReservaVencida",
            f"La reserva de {reserva.comprador.nombre} sobre '{reserva.lote.producto}' se canceló "
            f"automáticamente: el comprador no pagó el anticipo a tiempo.",
            entidad_tipo="reserva", entidad_id=reserva.id,
        )
    if vencidas:
        db.commit()


# ── GET /reservas ─────────────────────────────────────────────────────────────
# Lista todas las reservas con filtros opcionales por estado, comprador, lote y fechas.

def obtener_reservas(
    estado:       str  = Query(default=None, description=f"Filtrar por estado: {ESTADOS_VALIDOS}"),
    comprador_id: int  = Query(default=None, description="Filtrar por id de comprador"),
    lote_id:      int  = Query(default=None, description="Filtrar por id de lote"),
    fecha_desde:  date = Query(default=None, description="Fecha inicio del rango (YYYY-MM-DD)"),
    fecha_hasta:  date = Query(default=None, description="Fecha fin del rango (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    _vencer_reservas_por_plazo(db)

    if estado and estado not in ESTADOS_VALIDOS:
        raise ErrorEstadoInvalido(estado, ESTADOS_VALIDOS)

    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        return respuesta_error("fecha_desde no puede ser posterior a fecha_hasta", status_code=400)

    query = db.query(models.Reserva)

    if estado:
        query = query.filter(models.Reserva.estado == estado)
    if comprador_id:
        query = query.filter(models.Reserva.comprador_id == comprador_id)
    if lote_id:
        query = query.filter(models.Reserva.lote_id == lote_id)
    if fecha_desde:
        query = query.filter(models.Reserva.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.filter(models.Reserva.fecha <= fecha_hasta)

    reservas = query.all()
    return respuesta_ok(
        message="Reservas obtenidas",
        data=[_serializar_reserva(r) for r in reservas],
    )


# ── GET /reservas/fechas ──────────────────────────────────────────────────────
# Obtiene reservas dentro de un rango de fechas. Ambos parámetros son obligatorios.

def obtener_reservas_por_fecha(
    fecha_desde: date = Query(..., description="Fecha inicio del rango (YYYY-MM-DD)"),
    fecha_hasta: date = Query(..., description="Fecha fin del rango (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    if fecha_desde > fecha_hasta:
        return respuesta_error("fecha_desde no puede ser posterior a fecha_hasta", status_code=400)

    reservas = (
        db.query(models.Reserva)
        .filter(
            models.Reserva.fecha >= fecha_desde,
            models.Reserva.fecha <= fecha_hasta,
        )
        .all()
    )

    return respuesta_ok(
        message=f"Reservas entre {fecha_desde} y {fecha_hasta}",
        data=[_serializar_reserva(r) for r in reservas],
    )


# ── POST /reservas ────────────────────────────────────────────────────────────
# Crea una nueva reserva. Descuenta cantidad del lote y registra en historial.
# El id lo calcula el backend (no se recibe del frontend): así se evita que
# un valor tipo Date.now() (timestamp en ms) desborde la columna INTEGER.

def crear_reserva(
    datos: ReservaCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Comprador")),
):
    nuevo_id = siguiente_id(db, models.Reserva)

    # El comprador_id SIEMPRE es el usuario autenticado, sin importar lo que
    # venga en el body — evita que un comprador reserve a nombre de otro.
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

    # Verificar que el lote exista y esté activo.
    # RF-17: bloqueamos la fila con SELECT FOR UPDATE — si dos compradores
    # reservan el mismo lote casi al mismo tiempo, la segunda transacción
    # espera a que la primera termine (y su commit) antes de leer
    # kg_reservados, así que ambas ven el número correcto y no se puede
    # vender más de lo que hay.
    lote = (
        db.query(models.Lote)
        .filter(models.Lote.id == datos.lote_id)
        .with_for_update()
        .first()
    )
    if not lote:
        return respuesta_error(
            f"No se encontró un lote con id {datos.lote_id}",
            status_code=404,
        )
    if lote.estado != "Activo":
        return respuesta_error(
            f"El lote {datos.lote_id} está inactivo y no acepta reservas",
            status_code=400,
        )

    # Verificar stock disponible (cantidad - kg_reservados)
    disponible = lote.cantidad - lote.kg_reservados
    if disponible < datos.cantidad:
        raise ErrorStockInsuficiente(lote.producto, datos.cantidad, disponible)

    # Descontar del lote y aumentar kg_reservados
    lote.kg_reservados += datos.cantidad

    # Crear la reserva con estado inicial Pendiente
    # Si el lote tiene plazo de pago configurado, el reloj arranca AHORA
    # (cuando el comprador reserva), no cuando el productor confirma —
    # así el comprador sabe desde el primer momento cuánto tiempo tiene.
    fecha_limite_pago = (
        datetime.now() + timedelta(hours=lote.horas_limite_pago)
        if lote.horas_limite_pago else None
    )
    nueva_reserva = models.Reserva(
        id=nuevo_id,
        comprador_id=datos.comprador_id,
        lote_id=datos.lote_id,
        cantidad=datos.cantidad,
        estado="Pendiente",
        fecha_limite_pago=fecha_limite_pago,
    )
    db.add(nueva_reserva)

    # Registrar en historial de reservas (bitácora)
    db.add(models.HistorialReserva(reserva_id=nuevo_id, estado="Pendiente"))

    # Registrar en historial de seguimiento del lote
    db.add(models.HistorialSeguimiento(
        accion="Reserva creada",
        lote=lote.id,
        producto=lote.producto,
    ))

    # RF-33: notificar al productor — nombre del comprador y cantidad.
    crear_notificacion(
        db, lote.productor_id, "NuevaReserva",
        f"{comprador.nombre} reservó {datos.cantidad} kg de '{lote.producto}'.",
        entidad_tipo="reserva", entidad_id=nuevo_id,
    )

    # Si hay plazo de pago, el comprador necesita saberlo de inmediato —
    # no tendría cómo enterarse si no se lo avisamos aquí mismo.
    if fecha_limite_pago:
        crear_notificacion(
            db, comprador.id, "PlazoDePago",
            f"Tienes hasta {fecha_limite_pago.strftime('%d/%m/%Y %H:%M')} para pagar el anticipo de "
            f"tu reserva de '{lote.producto}', o se cancelará automáticamente.",
            entidad_tipo="reserva", entidad_id=nuevo_id,
        )

    db.commit()
    db.refresh(nueva_reserva)

    return respuesta_ok(
        message="Reserva creada correctamente",
        data=_serializar_reserva(nueva_reserva),
        status_code=201,
    )


# ── PUT /reservas/{id}/estado ─────────────────────────────────────────────────
# Actualiza comprador_id, fecha y/o estado de una reserva. Registra en historial si cambia estado.
# Comprador: solo puede cancelar SU PROPIA reserva (RF-18).
# Productor: solo puede confirmar/rechazar/entregar reservas de SUS PROPIOS lotes (RF-19).
# Administrador: sin restricción.

# Valida que el usuario autenticado pueda modificar esta reserva según su
# rol, y qué le está permitido tocar. Separado de actualizar_estado_reserva
# para que esta última se lea como una secuencia de pasos, no como un único
# bloque de reglas + efectos mezclados.
def _verificar_permiso_actualizar_reserva(usuario_actual: models.Usuario, reserva: models.Reserva, datos: ReservaEditar) -> None:
    rol = usuario_actual.rol_rel.nombre if usuario_actual.rol_rel else None

    if rol == "Comprador":
        if reserva.comprador_id != usuario_actual.id:
            raise ErrorNoAutorizado(["Administrador"])
        if datos.comprador_id is not None:
            raise ErrorNoAutorizado(["Administrador"])
        if datos.estado is not None and datos.estado != "Cancelada":
            raise ErrorNoAutorizado(["Productor", "Administrador"])
    elif rol == "Productor":
        if reserva.lote.productor_id != usuario_actual.id:
            raise ErrorNoAutorizado(["Administrador"])
        if datos.comprador_id is not None:
            raise ErrorNoAutorizado(["Administrador"])
    elif rol != "Administrador":
        raise ErrorNoAutorizado(["Productor", "Comprador", "Administrador"])


# Aplica los efectos secundarios de cada transición de estado posible.
# Cada rama es independiente y se puede leer (y probar) por separado.
def _procesar_cambio_estado_reserva(db: Session, reserva: models.Reserva, estado_nuevo: str, estado_anterior: str, motivo_cancelacion: str = None) -> None:
    if estado_nuevo == "Cancelada" and estado_anterior != "Cancelada":
        reserva.lote.kg_reservados = max(0, reserva.lote.kg_reservados - reserva.cantidad)
        reserva.motivo_cancelacion = motivo_cancelacion

        # RF-25: si la reserva ya estaba pagada (total o parcialmente) al
        # momento de cancelarse, el reembolso se procesa automáticamente
        # — el comprador no debería tener que abrir una disputa para
        # recuperar un pago de una reserva que el propio sistema canceló.
        pagos_a_reembolsar = (
            db.query(models.Pago)
            .filter(models.Pago.reserva_id == reserva.id, models.Pago.estado == "Aprobado")
            .all()
        )
        if pagos_a_reembolsar and estado_anterior in ("Pagada", "En tránsito"):
            total_reembolsado = 0.0
            for pago in pagos_a_reembolsar:
                pago.estado = "Reembolsado"
                total_reembolsado += float(pago.monto)
            crear_notificacion(
                db, reserva.comprador_id, "ReembolsoProcesado",
                f"Se procesó un reembolso automático de ${total_reembolsado:,.2f} por la cancelación "
                f"de tu reserva #{reserva.id} ({reserva.lote.producto}).",
                entidad_tipo="reserva", entidad_id=reserva.id,
            )

    if estado_anterior == "Cancelada" and estado_nuevo != "Cancelada":
        disponible = reserva.lote.cantidad - reserva.lote.kg_reservados
        if disponible < reserva.cantidad:
            raise ErrorStockInsuficiente(reserva.lote.producto, reserva.cantidad, disponible)
        reserva.lote.kg_reservados += reserva.cantidad

    # Al pasar a "Entregada" se generan automáticamente la compra y la venta
    if estado_nuevo == "Entregada" and estado_anterior != "Entregada":
        lote = reserva.lote
        total = (lote.precio_kg * reserva.cantidad) if lote.precio_kg else None

        db.add(models.Compra(
            id=siguiente_id(db, models.Compra),
            comprador_id=reserva.comprador_id,
            lote_id=lote.id,
            cantidad=reserva.cantidad,
            total=total,
        ))
        db.add(models.Venta(
            id=siguiente_id(db, models.Venta),
            vendedor_id=lote.productor_id,
            lote_id=lote.id,
            cantidad=reserva.cantidad,
            total=total,
        ))


def actualizar_estado_reserva(
    id: int,
    datos: ReservaEditar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    reserva = db.query(models.Reserva).filter(models.Reserva.id == id).first()
    if not reserva:
        raise ErrorReservaNoEncontrada(id)

    _verificar_permiso_actualizar_reserva(usuario_actual, reserva, datos)

    # Cambio de comprador
    if datos.comprador_id is not None:
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
                f"No se encontró un comprador activo con id {datos.comprador_id}",
                status_code=404,
            )
        reserva.comprador_id = datos.comprador_id

    # Cambio de fecha
    if datos.fecha is not None:
        reserva.fecha = datos.fecha

    # Cambio de estado con lógica de stock
    if datos.estado is not None:
        estado_anterior = reserva.estado

        # El motivo es obligatorio al cancelar — tanto si cancela el
        # Comprador como el Productor. Para cancelaciones automáticas por
        # vencimiento del plazo, el motivo lo pone el sistema (ver
        # _vencer_reservas_por_plazo), no pasa por acá.
        if datos.estado == "Cancelada" and estado_anterior != "Cancelada":
            if not datos.motivo_cancelacion or not datos.motivo_cancelacion.strip():
                return respuesta_error(
                    "Para cancelar una reserva hay que indicar el motivo.",
                    status_code=400,
                )

        _procesar_cambio_estado_reserva(db, reserva, datos.estado, estado_anterior, datos.motivo_cancelacion)
        reserva.estado = datos.estado
        db.add(models.HistorialReserva(reserva_id=id, estado=datos.estado))

    db.commit()
    db.refresh(reserva)

    return respuesta_ok(
        message="Reserva actualizada",
        data=_serializar_reserva(reserva),
    )


# ── DELETE /reservas/{id} ─────────────────────────────────────────────────────
# Elimina una reserva. Solo se permite si el estado es 'Cancelada'.

def eliminar_reserva(
    id: int,
    confirmar: bool = Query(default=False, description="Debe ser true para confirmar la eliminación"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Comprador", "Administrador")),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    if not confirmar:
        return respuesta_error(
            "Debe confirmar la eliminación con ?confirmar=true",
            status_code=400,
        )

    reserva = db.query(models.Reserva).filter(models.Reserva.id == id).first()
    if not reserva:
        raise ErrorReservaNoEncontrada(id)

    if reserva.estado != "Cancelada":
        raise ErrorReservaNoEliminable(id, reserva.estado)

    producto  = reserva.lote.producto
    comprador = reserva.comprador.nombre

    db.delete(reserva)
    db.commit()

    return respuesta_ok(
        message="Reserva eliminada correctamente",
        data={"id": id, "producto": producto, "comprador": comprador},
    )