from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= CATEGORIAS =================

class Categoria(Base):
    __tablename__ = "categorias"

    nombre = Column(String(100), primary_key=True, index=True)

    lotes = relationship("Lote", back_populates="categoria_rel")
