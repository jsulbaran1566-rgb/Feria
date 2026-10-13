from fastapi import Query, Depends
from math import radians, sin, cos, sqrt, atan2
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Controladores.controladores_notificaciones import crear_notificacion
from Excepciones.excepciones_lotes import (
    ErrorLoteNoEncontrado,
    ErrorCantidadInvalida,
    ErrorCategoriaInvalidaEnLote,
)
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Esquemas.Esquemas import LoteCrear, LoteEditar, EstadoCultivoActualizar, ESTADOS_CULTIVO_VALIDOS
from Dependencias.dependencias import requiere_rol


# ── Helper ────────────────────────────────────────────────────────────────────

def _serializar_lote(l: models.Lote) -> dict:
    return {
        "id":             l.id,
        "producto":       l.producto,
        "cantidad":       l.cantidad,
        "kg_reservados":  l.kg_reservados,
        "precio_kg":      float(l.precio_kg) if l.precio_kg else None,
        "imagen_url":     l.imagen_url,
        "estado":         l.estado,
        "estado_cultivo": l.estado_cultivo,
        "anticipo_pct":   l.anticipo_pct,
        "horas_limite_pago": l.horas_limite_pago,
        "fecha_siembra":  str(l.fecha_siembra) if l.fecha_siembra else None,
        "fecha_cosecha":  str(l.fecha_cosecha) if l.fecha_cosecha else None,
        "categoria":      l.categoria,
        "productor_id":   l.productor_id,
        "productor":      l.productor.nombre,
        # RF-10: proyección de ingresos — cuánto vale el lote completo, y
        # cuánto de eso ya está comprometido en reservas.
        "ingreso_proyectado_total": round(float(l.precio_kg) * l.cantidad, 2) if l.precio_kg else None,
        "ingreso_proyectado_reservado": round(float(l.precio_kg) * l.kg_reservados, 2) if l.precio_kg else None,
        # RF-06 — perfil productor (finca/GPS), útil para que el comprador
        # ubique de dónde viene el producto.
        "productor_nombre_finca":         l.productor.nombre_finca,
        "productor_cultivos_principales": l.productor.cultivos_principales,
        "productor_latitud":  float(l.productor.latitud) if l.productor.latitud is not None else None,
        "productor_longitud": float(l.productor.longitud) if l.productor.longitud is not None else None,
    }


# ── GET /lotes ────────────────────────────────────────────────────────────────
# Lista todos los lotes. Filtros opcionales por categoría, estado, productor,
# precio, fecha de cosecha y radio geográfico (RF-11).

