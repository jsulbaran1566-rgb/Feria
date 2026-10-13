from datetime import date
from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= INCIDENCIAS =================
# RF-14: eventos negativos sobre un cultivo (plaga, helada, etc.) que el
# Productor reporta y que disparan una notificación automática a los
# compradores con reserva activa sobre ese lote (RF-37).

class Incidencia(Base):
    __tablename__ = "incidencias"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('Plaga','Helada','Sequía','Inundación','Otro')",
            name="chk_incidencias_tipo",
        ),
    )

    id          = Column(Integer, primary_key=True, index=True)
    lote_id     = Column(Integer, ForeignKey("lotes.id", ondelete="RESTRICT"), nullable=False)
    tipo        = Column(String(20), nullable=False)
    descripcion = Column(Text, nullable=False)
    fecha       = Column(Date, nullable=False, default=date.today)

    lote = relationship("Lote", backref="incidencias")
