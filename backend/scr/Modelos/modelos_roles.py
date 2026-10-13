from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= ROLES =================

class Rol(Base):
    __tablename__ = "roles"
    id          = Column(Integer,    primary_key=True)
    nombre      = Column(String(50), unique=True, nullable=False)
    descripcion = Column(Text,       nullable=True)
    permisos    = Column(Text,       nullable=True)
    usuarios    = relationship("Usuario", back_populates="rol_rel")
