from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= RESERVAS =================
# El estado se guarda directamente en la tabla.
# historial_reservas actúa como bitácora de cada cambio de estado.

class Reserva(Base):
    __tablename__ = "reservas"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="chk_reservas_cant"),
        CheckConstraint(
            "estado IN ('Pendiente','Confirmada','Pagada','En tránsito','Entregada','Calificada','Cancelada')",
            name="chk_reserva_estado",
        ),
    )

    id           = Column(Integer, primary_key=True, index=True)
    comprador_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    lote_id      = Column(Integer, ForeignKey("lotes.id",    ondelete="RESTRICT"), nullable=False)
    cantidad     = Column(Integer, nullable=False)
    fecha        = Column(Date,    nullable=False, default=date.today)
    estado       = Column(String(20), nullable=False, default="Pendiente")

    # Por qué se canceló — la escribe quien cancela (comprador o productor),
    # o el sistema mismo cuando la cancelación es automática por vencimiento
    # del plazo de pago.
    motivo_cancelacion = Column(Text, nullable=True)

    # Si el lote tiene horas_limite_pago configurado, se calcula al crear la
    # reserva (fecha_creación + esas horas). Si se pasa sin que haya un pago
    # aprobado, la reserva se cancela sola (ver
    # Controladores/controladores_reservas.py::_vencer_reservas_por_plazo).
    fecha_limite_pago = Column(DateTime, nullable=True)

    comprador         = relationship("Usuario", back_populates="reservas")
    lote              = relationship("Lote",      back_populates="reservas")
    historial_estados = relationship(
        "HistorialReserva",
        back_populates="reserva_rel",
        order_by="HistorialReserva.id",
    )
