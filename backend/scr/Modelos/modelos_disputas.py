from datetime import date
from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= DISPUTAS =================
# Una reserva puede tener como máximo una disputa (0..1, reserva_id UNIQUE).
# La resuelve exclusivamente un Administrador.

class Disputa(Base):
    __tablename__ = "disputas"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('Abierta','En revisión','Resuelta','Cerrada')",
            name="chk_disputas_estado",
        ),
    )

    id                 = Column(Integer, primary_key=True, index=True)
    reserva_id         = Column(Integer, ForeignKey("reservas.id", ondelete="RESTRICT"), nullable=False, unique=True)
    comprador_id       = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    estado             = Column(String(20), nullable=False, default="Abierta")
    descripcion        = Column(Text, nullable=False)
    resolucion         = Column(Text, nullable=True)
    fecha_apertura     = Column(Date, nullable=False, default=date.today)
    fecha_resolucion   = Column(Date, nullable=True)

    reserva   = relationship("Reserva", backref="disputa", uselist=False)
    comprador = relationship("Usuario")
