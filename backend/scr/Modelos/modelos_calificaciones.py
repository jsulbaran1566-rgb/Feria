from datetime import date
from sqlalchemy import Column, Integer, Text, Date, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= CALIFICACIONES =================
# Una reserva tiene como máximo una calificación (0..1, reserva_id UNIQUE).

class Calificacion(Base):
    __tablename__ = "calificaciones"
    __table_args__ = (
        CheckConstraint("estrellas BETWEEN 1 AND 5", name="chk_calificaciones_estrellas"),
    )

    id           = Column(Integer, primary_key=True, index=True)
    reserva_id   = Column(Integer, ForeignKey("reservas.id",  ondelete="RESTRICT"), nullable=False, unique=True)
    comprador_id = Column(Integer, ForeignKey("usuarios.id",  ondelete="RESTRICT"), nullable=False)
    productor_id = Column(Integer, ForeignKey("usuarios.id",  ondelete="RESTRICT"), nullable=False)
    estrellas    = Column(Integer, nullable=False)
    comentario   = Column(Text, nullable=True)
    fecha        = Column(Date, nullable=False, default=date.today)

    reserva   = relationship("Reserva", backref="calificacion", uselist=False)
    comprador = relationship("Usuario", foreign_keys=[comprador_id])
    productor = relationship("Usuario", foreign_keys=[productor_id])
