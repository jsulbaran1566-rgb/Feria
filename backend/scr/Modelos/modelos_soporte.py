from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= SOPORTE =================

class Soporte(Base):
    __tablename__ = "soporte"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('Pendiente','En proceso','Resuelto')",
            name="chk_soporte_estado",
        ),
    )

    id             = Column(Integer, primary_key=True, index=True)
    usuario_id     = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    nombre         = Column(String(150), nullable=False)
    correo         = Column(String(150), nullable=False)
    mensaje        = Column(Text, nullable=False)
    estado         = Column(String(20), nullable=False, default="Pendiente")
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.now)

    usuario_rel = relationship("Usuario")
