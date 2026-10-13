from datetime import date
from fastapi import Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok
from Dependencias.dependencias import requiere_rol


# ── GET /reportes/productor ────────────────────────────────────────────────────
# RF-39: total de kg vendidos, ingresos, número de lotes activos y
# calificación, para el Productor autenticado (o cualquier productor_id si
# quien consulta es Administrador).

def reporte_productor(
    productor_id: int = Query(default=None, description="Solo Administrador puede consultar otro productor"),
    fecha_desde: date = Query(default=None, description="Filtrar transacciones desde esta fecha"),
    fecha_hasta: date = Query(default=None, description="Filtrar transacciones hasta esta fecha"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if productor_id is None or not es_admin:
        productor_id = usuario_actual.id
    if not es_admin and productor_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    reservas_vendidas = (
        db.query(models.Reserva)
        .join(models.Lote, models.Reserva.lote_id == models.Lote.id)
        .filter(
            models.Lote.productor_id == productor_id,
            models.Reserva.estado.in_(["Entregada", "Calificada"]),
        )
    )
    if fecha_desde:
        reservas_vendidas = reservas_vendidas.filter(models.Reserva.fecha >= fecha_desde)
    if fecha_hasta:
        reservas_vendidas = reservas_vendidas.filter(models.Reserva.fecha <= fecha_hasta)

    total_kg_vendidos = sum(r.cantidad for r in reservas_vendidas) or 0

    pagos_productor = (
        db.query(models.Pago)
        .join(models.Reserva, models.Pago.reserva_id == models.Reserva.id)
        .join(models.Lote, models.Reserva.lote_id == models.Lote.id)
        .filter(models.Lote.productor_id == productor_id)
    )
    if fecha_desde:
        pagos_productor = pagos_productor.filter(func.date(models.Pago.fecha) >= fecha_desde)
    if fecha_hasta:
        pagos_productor = pagos_productor.filter(func.date(models.Pago.fecha) <= fecha_hasta)

    ingresos_totales = pagos_productor.with_entities(func.coalesce(func.sum(models.Pago.monto), 0)).scalar()

    # RF-46: la plataforma se queda con una comisión de cada pago — el
    # productor debe ver claramente cuánto es bruto vs. lo que le queda neto.
    comision_total = pagos_productor.with_entities(func.coalesce(func.sum(models.Pago.comision_monto), 0)).scalar()
    ingresos_netos = float(ingresos_totales or 0) - float(comision_total or 0)

    lotes_activos = (
        db.query(models.Lote)
        .filter(models.Lote.productor_id == productor_id, models.Lote.estado == "Activo")
        .count()
    )

    from Controladores.controladores_calificaciones import _resumen_calificaciones
    resumen_calificacion = _resumen_calificaciones(db, productor_id)

    return respuesta_ok(
        message="Reporte de productor generado correctamente",
        data={
            "productor_id": productor_id,
            "rango": {"desde": str(fecha_desde) if fecha_desde else None, "hasta": str(fecha_hasta) if fecha_hasta else None},
            "total_kg_vendidos": total_kg_vendidos,
            "ingresos_totales": float(ingresos_totales) if ingresos_totales else 0,
            "comision_total": round(float(comision_total or 0), 2),
            "ingresos_netos": round(ingresos_netos, 2),
            "lotes_activos": lotes_activos,
            "reservas_entregadas": reservas_vendidas.count(),
            "calificacion": resumen_calificacion,
        },
    )


# ── GET /reportes/comprador ────────────────────────────────────────────────────
# RF-40: historial de compras con montos, para el Comprador autenticado (o
# cualquier comprador_id si quien consulta es Administrador).

def reporte_comprador(
    comprador_id: int = Query(default=None, description="Solo Administrador puede consultar otro comprador"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Comprador", "Administrador")),
):
    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if comprador_id is None or not es_admin:
        comprador_id = usuario_actual.id
    if not es_admin and comprador_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    reservas = (
        db.query(models.Reserva)
        .filter(models.Reserva.comprador_id == comprador_id)
        .order_by(models.Reserva.fecha.desc())
        .all()
    )

    total_gastado = (
        db.query(func.coalesce(func.sum(models.Pago.monto), 0))
        .join(models.Reserva, models.Pago.reserva_id == models.Reserva.id)
        .filter(models.Reserva.comprador_id == comprador_id)
        .scalar()
    )

    historial = []
    for r in reservas:
        pago = db.query(models.Pago).filter(models.Pago.reserva_id == r.id).first()
        historial.append({
            "reserva_id": r.id,
            "producto": r.lote.producto if r.lote else None,
            "productor": r.lote.productor.nombre if r.lote and r.lote.productor else None,
            "cantidad": r.cantidad,
            "estado": r.estado,
            "fecha": str(r.fecha),
            "monto_pagado": float(pago.monto) if pago else None,
        })

    return respuesta_ok(
        message="Reporte de comprador generado correctamente",
        data={
            "comprador_id": comprador_id,
            "total_reservas": len(reservas),
            "total_gastado": float(total_gastado) if total_gastado else 0,
            "historial": historial,
        },
    )


# ── GET /reportes/admin ────────────────────────────────────────────────────────
# RF-41: reporte financiero — volumen de transacciones, comisiones, disputas
# y usuarios activos. Solo Administrador.

def reporte_admin(
    fecha_desde: date = Query(default=None, description="Filtrar transacciones desde esta fecha"),
    fecha_hasta: date = Query(default=None, description="Filtrar transacciones hasta esta fecha"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    pagos_aprobados = db.query(models.Pago).filter(models.Pago.estado == "Aprobado")
    if fecha_desde:
        pagos_aprobados = pagos_aprobados.filter(func.date(models.Pago.fecha) >= fecha_desde)
    if fecha_hasta:
        pagos_aprobados = pagos_aprobados.filter(func.date(models.Pago.fecha) <= fecha_hasta)

    volumen_transacciones = pagos_aprobados.count()
    monto_total_transacciones = float(
        pagos_aprobados.with_entities(func.coalesce(func.sum(models.Pago.monto), 0)).scalar() or 0
    )
    comision_total_plataforma = float(
        pagos_aprobados.with_entities(func.coalesce(func.sum(models.Pago.comision_monto), 0)).scalar() or 0
    )

    # RF-41: disputas por estado, para que el Admin vea de un vistazo cuántas
    # tiene sin atender.
    disputas_por_estado = dict(
        db.query(models.Disputa.estado, func.count(models.Disputa.id))
        .group_by(models.Disputa.estado)
        .all()
    )

    # Usuarios activos por rol (Comprador/Productor/Administrador).
    usuarios_activos_por_rol = dict(
        db.query(models.Rol.nombre, func.count(models.Usuario.id))
        .join(models.Usuario, models.Usuario.rol_id == models.Rol.id)
        .filter(models.Usuario.estado == "Activo")
        .group_by(models.Rol.nombre)
        .all()
    )

    return respuesta_ok(
        message="Reporte financiero generado correctamente",
        data={
            "rango": {
                "desde": str(fecha_desde) if fecha_desde else None,
                "hasta": str(fecha_hasta) if fecha_hasta else None,
            },
            "volumen_transacciones": volumen_transacciones,
            "monto_total_transacciones": round(monto_total_transacciones, 2),
            "comision_total_plataforma": round(comision_total_plataforma, 2),
            "disputas_por_estado": disputas_por_estado,
            "total_disputas": sum(disputas_por_estado.values()),
            "usuarios_activos_por_rol": usuarios_activos_por_rol,
            "total_usuarios_activos": sum(usuarios_activos_por_rol.values()),
        },
    )
