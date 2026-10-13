from sqlalchemy import Column, Integer, String, Date, ForeignKey, CheckConstraint, Numeric
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= LOTES =================

class Lote(Base):
    __tablename__ = "lotes"
    __table_args__ = (
        CheckConstraint("cantidad > 0",             name="chk_lotes_cant"),
        CheckConstraint("kg_reservados >= 0",       name="chk_lote_reservados"),
        CheckConstraint("estado IN ('Activo','Inactivo')", name="chk_lote_estado"),
        CheckConstraint(
            "estado_cultivo IN ('Siembra','Crecimiento','Listo','Cosechado')",
            name="chk_lote_estado_cultivo",
        ),
        CheckConstraint(
            "anticipo_pct IS NULL OR anticipo_pct BETWEEN 1 AND 99",
            name="chk_lote_anticipo_pct",
        ),
        CheckConstraint(
            "horas_limite_pago IS NULL OR horas_limite_pago > 0",
            name="chk_lote_horas_limite",
        ),
        # El plazo de pago solo tiene sentido si hay algo que pagar dentro
        # de ese plazo — si el productor pone horas_limite_pago, tiene que
        # haber configurado también un anticipo.
        CheckConstraint(
            "horas_limite_pago IS NULL OR anticipo_pct IS NOT NULL",
            name="chk_lote_horas_requiere_anticipo",
        ),
    )

    id            = Column(Integer,       primary_key=True, index=True)
    producto      = Column(String(150),   nullable=False)
    cantidad      = Column(Integer,       nullable=False)
    categoria     = Column(String(100),   ForeignKey("categorias.nombre", onupdate="CASCADE", ondelete="RESTRICT"), nullable=False)
    productor_id  = Column(Integer,       ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    estado        = Column(String(20),    nullable=False, default="Activo")   # visibilidad en el marketplace
    fecha_siembra  = Column(Date,         nullable=True)
    fecha_cosecha = Column(Date,          nullable=True)
    kg_reservados = Column(Integer,       nullable=False, default=0)
    precio_kg     = Column(Numeric(10,2), nullable=True)
    imagen_url    = Column(String(300),   nullable=True)  # RF-07

    # RF-13 — Trazabilidad del cultivo (Siembra → Crecimiento → Listo → Cosechado).
    # Es independiente de `estado` (Activo/Inactivo): un lote puede estar
    # "Activo" (visible/reservable) sin importar en qué etapa de cultivo va.
    estado_cultivo = Column(String(20), nullable=False, default="Siembra")

    # RF-27 — Anticipo configurable por el productor (resuelve OBS-05: se
    # decidió que aplica por lote, no por cuenta del productor, para
    # permitir distintos % según el cultivo). NULL = no admite pagos
    # parciales, se paga el 100% de una vez. Si tiene valor, el comprador
    # puede pagar exactamente ese % como anticipo — la reserva se queda en
    # estado "Confirmada" hasta que el saldo restante también se pague; solo
    # entonces pasa a "Pagada" y el productor puede despachar (ver
    # Controladores/controladores_pagos.py).
    anticipo_pct = Column(Integer, nullable=True)

    # Plazo (en horas) que tiene el comprador para pagar el anticipo desde
    # que crea la reserva — si se pasa sin pago, se cancela sola (ver
    # Controladores/controladores_reservas.py::_vencer_reservas_por_plazo).
    # Requiere anticipo_pct configurado (constraint arriba).
    horas_limite_pago = Column(Integer, nullable=True)

    categoria_rel = relationship("Categoria",           back_populates="lotes")
    productor     = relationship("Usuario",             back_populates="lotes")
    reservas      = relationship("Reserva",             back_populates="lote")
    historial     = relationship("HistorialSeguimiento",back_populates="lote_rel")
    compras       = relationship("Compra",              back_populates="lote")
    ventas        = relationship("Venta",               back_populates="lote")
