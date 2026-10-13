from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= TIPOS DOCUMENTO =================

class TipoDocumento(Base):
    __tablename__ = "tipos_documento"
    codigo  = Column(String(4),   primary_key=True)
    nombre  = Column(String(100), nullable=False)
    usuarios = relationship("Usuario", back_populates="tipo_documento_rel")
