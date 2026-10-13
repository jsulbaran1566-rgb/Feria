from sqlalchemy import Column, Integer, Date, ForeignKey
from Conexion.database import Base


# ================= FAVORITOS =================

class Favorito(Base):
    __tablename__ = "favoritos"

    comprador_id   = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    productor_id   = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    fecha_agregado = Column(Date)