def obtener_lotes(
    categoria:    str = Query(default=None, description="Filtrar por categoría"),
    estado:       str = Query(default=None, description="Filtrar por estado: Activo | Inactivo"),
    productor_id: int = Query(default=None, description="Filtrar por id de productor"),
    precio_min:   float = Query(default=None, description="Precio por kg mínimo"),
    precio_max:   float = Query(default=None, description="Precio por kg máximo"),
    cosecha_desde: str = Query(default=None, description="Fecha de cosecha desde (YYYY-MM-DD)"),
    cosecha_hasta: str = Query(default=None, description="Fecha de cosecha hasta (YYYY-MM-DD)"),
    lat:          float = Query(default=None, description="Latitud del comprador, para filtrar por radio"),
    lon:          float = Query(default=None, description="Longitud del comprador, para filtrar por radio"),
    radio_km:     float = Query(default=None, description="Radio en km alrededor de lat/lon"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Lote)

    if categoria:
        query = query.filter(models.Lote.categoria.ilike(categoria))
    if estado:
        query = query.filter(models.Lote.estado == estado)
    if productor_id:
        query = query.filter(models.Lote.productor_id == productor_id)
    if precio_min is not None:
        query = query.filter(models.Lote.precio_kg >= precio_min)
    if precio_max is not None:
        query = query.filter(models.Lote.precio_kg <= precio_max)
    if cosecha_desde:
        query = query.filter(models.Lote.fecha_cosecha >= cosecha_desde)
    if cosecha_hasta:
        query = query.filter(models.Lote.fecha_cosecha <= cosecha_hasta)

    lotes = query.all()

    # RF-11: filtro por radio geográfico — se hace en Python (no en SQL) con
    # la fórmula de Haversine, porque son pocos lotes y no vale la pena una
    # extensión de PostGIS para este alcance. Requiere que el productor haya
    # configurado su GPS (RF-06); si no lo hizo, ese lote no entra en el filtro.
    if lat is not None and lon is not None and radio_km is not None:
        def distancia_km(lat1, lon1, lat2, lon2):
            R = 6371
            f1, f2 = radians(lat1), radians(lat2)
            df = radians(lat2 - lat1)
            dl = radians(lon2 - lon1)
            a = sin(df / 2) ** 2 + cos(f1) * cos(f2) * sin(dl / 2) ** 2
            return R * 2 * atan2(sqrt(a), sqrt(1 - a))

        lotes = [
            l for l in lotes
            if l.productor.latitud is not None and l.productor.longitud is not None
            and distancia_km(lat, lon, float(l.productor.latitud), float(l.productor.longitud)) <= radio_km
        ]

    return respuesta_ok(
        message="Lotes obtenidos",
        data=[_serializar_lote(l) for l in lotes],
    )


# ── GET /lotes/{producto} ────────────────────────────────────────────────────
# Busca lotes cuyo nombre de producto coincida (búsqueda parcial).

def obtener_lote_por_producto(
    producto: str,
    db: Session = Depends(get_db),
):
    if not producto.strip():
        return respuesta_error("El nombre del producto no puede estar vacío", status_code=400)

    lotes = (
        db.query(models.Lote)
        .filter(models.Lote.producto.ilike(f"%{producto.strip()}%"))
        .all()
    )
    if not lotes:
        return respuesta_error(f"No se encontraron lotes con producto '{producto}'", status_code=404)

    return respuesta_ok(
        message="Lote(s) obtenido(s)",
        data=[_serializar_lote(l) for l in lotes],
    )


# ── POST /lotes ───────────────────────────────────────────────────────────────
# Crea un nuevo lote. El productor_id debe ser un usuario con rol 'Productor'.

def agregar_lote(
    datos: LoteCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if not es_admin:
        # Un Productor solo puede publicar lotes a su propio nombre.
        datos.productor_id = usuario_actual.id

    if not db.query(models.Categoria).filter(models.Categoria.nombre == datos.categoria).first():
        raise ErrorCategoriaInvalidaEnLote(datos.categoria)

    if datos.cantidad <= 0:
        raise ErrorCantidadInvalida()

    productor = db.query(models.Usuario).filter(models.Usuario.id == datos.productor_id).first()
    if not productor:
        return respuesta_error(
            f"No existe un usuario con id {datos.productor_id}",
            status_code=404,
        )
    if productor.rol_rel.nombre != "Productor":
        return respuesta_error(
            f"El usuario {datos.productor_id} tiene rol '{productor.rol_rel.nombre}', no 'Productor'.",
            status_code=400,
        )

    nuevo = models.Lote(
        producto=datos.producto,
        cantidad=datos.cantidad,
        categoria=datos.categoria,
        productor_id=datos.productor_id,
        estado=datos.estado,
        fecha_siembra=datos.fecha_siembra,
        fecha_cosecha=datos.fecha_cosecha,
        precio_kg=datos.precio_kg,
        imagen_url=datos.imagen_url,
        anticipo_pct=datos.anticipo_pct,
        horas_limite_pago=datos.horas_limite_pago,
    )
    db.add(nuevo)
    db.flush()  # para tener nuevo.id disponible (Postgres ya lo asignó, pero aún no se hizo commit)
    db.add(models.HistorialSeguimiento(
        accion="Creación de lote",
        lote=nuevo.id,
        producto=datos.producto,
    ))
    db.commit()
    db.refresh(nuevo)

    return respuesta_ok(
        message="Lote creado",
        data=_serializar_lote(nuevo),
        status_code=201,
    )


# ── PUT /lotes/{id} ──────────────────────────────────────────────────────────
# Actualiza producto, cantidad, categoría, precio_kg, estado y fecha de cosecha.

def editar_lote(
    id: int,
    datos: LoteEditar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    lote = db.query(models.Lote).filter(models.Lote.id == id).first()
    if not lote:
        raise ErrorLoteNoEncontrado(id)

    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if not es_admin and lote.productor_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    # RF-08: una vez que un comprador confirmó una reserva sobre este lote,
    # ya no se pueden cambiar los términos comerciales (cantidad, precio,
    # categoría, anticipo) — cambiarían lo que el comprador ya aceptó.
    # Sí se puede seguir editando producto, imagen, fechas y estado.
    campos_comerciales_tocados = any([
        datos.cantidad is not None,
        datos.precio_kg is not None,
        datos.categoria is not None,
        datos.anticipo_pct is not None,
        datos.horas_limite_pago is not None,
    ])
    if campos_comerciales_tocados and not es_admin:
        tiene_reservas_confirmadas = db.query(models.Reserva).filter(
            models.Reserva.lote_id == id,
            models.Reserva.estado != "Cancelada",
            models.Reserva.estado != "Pendiente",
        ).first() is not None
        if tiene_reservas_confirmadas:
            return respuesta_error(
                "Este lote ya tiene reservas confirmadas — no se puede cambiar cantidad, precio, "
                "categoría, anticipo ni el plazo de pago (cambiaría lo que el comprador ya aceptó). "
                "Sí puedes editar producto, imagen, fechas y estado.",
                status_code=409,
            )

    # El plazo de pago requiere anticipo configurado — hay que validarlo
    # contra el estado FINAL del lote (lo que ya tenía + lo que se está
    # editando ahora), no solo los campos de esta petición en particular.
    anticipo_final = datos.anticipo_pct if datos.anticipo_pct is not None else lote.anticipo_pct
    horas_limite_final = datos.horas_limite_pago if datos.horas_limite_pago is not None else lote.horas_limite_pago
    if horas_limite_final is not None and anticipo_final is None:
        return respuesta_error(
            "Para tener un plazo límite de pago, primero hay que configurar el % de anticipo de este lote.",
            status_code=400,
        )

    if datos.producto is not None:
        if not datos.producto.strip():
            return respuesta_error("El nombre del producto no puede estar vacío", status_code=400)
        lote.producto = datos.producto.strip()
    if datos.cantidad is not None:
        if datos.cantidad <= 0:
            raise ErrorCantidadInvalida()
        lote.cantidad = datos.cantidad
    if datos.categoria is not None:
        if not db.query(models.Categoria).filter(models.Categoria.nombre == datos.categoria).first():
            raise ErrorCategoriaInvalidaEnLote(datos.categoria)
        lote.categoria = datos.categoria
    if datos.estado is not None:
        lote.estado = datos.estado
    if datos.precio_kg is not None:
        lote.precio_kg = datos.precio_kg
    if datos.imagen_url is not None:
        lote.imagen_url = datos.imagen_url
    if datos.fecha_cosecha is not None:
        lote.fecha_cosecha = datos.fecha_cosecha
    if datos.fecha_siembra is not None:
        lote.fecha_siembra = datos.fecha_siembra
    if datos.anticipo_pct is not None:
        lote.anticipo_pct = datos.anticipo_pct
    if datos.horas_limite_pago is not None:
        lote.horas_limite_pago = datos.horas_limite_pago

    db.commit()
    db.refresh(lote)

    return respuesta_ok(
        message="Lote actualizado",
        data=_serializar_lote(lote),
    )


# ── DELETE /lotes/{id} ────────────────────────────────────────────────────────
# Elimina un lote. No se permite si tiene reservas en estado Pendiente o Confirmada.

def eliminar_lote(
    id: int,
    confirmar: bool = Query(default=False, description="Debe ser true para confirmar la eliminación"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    if id <= 0:
        return respuesta_error("El id debe ser un número positivo", status_code=400)

    if not confirmar:
        return respuesta_error("Debe confirmar la eliminación con ?confirmar=true", status_code=400)

    lote = db.query(models.Lote).filter(models.Lote.id == id).first()
    if not lote:
        raise ErrorLoteNoEncontrado(id)

    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if not es_admin and lote.productor_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    reservas_activas = db.query(models.Reserva).filter(
        models.Reserva.lote_id == id,
        models.Reserva.estado.in_(["Pendiente", "Confirmada"]),
    ).count()

    if reservas_activas > 0:
        return respuesta_error(
            f"El lote {id} tiene {reservas_activas} reserva(s) activa(s). Cancélalas primero.",
            status_code=409,
        )

    producto = lote.producto

    # RF-09: si el lote alguna vez tuvo una reserva (aunque ya esté
    # Cancelada/Entregada/Calificada), NO se puede borrar de la base de
    # datos — `reservas.lote_id` tiene ON DELETE RESTRICT justamente para
    # no perder ese historial de ventas (lo necesitan los reportes,
    # RF-39/40). En ese caso se hace soft-delete: se oculta del
    # marketplace marcándolo Inactivo, sin borrar la fila.
    tiene_historial = db.query(models.Reserva).filter(models.Reserva.lote_id == id).first() is not None

    if tiene_historial:
        lote.estado = "Inactivo"
        db.commit()
        return respuesta_ok(
            message=(
                f"El lote {id} tiene historial de reservas, así que no se puede borrar sin perder "
                "esos datos. Se ocultó del marketplace (estado 'Inactivo') en su lugar."
            ),
            data={"id": id, "producto": producto, "estado": "Inactivo", "eliminado": False},
        )

    db.delete(lote)
    db.commit()

    return respuesta_ok(
        message="Lote eliminado",
        data={"id": id, "producto": producto, "eliminado": True},
    )


# ── PUT /lotes/{id}/estado-cultivo ────────────────────────────────────────────
# RF-13: el Productor dueño avanza el estado del cultivo. Solo hacia
# adelante en el ciclo Siembra → Crecimiento → Listo → Cosechado — no se
# puede retroceder ni saltar etapas. Queda auditado en HistorialSeguimiento
# con fecha/hora automática (RF-15).

def actualizar_estado_cultivo(
    id: int,
    datos: EstadoCultivoActualizar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    lote = db.query(models.Lote).filter(models.Lote.id == id).first()
    if not lote:
        raise ErrorLoteNoEncontrado(id)

    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if not es_admin and lote.productor_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    indice_actual = ESTADOS_CULTIVO_VALIDOS.index(lote.estado_cultivo)
    indice_nuevo = ESTADOS_CULTIVO_VALIDOS.index(datos.estado_cultivo)

    if not es_admin and indice_nuevo != indice_actual + 1:
        return respuesta_error(
            f"No se puede pasar de '{lote.estado_cultivo}' a '{datos.estado_cultivo}'. "
            f"El cultivo debe avanzar un paso a la vez: {' → '.join(ESTADOS_CULTIVO_VALIDOS)}.",
            status_code=409,
        )

    lote.estado_cultivo = datos.estado_cultivo
    db.add(models.HistorialSeguimiento(
        accion=f"Estado del cultivo actualizado a '{datos.estado_cultivo}'",
        lote=lote.id,
        producto=lote.producto,
    ))

    # RF-34: notificar a cada comprador con una reserva activa sobre este
    # lote (sin contar Cancelada/Entregada/Calificada, que ya no son "activas").
    compradores_activos = (
        db.query(models.Reserva.comprador_id)
        .filter(
            models.Reserva.lote_id == lote.id,
            models.Reserva.estado.in_(["Pendiente", "Confirmada", "Pagada", "En tránsito"]),
        )
        .distinct()
        .all()
    )
    for (comprador_id,) in compradores_activos:
        crear_notificacion(
            db, comprador_id, "CambioEstadoCultivo",
            f"El cultivo '{lote.producto}' que reservaste pasó a estado '{datos.estado_cultivo}'.",
            entidad_tipo="lote", entidad_id=lote.id,
        )

    db.commit()
    db.refresh(lote)

    return respuesta_ok(
        message="Estado del cultivo actualizado correctamente",
        data=_serializar_lote(lote),
    )


# ── GET /lotes/{id}/historial ─────────────────────────────────────────────────
# RF-15: vista cronológica del ciclo completo del cultivo. Público, igual que
# el resto de /lotes — el comprador también debe poder verlo (RF-12).

def obtener_historial_lote(
    id: int,
    db: Session = Depends(get_db),
):
    if not db.query(models.Lote).filter(models.Lote.id == id).first():
        raise ErrorLoteNoEncontrado(id)

    eventos = (
        db.query(models.HistorialSeguimiento)
        .filter(models.HistorialSeguimiento.lote == id)
        .order_by(models.HistorialSeguimiento.fecha.asc())
        .all()
    )

    return respuesta_ok(
        message="Historial obtenido correctamente",
        data=[
            {"id": e.id, "accion": e.accion, "fecha": e.fecha.isoformat()}
            for e in eventos
        ],
    )