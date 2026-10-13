from datetime import date
from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= ENTREGAS =================
# Una reserva tiene como máximo una entrega (relación 0..1, reserva_id UNIQUE).

class Entrega(Base):
    __tablename__ = "entregas"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('Pendiente','En tránsito','Entregada')",
            name="chk_entregas_estado",
        ),
        CheckConstraint(
            "latitud_actual IS NULL OR latitud_actual BETWEEN -90 AND 90",
            name="chk_entregas_latitud",
        ),
        CheckConstraint(
            "longitud_actual IS NULL OR longitud_actual BETWEEN -180 AND 180",
            name="chk_entregas_longitud",
        ),
    )

    id                   = Column(Integer, primary_key=True, index=True)
    reserva_id           = Column(Integer, ForeignKey("reservas.id", ondelete="RESTRICT"), nullable=False, unique=True)
    medio                = Column(String(100), nullable=False)
    codigo_confirmacion  = Column(String(10), nullable=False)
    estado               = Column(String(20), nullable=False, default="Pendiente")
    fecha_estimada       = Column(Date, nullable=True)
    fecha_real           = Column(Date, nullable=True)

    # RF-32 — "Ubicación del envío en mapa si el transportista tiene API de
    # tracking" (texto del propio RF). No hay integración con ningún
    # transportista real, así que esto lo actualiza el Productor a mano
    # mientras el envío está "En tránsito" — es honesto sobre lo que es:
    # una ubicación reportada manualmente, no GPS en vivo de un camión.
    latitud_actual       = Column(Numeric(9, 6), nullable=True)
    longitud_actual      = Column(Numeric(9, 6), nullable=True)
    ubicacion_actualizada = Column(DateTime, nullable=True)

    reserva = relationship("Reserva", backref="entrega", uselist=False)
